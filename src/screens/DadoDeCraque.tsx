import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Alert, Modal, Pressable, ScrollView, Share, StyleSheet, Text, View } from 'react-native';

import { FORMATIONS, TACTICS, dataCounts, getSquads, rollSquad, slotsFor, squadKey } from '../data/draft/data';
import { calcForces, simulateCampaign } from '../data/draft/engine';
import type { CampaignResult, FormationKey, Goal, Mode, Player, Slot, Squad, Tactic } from '../data/draft/types';
import { rewardedAvailable, showRewarded } from '../lib/ads';
import { fonts, radius, spacing } from '../lib/theme';
import { useThemedStyles, type ThemeTokens } from '../lib/theme-context';
import { DOWNLOAD_LINKS } from '../lib/share';

// Links de download centralizados em DOWNLOAD_LINKS (../lib/share) — Android + iPhone.
const TACTIC_LABEL: Record<Tactic, string> = { defensivo: 'Defensivo', equilibrado: 'Equilibrado', ofensivo: 'Ofensivo' };
const CHIP = 56;

type Phase = 'setup' | 'draft' | 'campaign' | 'result';

function makeSeed(): string {
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
}
function lastName(name: string): string {
  const parts = name.trim().split(' ');
  return parts.length > 1 ? parts[parts.length - 1] : name;
}
const pct = (n: number) => `${n}%` as `${number}%`;

// Bandeira (emoji) a partir do código FIFA da seleção (Squad.code). Históricos
// (URS/TCH/YUG) e a Irlanda do Norte caem no equivalente mais próximo; Inglaterra,
// Escócia e País de Gales usam a bandeira de sub-nação (sequência de tags).
const FIFA_ISO: Record<string, string> = {
  ALG: 'DZ', ARG: 'AR', AUS: 'AU', AUT: 'AT', BEL: 'BE', BRA: 'BR', BUL: 'BG', CHI: 'CL',
  CIV: 'CI', CMR: 'CM', COL: 'CO', CRC: 'CR', CRO: 'HR', CZE: 'CZ', DEN: 'DK', ECU: 'EC',
  EGY: 'EG', ESP: 'ES', FRA: 'FR', GER: 'DE', GHA: 'GH', GRE: 'GR', HUN: 'HU', IRL: 'IE',
  ITA: 'IT', JPN: 'JP', KOR: 'KR', MAR: 'MA', MEX: 'MX', NED: 'NL', NGA: 'NG', NIR: 'GB',
  PAR: 'PY', PER: 'PE', POL: 'PL', POR: 'PT', ROU: 'RO', RUS: 'RU', SEN: 'SN', SRB: 'RS',
  SUI: 'CH', SWE: 'SE', TCH: 'CZ', TUR: 'TR', UKR: 'UA', URS: 'RU', URU: 'UY', USA: 'US',
  YUG: 'RS',
};
const subFlag = (region: string) =>
  '\u{1F3F4}' + [...`gb${region}`].map((ch) => String.fromCodePoint(0xe0000 + ch.charCodeAt(0))).join('') + '\u{E007F}';
function flagFor(code: string): string {
  if (code === 'ENG') return subFlag('eng');
  if (code === 'SCO') return subFlag('sct');
  if (code === 'WAL') return subFlag('wls');
  const iso = FIFA_ISO[code];
  if (!iso) return '🏳️';
  return String.fromCodePoint(...[...iso].map((ch) => 0x1f1e6 + ch.charCodeAt(0) - 65));
}

export function DadoDeCraque({ visible, onClose }: { visible: boolean; onClose: () => void }) {
  const styles = useThemedStyles(makeStyles);
  const [phase, setPhase] = useState<Phase>('setup');
  const [formation, setFormation] = useState<FormationKey>('4-3-3');
  const [tactic, setTactic] = useState<Tactic>('equilibrado');
  const [mode, setMode] = useState<Mode>('classico');

  const [seed, setSeed] = useState('');
  const [slots, setSlots] = useState<Slot[]>([]);
  const [picks, setPicks] = useState<(Player | null)[]>([]);
  const [current, setCurrent] = useState<Squad | null>(null);
  const [rolling, setRolling] = useState(false);
  const [selected, setSelected] = useState<Player | null>(null); // craque aguardando posição
  const [rerolls, setRerolls] = useState(3);
  const [result, setResult] = useState<CampaignResult | null>(null);
  const [reveal, setReveal] = useState(0);

  const usedRef = useRef<Set<string>>(new Set());
  const attemptRef = useRef(0);

  const counts = useMemo(() => dataCounts(), []);
  const filled = useMemo(() => picks.filter(Boolean).length, [picks]);
  const forces = useMemo(() => (slots.length ? calcForces(slots, picks) : { attack: 0, defense: 0, overall: 0 }), [slots, picks]);
  const showStats = mode === 'classico';

  function nextSquad(filledCount: number, exclude: string | undefined, sd: string): Squad {
    attemptRef.current += 1;
    return rollSquad(`${sd}:a${attemptRef.current}`, filledCount, exclude);
  }

  const start = () => {
    const s = makeSeed();
    const sl = slotsFor(formation, tactic);
    setSeed(s);
    setSlots(sl);
    setPicks(new Array(sl.length).fill(null));
    usedRef.current = new Set();
    attemptRef.current = 0;
    setRerolls(mode === 'almanaque' ? 1 : 3);
    setResult(null);
    setReveal(0);
    setSelected(null);
    setCurrent(nextSquad(0, undefined, s));
    setRolling(true);
    setPhase('draft');
  };

  const onRolled = () => setRolling(false);

  const pickable = (p: Player): boolean =>
    !usedRef.current.has(p.id) && slots.some((sl, i) => picks[i] === null && p.pos.includes(sl.pos));

  // Toca no craque → fica "selecionado", aguardando o toque na posição do campo.
  const selectPlayer = (p: Player) => {
    if (!pickable(p)) return;
    setSelected((cur) => (cur && cur.id === p.id ? null : p));
  };

  // Vagas (slots vazios) compatíveis com o craque selecionado.
  const slotsForSelected = useMemo(() => {
    const set = new Set<number>();
    if (selected) slots.forEach((sl, i) => { if (picks[i] === null && selected.pos.includes(sl.pos)) set.add(i); });
    return set;
  }, [selected, slots, picks]);

  // Toca na vaga do campo → escala o craque ali e parte pro próximo sorteio.
  const placeAt = (i: number) => {
    if (!selected || picks[i] !== null || !selected.pos.includes(slots[i].pos)) return;
    const np = [...picks];
    np[i] = selected;
    usedRef.current.add(selected.id);
    setPicks(np);
    setSelected(null);
    const newFilled = np.filter(Boolean).length;
    if (newFilled < np.length) { setCurrent(nextSquad(newFilled, undefined, seed)); setRolling(true); }
    else { setCurrent(null); setRolling(false); }
  };

  // Núcleo do re-sorteio (não mexe no contador): sorteia outro elenco.
  const doReroll = () => {
    if (!current) return;
    setSelected(null);
    setCurrent(nextSquad(filled, squadKey(current), seed));
    setRolling(true);
  };
  const reroll = () => {
    if (rerolls <= 0 || !current) return;
    setRerolls((r) => r - 1);
    doReroll();
  };
  const skipSquad = doReroll;
  // Anúncio premiado opcional: assistir → ganha 1 re-sorteio extra.
  const watchForReroll = async () => {
    const r = await showRewarded();
    if (r === 'earned' || r === 'unavailable') doReroll();
  };

  const simulate = () => {
    setResult(simulateCampaign(forces, seed, { slots, players: picks }));
    setReveal(0);
    setPhase('campaign');
  };

  const shareResult = () => {
    if (!result) return;
    const tag = result.perfect ? ' — 7 A 0! 🏆' : result.champion ? ' — CAMPEÃO! 🏆' : '';
    Share.share({
      message: `🎲 No Dado de Craque, montei meu time e fechei a Copa em ${result.record}${tag}! Monta o seu e tenta superar — Acompanhador da Copa 2026:\n\n${DOWNLOAD_LINKS}`,
    }).catch(() => {});
  };

  const reset = () => {
    setPhase('setup'); setResult(null); setCurrent(null); setRolling(false); setSelected(null);
    setPicks([]); setSlots([]); setReveal(0); usedRef.current = new Set(); attemptRef.current = 0;
  };

  // Fechar SEMPRE reinicia (ao reabrir, começa uma partida nova). Se há um time
  // sendo montado (draft/campanha), confirma antes para não perder o progresso sem querer.
  const requestClose = () => {
    if (phase === 'draft' || phase === 'campaign') {
      Alert.alert(
        'Sair do jogo?',
        'Você vai perder o time que montou — ao voltar, o Dado de Craque recomeça do zero.',
        [
          { text: 'Continuar montando', style: 'cancel' },
          { text: 'Sair e recomeçar', style: 'destructive', onPress: () => { reset(); onClose(); } },
        ],
      );
    } else {
      reset();
      onClose();
    }
  };

  const currentPickable = current ? current.players.filter(pickable) : [];
  const noneFits = !!current && !rolling && currentPickable.length === 0 && filled < slots.length;

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={requestClose}>
      <View style={styles.backdrop}>
        <Pressable style={styles.dismiss} onPress={requestClose} accessibilityLabel="Fechar" />
        <View style={styles.sheet}>
          <View style={styles.grabber} />
          <Pressable style={styles.close} onPress={requestClose} accessibilityRole="button" accessibilityLabel="Fechar" hitSlop={10}>
            <Text style={styles.closeText}>✕</Text>
          </Pressable>

          {phase === 'setup' && (
            <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: spacing(8) }}>
              <Text style={styles.kicker}>DRAFT + SIMULAÇÃO</Text>
              <Text style={styles.title}>Dado de Craque 🎲</Text>
              <Text style={styles.sub}>
                Role o dado, escale craques reais de todas as Copas e veja se sua seleção dos sonhos faz o
                <Text style={styles.boldA}> 7 a 0</Text> (vencer os 7 jogos da Copa).
              </Text>
              <Text style={styles.counts}>{counts.selecoes} seleções · {counts.elencos} elencos · {counts.jogadores.toLocaleString('pt-BR')} jogadores</Text>

              <Text style={styles.label}>Formação</Text>
              <View style={styles.chipsWrap}>
                {FORMATIONS.map((f) => (
                  <Pressable key={f} onPress={() => setFormation(f)} style={[styles.optChip, formation === f && styles.optChipOn]} accessibilityRole="button" accessibilityLabel={`Formação ${f}`}>
                    <Text style={[styles.optChipText, formation === f && styles.optChipTextOn]}>{f}</Text>
                  </Pressable>
                ))}
              </View>

              <Text style={styles.label}>Tática</Text>
              <View style={styles.chipsWrap}>
                {TACTICS.map((t) => (
                  <Pressable key={t} onPress={() => setTactic(t)} style={[styles.optChip, tactic === t && styles.optChipOn]} accessibilityRole="button" accessibilityLabel={`Tática ${TACTIC_LABEL[t]}`}>
                    <Text style={[styles.optChipText, tactic === t && styles.optChipTextOn]}>{TACTIC_LABEL[t]}</Text>
                  </Pressable>
                ))}
              </View>

              <Text style={styles.label}>Modo</Text>
              <View style={styles.chipsWrap}>
                <Pressable onPress={() => setMode('classico')} style={[styles.optChip, mode === 'classico' && styles.optChipOn]} accessibilityRole="button" accessibilityLabel="Modo Clássico">
                  <Text style={[styles.optChipText, mode === 'classico' && styles.optChipTextOn]}>Clássico (vê ratings)</Text>
                </Pressable>
                <Pressable onPress={() => setMode('almanaque')} style={[styles.optChip, mode === 'almanaque' && styles.optChipOn]} accessibilityRole="button" accessibilityLabel="Modo Almanaque">
                  <Text style={[styles.optChipText, mode === 'almanaque' && styles.optChipTextOn]}>Almanaque (ratings ocultos)</Text>
                </Pressable>
              </View>

              <Pressable style={styles.primaryBtn} onPress={start} accessibilityRole="button" accessibilityLabel="Começar o draft">
                <Text style={styles.primaryText}>▶ Começar</Text>
              </Pressable>
            </ScrollView>
          )}

          {phase === 'draft' && (
            <View style={styles.flex1}>
              <View style={styles.hudRow}>
                <Text style={styles.hudText}>{formation} · {TACTIC_LABEL[tactic]}</Text>
                <Text style={styles.hudText}>{filled}/{slots.length} escalados</Text>
              </View>
              {showStats && (
                <View style={styles.forcesRow}>
                  <Text style={styles.forceItem}>ATA <Text style={styles.forceVal}>{forces.attack}</Text></Text>
                  <Text style={styles.forceItem}>DEF <Text style={styles.forceVal}>{forces.defense}</Text></Text>
                  <Text style={styles.forceItem}>GERAL <Text style={styles.forceVal}>{forces.overall}</Text></Text>
                </View>
              )}

              <Pitch slots={slots} picks={picks} showStats={showStats} selectable={slotsForSelected} onSlot={placeAt} />

              {filled >= slots.length ? (
                <View style={styles.draftBottom}>
                  <Text style={styles.readyText}>Time completo! Hora da verdade. 🏆</Text>
                  <Pressable style={styles.primaryBtn} onPress={simulate} accessibilityRole="button" accessibilityLabel="Simular a campanha">
                    <Text style={styles.primaryText}>⚡ Simular a Copa</Text>
                  </Pressable>
                </View>
              ) : current ? (
                <View style={styles.draftBottom}>
                  <Text style={styles.squadTitle}>🎲 {flagFor(current.code)} {current.name} {current.year}</Text>
                  {noneFits ? (
                    <Pressable style={styles.rerollBtn} onPress={skipSquad} accessibilityRole="button" accessibilityLabel="Sortear outro elenco">
                      <Text style={styles.rerollText}>🎲 Nenhum encaixa — sortear outro</Text>
                    </Pressable>
                  ) : rerolls > 0 ? (
                    <Pressable style={styles.rerollBtn} onPress={reroll} accessibilityRole="button" accessibilityLabel="Re-sortear o elenco">
                      <Text style={styles.rerollText}>🔄 Re-sortear  ·  {rerolls} restante{rerolls === 1 ? '' : 's'}</Text>
                    </Pressable>
                  ) : rewardedAvailable() ? (
                    <Pressable style={styles.rerollBtn} onPress={watchForReroll} accessibilityRole="button" accessibilityLabel="Assistir anúncio para ganhar um re-sorteio">
                      <Text style={styles.rerollText}>🎬 Assistir anúncio → +1 re-sorteio</Text>
                    </Pressable>
                  ) : (
                    <Pressable style={[styles.rerollBtn, styles.rerollOff]} disabled accessibilityRole="button" accessibilityLabel="Sem re-sorteios">
                      <Text style={[styles.rerollText, styles.dim]}>🔄 Re-sortear  ·  0 restantes</Text>
                    </Pressable>
                  )}
                  <Text style={[styles.pickHint, selected && styles.pickHintActive]}>
                    {selected ? `Toque na posição do campo pra escalar ${lastName(selected.name)} ⬆️` : 'Toque num craque pra escalar:'}
                  </Text>
                  <ScrollView style={styles.playerList} showsVerticalScrollIndicator contentContainerStyle={{ paddingBottom: spacing(2) }}>
                    {current.players.map((p) => {
                      const ok = pickable(p);
                      const sel = selected?.id === p.id;
                      return (
                        <Pressable key={p.id} onPress={() => selectPlayer(p)} disabled={!ok} style={[styles.playerRow, !ok && styles.playerRowOff, sel && styles.playerRowSel]} accessibilityRole="button" accessibilityLabel={`Escolher ${p.name}`}>
                          {p.legend && <Text style={styles.legendStar}>★</Text>}
                          <Text style={[styles.playerName, !ok && styles.dim, sel && styles.boldA]} numberOfLines={1}>{p.name}</Text>
                          <Text style={[styles.playerPos, !ok && styles.dim]}>{p.pos.join('/')}</Text>
                          {showStats && <Text style={[styles.playerRating, !ok && styles.dim]}>{p.rating}</Text>}
                        </Pressable>
                      );
                    })}
                  </ScrollView>
                </View>
              ) : (
                <View style={styles.draftBottom} />
              )}

              {rolling && current && <RollReveal final={current} onDone={onRolled} />}
            </View>
          )}

          {phase === 'campaign' && result && (
            <CampaignReveal result={result} reveal={reveal} setReveal={setReveal} onFinish={() => setPhase('result')} />
          )}

          {phase === 'result' && result && (
            <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: spacing(8) }}>
              <Text style={styles.resultEmoji}>{result.perfect ? '🏆' : result.champion ? '🥇' : result.group.advanced ? '💪' : '😕'}</Text>
              <Text style={styles.resultHead}>
                {result.perfect ? '7 A 0! CAMPANHA PERFEITA' : result.champion ? 'CAMPEÃO DO MUNDO!' : result.group.advanced ? 'Eliminado no mata-mata' : 'Eliminado na fase de grupos'}
              </Text>
              <Text style={styles.resultRec}>Campanha {result.record} · {result.goalsFor} gols feitos, {result.goalsAgainst} sofridos</Text>
              {result.badge && (
                <View style={styles.badge}>
                  <Text style={styles.badgeText}>{result.badge === 'ESMAGADOR' ? '💥 ESMAGADOR DE RECORDES' : result.badge === 'MURALHA' ? '🧱 MURALHA' : '⭐ CAMPANHA PERFEITA'}</Text>
                </View>
              )}

              <Text style={styles.secTitle}>Fase de grupos</Text>
              <View style={styles.table}>
                <View style={styles.tableHeadRow}>
                  <Text style={[styles.th, styles.thTeam]}>Time</Text>
                  <Text style={styles.th}>P</Text><Text style={styles.th}>SG</Text><Text style={styles.th}>Pts</Text>
                </View>
                {result.group.table.map((r, i) => (
                  <View key={i} style={[styles.tableRow, r.isMe && styles.tableRowMe]}>
                    <Text style={[styles.td, styles.tdTeam, r.isMe && styles.boldT]} numberOfLines={1}>{i + 1}. {r.isMe ? 'Seu time' : r.name}</Text>
                    <Text style={styles.td}>{r.P}</Text>
                    <Text style={styles.td}>{r.GD > 0 ? `+${r.GD}` : r.GD}</Text>
                    <Text style={[styles.td, styles.boldT]}>{r.Pts}</Text>
                  </View>
                ))}
              </View>
              {result.group.games.map((g, i) => (
                <View key={i} style={styles.gameRow}>
                  <Text style={styles.gameLabel}>{g.label}</Text>
                  <Text style={[styles.gameScore, g.outcome === 'V' && styles.win, g.outcome === 'D' && styles.loss]}>{g.gf} – {g.ga}</Text>
                </View>
              ))}

              {result.knockouts.length > 0 && <Text style={styles.secTitle}>Mata-mata</Text>}
              {result.knockouts.map((k, i) => (
                <View key={i} style={styles.gameRow}>
                  <Text style={styles.gameLabel}>{k.label}</Text>
                  <View style={styles.koRight}>
                    <Text style={[styles.gameScore, k.advanced && styles.win, !k.advanced && styles.loss]}>{k.gf} – {k.ga}</Text>
                    {k.penalties && <Text style={styles.penText}>{k.penalties.shootout.scoreMe} x {k.penalties.shootout.scoreAdv} nos pênaltis</Text>}
                  </View>
                </View>
              ))}

              <Pressable style={styles.primaryBtn} onPress={shareResult} accessibilityRole="button" accessibilityLabel="Compartilhar resultado">
                <Text style={styles.primaryText}>Desafiar amigos 📲</Text>
              </Pressable>
              <Pressable style={styles.ghostBtnWide} onPress={start} accessibilityRole="button" accessibilityLabel="Jogar de novo">
                <Text style={styles.ghostText}>Jogar de novo</Text>
              </Pressable>
              <Pressable style={styles.ghostBtnWide} onPress={reset} accessibilityRole="button" accessibilityLabel="Trocar formação e modo">
                <Text style={styles.ghostText}>Trocar formação/modo</Text>
              </Pressable>
            </ScrollView>
          )}
        </View>
      </View>
    </Modal>
  );
}

/** "Roleta" de seleções: botão ROLAR → várias seleções passam rápido e param na sorteada. */
function RollReveal({ final, onDone }: { final: Squad; onDone: () => void }) {
  const styles = useThemedStyles(makeStyles);
  const [spinning, setSpinning] = useState(false);
  const [landed, setLanded] = useState(false);
  const [display, setDisplay] = useState<Squad>(final);
  const timers = useRef<ReturnType<typeof setTimeout>[]>([]);
  const pool = useMemo(() => getSquads(), []);

  useEffect(() => () => { timers.current.forEach(clearTimeout); }, []);

  const roll = () => {
    if (spinning || landed) return;
    setSpinning(true);
    const frames = 15;
    let i = 0;
    const tick = () => {
      if (i >= frames) {
        setDisplay(final);
        setSpinning(false);
        setLanded(true);
        timers.current.push(setTimeout(onDone, 500)); // segura ~0,5s na sorteada e abre os jogadores
        return;
      }
      setDisplay(pool[Math.floor(Math.random() * pool.length)]);
      const delay = 32 + Math.floor(i * i * 0.7); // ~1,2s girando, desacelerando (slot machine)
      i++;
      timers.current.push(setTimeout(tick, delay));
    };
    tick();
  };

  return (
    <View style={styles.rollOverlay}>
      {!spinning && !landed ? (
        <>
          <View style={styles.rollPlaceholder}>
            <Text style={styles.rollHint}>Role para sortear uma seleção e uma Copa do Mundo</Text>
          </View>
          <Pressable style={styles.rollBtn} onPress={roll} accessibilityRole="button" accessibilityLabel="Rolar o dado">
            <Text style={styles.rollBtnText}>ROLAR  🎲</Text>
          </Pressable>
        </>
      ) : (
        <View style={[styles.rollCard, landed && styles.rollCardLanded]}>
          <Text style={[styles.rollSaiu, landed && styles.win]}>{landed ? '✓ SAIU' : 'SORTEANDO…'}</Text>
          <Text style={styles.rollSel}>{flagFor(display.code)} {display.name}</Text>
          <Text style={styles.rollYear}>Copa {display.year}</Text>
        </View>
      )}
    </View>
  );
}

type RevealGame = {
  key: string; label: string; phaseTag: string;
  gf: number; ga: number; outcome: 'V' | 'E' | 'D';
  myGoals: Goal[]; advGoals: Goal[];
  pen: { scoreMe: number; scoreAdv: number; meWin: boolean } | null;
  advanced: boolean | null; isLastGroup: boolean; isFinal: boolean;
};

/** Revela a campanha JOGO A JOGO, comemorando vitória por vitória. */
function CampaignReveal({ result, reveal, setReveal, onFinish }: { result: CampaignResult; reveal: number; setReveal: (n: number) => void; onFinish: () => void }) {
  const styles = useThemedStyles(makeStyles);
  const games: RevealGame[] = [];
  result.group.games.forEach((g, i) =>
    games.push({ key: `g${i}`, label: g.label, phaseTag: 'FASE DE GRUPOS', gf: g.gf, ga: g.ga, outcome: g.outcome, myGoals: g.myGoals, advGoals: g.advGoals, pen: null, advanced: null, isLastGroup: i === 2, isFinal: false }));
  result.knockouts.forEach((k) =>
    games.push({ key: k.phase, label: k.label, phaseTag: 'MATA-MATA', gf: k.gf, ga: k.ga, outcome: k.outcome, myGoals: k.myGoals, advGoals: k.advGoals, pen: k.penalties ? { scoreMe: k.penalties.shootout.scoreMe, scoreAdv: k.penalties.shootout.scoreAdv, meWin: k.penalties.meWin } : null, advanced: k.advanced, isLastGroup: false, isFinal: k.phase === 'FINAL' }));

  const g = games[Math.min(reveal, games.length - 1)];
  const last = reveal >= games.length - 1;

  let head = '';
  if (g.advanced === null) head = g.outcome === 'V' ? 'Vitória! 🎉' : g.outcome === 'E' ? 'Empate' : 'Derrota';
  else if (g.advanced) head = g.isFinal ? 'CAMPEÃO DO MUNDO! 🏆' : 'Classificado! 🎉';
  else head = 'Eliminado 😕';

  return (
    <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: spacing(8) }}>
      <Text style={styles.cpKicker}>{g.phaseTag} · jogo {reveal + 1} de {games.length}</Text>
      <Text style={styles.cpLabel}>{g.label}</Text>

      <View style={styles.cpCard}>
        <Text style={[styles.cpScore, (g.outcome === 'V' || g.advanced) && styles.win, (g.outcome === 'D' || g.advanced === false) && styles.loss]}>{g.gf} – {g.ga}</Text>
        {g.pen && <Text style={styles.cpPen}>{g.pen.scoreMe} x {g.pen.scoreAdv} nos pênaltis</Text>}
        <Text style={[styles.cpHead, (g.outcome === 'V' || g.advanced) && styles.win, (g.outcome === 'D' || g.advanced === false) && styles.loss]}>{head}</Text>
      </View>

      {(g.myGoals.length > 0 || g.advGoals.length > 0) && (
        <View style={styles.scorers}>
          <View style={styles.scorerCol}>
            <Text style={styles.scorerColTitle}>Seus gols</Text>
            {g.myGoals.length === 0 ? <Text style={styles.scorerNone}>—</Text> : g.myGoals.map((go, i) => (
              <Text key={i} style={styles.scorerLine}>⚽ {go.minute}' {go.scorer ? lastName(go.scorer) : ''}</Text>
            ))}
          </View>
          <View style={styles.scorerCol}>
            <Text style={styles.scorerColTitle}>Adversário</Text>
            {g.advGoals.length === 0 ? <Text style={styles.scorerNone}>—</Text> : g.advGoals.map((go, i) => (
              <Text key={i} style={styles.scorerLineAdv}>{go.minute}' gol</Text>
            ))}
          </View>
        </View>
      )}

      {g.isLastGroup && (
        <>
          <Text style={[styles.cpBanner, result.group.advanced ? styles.win : styles.loss]}>
            {result.group.advanced ? `Classificado em ${result.group.rank}º! Avança ao mata-mata.` : `${result.group.rank}º no grupo — eliminado.`}
          </Text>
          <View style={styles.table}>
            <View style={styles.tableHeadRow}>
              <Text style={[styles.th, styles.thTeam]}>Grupo</Text>
              <Text style={styles.th}>P</Text><Text style={styles.th}>SG</Text><Text style={styles.th}>Pts</Text>
            </View>
            {result.group.table.map((r, i) => (
              <View key={i} style={[styles.tableRow, r.isMe && styles.tableRowMe]}>
                <Text style={[styles.td, styles.tdTeam, r.isMe && styles.boldT]} numberOfLines={1}>{i + 1}. {r.isMe ? 'Seu time' : r.name}</Text>
                <Text style={styles.td}>{r.P}</Text>
                <Text style={styles.td}>{r.GD > 0 ? `+${r.GD}` : r.GD}</Text>
                <Text style={[styles.td, styles.boldT]}>{r.Pts}</Text>
              </View>
            ))}
          </View>
        </>
      )}

      {last ? (
        <Pressable style={styles.primaryBtn} onPress={onFinish} accessibilityRole="button" accessibilityLabel="Ver o resultado final">
          <Text style={styles.primaryText}>Ver resultado 🏆</Text>
        </Pressable>
      ) : (
        <>
          <Pressable style={styles.primaryBtn} onPress={() => setReveal(reveal + 1)} accessibilityRole="button" accessibilityLabel="Próximo jogo">
            <Text style={styles.primaryText}>Próximo jogo ▶</Text>
          </Pressable>
          <Pressable style={styles.ghostBtnWide} onPress={onFinish} accessibilityRole="button" accessibilityLabel="Pular para o resultado">
            <Text style={styles.ghostText}>⏩ Pular pro resultado</Text>
          </Pressable>
        </>
      )}
    </ScrollView>
  );
}

// Mapeia as coordenadas {0..100} pra dentro do campo com margem (evita os chips
// colarem nas bordas). X é simétrico (50→50); Y deixa mais folga embaixo (goleiro).
const fx = (n: number) => pct(6 + n * 0.88);
const fy = (n: number) => pct(6 + n * 0.82);

/** Campo com os 11 slots posicionados por {x,y}. Slots compatíveis ficam tocáveis. */
function Pitch({ slots, picks, showStats, selectable, onSlot }: { slots: Slot[]; picks: (Player | null)[]; showStats: boolean; selectable: Set<number>; onSlot: (i: number) => void }) {
  const styles = useThemedStyles(makeStyles);
  return (
    <View style={styles.pitch}>
      <View style={styles.pitchLine} />
      <View style={styles.pitchCircle} />
      {slots.map((s, i) => {
        const p = picks[i];
        const hi = selectable.has(i);
        return (
          <Pressable
            key={i}
            style={[styles.slotWrap, { left: fx(s.x), top: fy(s.y) }]}
            onPress={hi ? () => onSlot(i) : undefined}
            disabled={!hi}
            pointerEvents={hi ? 'auto' : 'none'}
            hitSlop={8}
            accessibilityLabel={hi ? `Escalar na posição ${s.pos}` : undefined}
          >
            <View style={[styles.slotChip, p && styles.slotChipOn, hi && styles.slotChipHi]}>
              <Text style={[styles.slotChipText, p && styles.slotChipTextOn, hi && styles.slotChipTextHi]} numberOfLines={1}>{hi ? '+' : p ? (showStats ? p.rating : '✓') : s.pos}</Text>
            </View>
            <Text style={[styles.slotName, hi && styles.win]} numberOfLines={1}>{p ? lastName(p.name) : s.pos}</Text>
          </Pressable>
        );
      })}
    </View>
  );
}

const makeStyles = ({ c }: ThemeTokens) => StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'flex-end' },
  dismiss: { flex: 1 },
  sheet: { backgroundColor: c.bgElev, borderTopLeftRadius: radius.xl, borderTopRightRadius: radius.xl, borderTopWidth: 1, borderColor: c.border, paddingHorizontal: spacing(5), paddingTop: spacing(3), height: '94%' },
  grabber: { width: 44, height: 5, borderRadius: 3, backgroundColor: c.borderBright, alignSelf: 'center', marginBottom: spacing(3) },
  close: { position: 'absolute', top: spacing(4), right: spacing(5), zIndex: 20 },
  closeText: { color: c.textDim, fontFamily: fonts.bold, fontSize: 18 },
  flex1: { flex: 1 },
  boldA: { fontFamily: fonts.bold, color: c.accent },
  boldT: { fontFamily: fonts.bold, color: c.text },
  dim: { opacity: 0.4 },

  kicker: { color: c.accent, fontFamily: fonts.extrabold, fontSize: 11, letterSpacing: 1.5, marginBottom: 1 },
  title: { color: c.text, fontFamily: fonts.display, fontSize: 30 },
  sub: { color: c.textDim, fontFamily: fonts.regular, fontSize: 14, lineHeight: 20, marginTop: spacing(1) },
  counts: { color: c.textFaint, fontFamily: fonts.semibold, fontSize: 12, marginTop: spacing(2), marginBottom: spacing(3) },
  label: { color: c.textDim, fontFamily: fonts.bold, fontSize: 12, textTransform: 'uppercase', letterSpacing: 0.5, marginTop: spacing(3), marginBottom: spacing(2) },
  chipsWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing(2) },
  optChip: { paddingVertical: spacing(2), paddingHorizontal: spacing(3), borderRadius: radius.pill, borderWidth: 1, borderColor: c.border, backgroundColor: c.surface },
  optChipOn: { borderColor: c.accent, backgroundColor: 'rgba(20,224,138,0.12)' },
  optChipText: { color: c.textDim, fontFamily: fonts.bold, fontSize: 13 },
  optChipTextOn: { color: c.accent },
  primaryBtn: { backgroundColor: c.accent, borderRadius: radius.md, paddingVertical: spacing(4), alignItems: 'center', alignSelf: 'stretch', marginTop: spacing(4) },
  primaryText: { color: c.ink, fontFamily: fonts.display, fontSize: 17, letterSpacing: 0.5 },

  hudRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: spacing(1) },
  hudText: { color: c.textDim, fontFamily: fonts.bold, fontSize: 12.5 },
  forcesRow: { flexDirection: 'row', justifyContent: 'center', gap: spacing(5), marginBottom: spacing(2) },
  forceItem: { color: c.textFaint, fontFamily: fonts.bold, fontSize: 12 },
  forceVal: { color: c.accent, fontFamily: fonts.display, fontSize: 15 },

  pitch: { height: 230, borderRadius: radius.lg, backgroundColor: '#0f3d22', borderWidth: 1, borderColor: 'rgba(255,255,255,0.12)', overflow: 'hidden' },
  pitchLine: { position: 'absolute', top: '50%', left: 0, right: 0, height: 1, backgroundColor: 'rgba(255,255,255,0.12)' },
  pitchCircle: { position: 'absolute', alignSelf: 'center', top: '50%', width: 58, height: 58, borderRadius: 29, borderWidth: 1, borderColor: 'rgba(255,255,255,0.12)', marginTop: -29 },
  // marginTop = -metade da ALTURA do chip (32) → centra o chip exatamente no ponto;
  // o nome flui logo abaixo sem deslocar o chip.
  slotWrap: { position: 'absolute', width: CHIP, marginLeft: -CHIP / 2, marginTop: -16, alignItems: 'center' },
  slotChip: { width: 32, height: 32, borderRadius: 16, borderWidth: 1.5, borderColor: 'rgba(255,255,255,0.35)', backgroundColor: 'rgba(0,0,0,0.3)', alignItems: 'center', justifyContent: 'center' },
  slotChipOn: { borderColor: c.accent, backgroundColor: c.accent },
  slotChipHi: { borderColor: c.accent, borderWidth: 2.5, backgroundColor: 'rgba(20,224,138,0.25)' },
  slotChipText: { color: 'rgba(255,255,255,0.7)', fontFamily: fonts.extrabold, fontSize: 12, lineHeight: 14, textAlign: 'center', textAlignVertical: 'center', includeFontPadding: false, width: 32 },
  slotChipTextOn: { color: c.ink },
  slotChipTextHi: { color: c.accent, fontSize: 18 },
  slotName: { color: '#fff', fontFamily: fonts.semibold, fontSize: 9.5, marginTop: 2, textShadowColor: 'rgba(0,0,0,0.7)', textShadowRadius: 3 },

  draftBottom: { flex: 1, marginTop: spacing(3) },
  squadTitle: { color: c.text, fontFamily: fonts.display, fontSize: 19, marginBottom: spacing(2) },
  rerollBtn: { backgroundColor: 'rgba(20,224,138,0.12)', borderWidth: 1.5, borderColor: c.accent, borderRadius: radius.md, paddingVertical: spacing(3), alignItems: 'center', marginBottom: spacing(2) },
  rerollOff: { borderColor: c.border, backgroundColor: 'transparent' },
  rerollText: { color: c.accent, fontFamily: fonts.display, fontSize: 15, letterSpacing: 0.3 },
  pickHint: { color: c.textFaint, fontFamily: fonts.semibold, fontSize: 12, marginBottom: spacing(1) },
  pickHintActive: { color: c.accent, fontFamily: fonts.bold, fontSize: 13 },
  playerList: { flex: 1 },
  playerRow: { flexDirection: 'row', alignItems: 'center', gap: spacing(2), paddingVertical: spacing(3), paddingHorizontal: spacing(3), borderRadius: radius.sm, borderWidth: 1, borderColor: c.border, backgroundColor: c.surface, marginBottom: spacing(2) },
  playerRowOff: { opacity: 0.45, backgroundColor: 'transparent' },
  playerRowSel: { borderColor: c.accent, backgroundColor: 'rgba(20,224,138,0.14)' },
  legendStar: { color: c.amber, fontSize: 12 },
  playerName: { flex: 1, color: c.text, fontFamily: fonts.semibold, fontSize: 15 },
  playerPos: { color: c.textFaint, fontFamily: fonts.bold, fontSize: 11 },
  playerRating: { color: c.accent, fontFamily: fonts.display, fontSize: 16, width: 28, textAlign: 'right' },
  readyText: { color: c.text, fontFamily: fonts.bold, fontSize: 16, textAlign: 'center', marginTop: spacing(2) },

  rollOverlay: { position: 'absolute', top: 0, left: -spacing(5), right: -spacing(5), bottom: 0, backgroundColor: c.bgElev, alignItems: 'center', justifyContent: 'center', paddingHorizontal: spacing(6), zIndex: 10 },
  rollPlaceholder: { borderWidth: 1.5, borderColor: c.border, borderStyle: 'dashed', borderRadius: radius.lg, paddingVertical: spacing(7), paddingHorizontal: spacing(6), marginBottom: spacing(6), alignSelf: 'stretch' },
  rollHint: { color: c.textDim, fontFamily: fonts.semibold, fontSize: 15, textAlign: 'center', lineHeight: 22 },
  rollBtn: { backgroundColor: c.accent, borderRadius: radius.md, paddingVertical: spacing(5), paddingHorizontal: spacing(10), alignItems: 'center', alignSelf: 'stretch' },
  rollBtnText: { color: c.ink, fontFamily: fonts.display, fontSize: 26, letterSpacing: 1 },
  rollCard: { alignItems: 'center', alignSelf: 'stretch', paddingVertical: spacing(9), borderRadius: radius.lg, borderWidth: 1, borderColor: c.border, backgroundColor: c.surface },
  rollCardLanded: { borderColor: c.accent, borderWidth: 2 },
  rollSaiu: { color: c.textFaint, fontFamily: fonts.extrabold, fontSize: 12, letterSpacing: 1.5 },
  rollSel: { color: c.text, fontFamily: fonts.display, fontSize: 34, marginTop: spacing(3), textAlign: 'center' },
  rollYear: { color: c.accent, fontFamily: fonts.display, fontSize: 20, marginTop: spacing(1) },

  cpKicker: { color: c.accent, fontFamily: fonts.extrabold, fontSize: 11, letterSpacing: 1.5, marginTop: spacing(2), textAlign: 'center' },
  cpLabel: { color: c.text, fontFamily: fonts.display, fontSize: 24, textAlign: 'center', marginTop: spacing(1) },
  cpCard: { alignItems: 'center', marginTop: spacing(4), paddingVertical: spacing(5), borderRadius: radius.lg, borderWidth: 1, borderColor: c.border, backgroundColor: c.surface },
  cpScore: { color: c.text, fontFamily: fonts.display, fontSize: 54 },
  cpPen: { color: c.textDim, fontFamily: fonts.semibold, fontSize: 13, marginTop: 2 },
  cpHead: { fontFamily: fonts.display, fontSize: 20, marginTop: spacing(2) },
  scorers: { flexDirection: 'row', gap: spacing(3), marginTop: spacing(4) },
  scorerCol: { flex: 1, backgroundColor: c.surface, borderRadius: radius.md, borderWidth: 1, borderColor: c.border, padding: spacing(3) },
  scorerColTitle: { color: c.textFaint, fontFamily: fonts.bold, fontSize: 11, textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: spacing(2) },
  scorerLine: { color: c.text, fontFamily: fonts.semibold, fontSize: 13, marginBottom: 3 },
  scorerLineAdv: { color: c.textDim, fontFamily: fonts.medium, fontSize: 13, marginBottom: 3 },
  scorerNone: { color: c.textFaint, fontFamily: fonts.regular, fontSize: 13 },
  cpBanner: { fontFamily: fonts.bold, fontSize: 15, textAlign: 'center', marginTop: spacing(4), marginBottom: spacing(2) },

  resultEmoji: { fontSize: 54, textAlign: 'center', marginTop: spacing(2) },
  resultHead: { color: c.text, fontFamily: fonts.display, fontSize: 24, textAlign: 'center', marginTop: spacing(2) },
  resultRec: { color: c.textDim, fontFamily: fonts.medium, fontSize: 13.5, textAlign: 'center', marginTop: spacing(1) },
  badge: { alignSelf: 'center', marginTop: spacing(3), paddingVertical: spacing(2), paddingHorizontal: spacing(4), borderRadius: radius.pill, backgroundColor: 'rgba(20,224,138,0.14)', borderWidth: 1, borderColor: c.accent },
  badgeText: { color: c.accent, fontFamily: fonts.display, fontSize: 14 },
  secTitle: { color: c.accent, fontFamily: fonts.extrabold, fontSize: 12, letterSpacing: 1, textTransform: 'uppercase', marginTop: spacing(5), marginBottom: spacing(2) },
  table: { borderWidth: 1, borderColor: c.border, borderRadius: radius.md, overflow: 'hidden', marginTop: spacing(2) },
  tableHeadRow: { flexDirection: 'row', backgroundColor: c.surface, paddingVertical: spacing(2), paddingHorizontal: spacing(3) },
  th: { color: c.textFaint, fontFamily: fonts.bold, fontSize: 11, width: 34, textAlign: 'center' },
  thTeam: { flex: 1, textAlign: 'left' },
  tableRow: { flexDirection: 'row', paddingVertical: spacing(2), paddingHorizontal: spacing(3), borderTopWidth: 1, borderTopColor: c.border },
  tableRowMe: { backgroundColor: 'rgba(20,224,138,0.08)' },
  td: { color: c.textDim, fontFamily: fonts.semibold, fontSize: 13, width: 34, textAlign: 'center' },
  tdTeam: { flex: 1, textAlign: 'left' },
  gameRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: spacing(2.5), borderBottomWidth: 1, borderBottomColor: c.border },
  gameLabel: { color: c.textDim, fontFamily: fonts.semibold, fontSize: 13.5 },
  koRight: { alignItems: 'flex-end' },
  gameScore: { color: c.text, fontFamily: fonts.display, fontSize: 16 },
  penText: { color: c.textFaint, fontFamily: fonts.medium, fontSize: 11 },
  win: { color: c.accent },
  loss: { color: c.live },
  ghostBtnWide: { paddingVertical: spacing(3), alignItems: 'center', alignSelf: 'stretch', marginTop: spacing(1) },
  ghostText: { color: c.textDim, fontFamily: fonts.bold, fontSize: 14 },
});
