import React, { useMemo, useRef, useState } from 'react';
import { Animated, Easing, Modal, Pressable, ScrollView, Share, StyleSheet, Text, View } from 'react-native';

import { FORMATIONS, TACTICS, dataCounts, rollSquad, slotsFor, squadKey } from '../data/draft/data';
import { calcForces, simulateCampaign } from '../data/draft/engine';
import type { CampaignResult, FormationKey, Goal, Mode, Player, Slot, Squad, Tactic } from '../data/draft/types';
import { colors, fonts, radius, spacing } from '../lib/theme';

const APP_LINK = 'https://play.google.com/store/apps/details?id=com.danielnascimento.copa2026';
const TACTIC_LABEL: Record<Tactic, string> = { defensivo: 'Defensivo', equilibrado: 'Equilibrado', ofensivo: 'Ofensivo' };
const CHIP = 52;

type Phase = 'setup' | 'draft' | 'campaign' | 'result';

function makeSeed(): string {
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
}
function lastName(name: string): string {
  const parts = name.trim().split(' ');
  return parts.length > 1 ? parts[parts.length - 1] : name;
}
const pct = (n: number) => `${n}%` as `${number}%`;

export function DadoDeCraque({ visible, onClose }: { visible: boolean; onClose: () => void }) {
  const [phase, setPhase] = useState<Phase>('setup');
  const [formation, setFormation] = useState<FormationKey>('4-3-3');
  const [tactic, setTactic] = useState<Tactic>('equilibrado');
  const [mode, setMode] = useState<Mode>('classico');

  const [seed, setSeed] = useState('');
  const [slots, setSlots] = useState<Slot[]>([]);
  const [picks, setPicks] = useState<(Player | null)[]>([]);
  const [current, setCurrent] = useState<Squad | null>(null);
  const [rolling, setRolling] = useState(false);
  const [rerolls, setRerolls] = useState(3);
  const [result, setResult] = useState<CampaignResult | null>(null);
  const [reveal, setReveal] = useState(0);

  const usedRef = useRef<Set<string>>(new Set());
  const attemptRef = useRef(0);
  const excludeRef = useRef<string | undefined>(undefined);

  const counts = useMemo(() => dataCounts(), []);
  const filled = useMemo(() => picks.filter(Boolean).length, [picks]);
  const forces = useMemo(() => (slots.length ? calcForces(slots, picks) : { attack: 0, defense: 0, overall: 0 }), [slots, picks]);
  const showStats = mode === 'classico';

  function freshSquad(filledCount: number, exclude?: string): Squad {
    attemptRef.current += 1;
    return rollSquad(`${seed}:a${attemptRef.current}`, filledCount, exclude);
  }

  const start = () => {
    const s = makeSeed();
    const sl = slotsFor(formation, tactic);
    setSeed(s);
    setSlots(sl);
    setPicks(new Array(sl.length).fill(null));
    usedRef.current = new Set();
    attemptRef.current = 0;
    excludeRef.current = undefined;
    setRerolls(mode === 'almanaque' ? 1 : 3);
    setResult(null);
    setReveal(0);
    setCurrent(null);
    setRolling(true); // primeira rolagem do dado
    setPhase('draft');
  };

  // Chamado quando a animação do dado termina: revela o elenco sorteado.
  const onRolled = () => {
    const sq = freshSquad(picks.filter(Boolean).length, excludeRef.current);
    excludeRef.current = undefined;
    setCurrent(sq);
    setRolling(false);
  };

  const pickable = (p: Player): boolean =>
    !usedRef.current.has(p.id) && slots.some((sl, i) => picks[i] === null && p.pos.includes(sl.pos));

  const pick = (p: Player) => {
    if (!pickable(p)) return;
    const idx = slots.findIndex((sl, i) => picks[i] === null && p.pos.includes(sl.pos));
    if (idx < 0) return;
    const np = [...picks];
    np[idx] = p;
    usedRef.current.add(p.id);
    setPicks(np);
    setCurrent(null);
    if (np.filter(Boolean).length < np.length) setRolling(true); // rola o próximo
  };

  const reroll = () => {
    if (rerolls <= 0 || !current) return;
    setRerolls((r) => r - 1);
    excludeRef.current = squadKey(current);
    setCurrent(null);
    setRolling(true);
  };
  const skipSquad = () => {
    if (!current) return;
    excludeRef.current = squadKey(current);
    setCurrent(null);
    setRolling(true);
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
      message: `🎲 No Dado de Craque, montei meu time e fechei a Copa em ${result.record}${tag}! Monta o seu e tenta superar — Acompanhador da Copa 2026:\n${APP_LINK}`,
    }).catch(() => {});
  };

  const reset = () => { setPhase('setup'); setResult(null); setCurrent(null); setRolling(false); };

  const currentPickable = current ? current.players.filter(pickable) : [];
  const noneFits = !!current && !rolling && currentPickable.length === 0 && filled < slots.length;

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <View style={styles.backdrop}>
        <Pressable style={styles.dismiss} onPress={onClose} accessibilityLabel="Fechar" />
        <View style={styles.sheet}>
          <View style={styles.grabber} />
          <Pressable style={styles.close} onPress={onClose} accessibilityRole="button" accessibilityLabel="Fechar" hitSlop={10}>
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

              <Pitch slots={slots} picks={picks} showStats={showStats} />

              {filled >= slots.length ? (
                <View style={styles.draftBottom}>
                  <Text style={styles.readyText}>Time completo! Hora da verdade. 🏆</Text>
                  <Pressable style={styles.primaryBtn} onPress={simulate} accessibilityRole="button" accessibilityLabel="Simular a campanha">
                    <Text style={styles.primaryText}>⚡ Simular a Copa</Text>
                  </Pressable>
                </View>
              ) : current ? (
                <View style={styles.draftBottom}>
                  <Text style={styles.squadTitle}>🎲 {current.name} {current.year}</Text>
                  {/* Re-sortear em destaque, ACIMA da lista */}
                  {noneFits ? (
                    <Pressable style={styles.rerollBtn} onPress={skipSquad} accessibilityRole="button" accessibilityLabel="Sortear outro elenco">
                      <Text style={styles.rerollText}>🎲 Nenhum encaixa — sortear outro</Text>
                    </Pressable>
                  ) : (
                    <Pressable style={[styles.rerollBtn, rerolls <= 0 && styles.rerollOff]} onPress={reroll} disabled={rerolls <= 0} accessibilityRole="button" accessibilityLabel="Re-sortear o elenco">
                      <Text style={[styles.rerollText, rerolls <= 0 && styles.dim]}>🔄 Re-sortear  ·  {rerolls} restante{rerolls === 1 ? '' : 's'}</Text>
                    </Pressable>
                  )}
                  <Text style={styles.pickHint}>Toque num craque pra escalar:</Text>
                  <ScrollView style={styles.playerList} showsVerticalScrollIndicator>
                    {current.players.map((p) => {
                      const ok = pickable(p);
                      return (
                        <Pressable key={p.id} onPress={() => pick(p)} disabled={!ok} style={[styles.playerRow, !ok && styles.playerRowOff]} accessibilityRole="button" accessibilityLabel={`Escalar ${p.name}`}>
                          {p.legend && <Text style={styles.legendStar}>★</Text>}
                          <Text style={[styles.playerName, !ok && styles.dim]} numberOfLines={1}>{p.name}</Text>
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

              {rolling && <DiceRoller onRolled={onRolled} label="Toque pra rolar o dado" />}
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

/** Overlay do dado: cobre a tela; ao tocar, anima e revela o elenco. */
function DiceRoller({ onRolled, label }: { onRolled: () => void; label: string }) {
  const spin = useRef(new Animated.Value(0)).current;
  const [busy, setBusy] = useState(false);
  const roll = () => {
    if (busy) return;
    setBusy(true);
    spin.setValue(0);
    Animated.timing(spin, { toValue: 1, duration: 850, easing: Easing.out(Easing.cubic), useNativeDriver: true }).start(() => {
      setBusy(false);
      onRolled();
    });
  };
  const rotate = spin.interpolate({ inputRange: [0, 1], outputRange: ['0deg', '720deg'] });
  const scale = spin.interpolate({ inputRange: [0, 0.5, 1], outputRange: [1, 1.35, 1] });
  return (
    <View style={styles.diceOverlay}>
      <Pressable onPress={roll} disabled={busy} accessibilityRole="button" accessibilityLabel="Rolar o dado" hitSlop={20}>
        <Animated.Text style={[styles.diceBig, { transform: [{ rotate }, { scale }] }]}>🎲</Animated.Text>
      </Pressable>
      <Text style={styles.diceLabel}>{busy ? 'Rolando…' : label}</Text>
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

/** Campo com os 11 slots posicionados por {x,y}. */
function Pitch({ slots, picks, showStats }: { slots: Slot[]; picks: (Player | null)[]; showStats: boolean }) {
  return (
    <View style={styles.pitch}>
      <View style={styles.pitchLine} />
      <View style={styles.pitchCircle} />
      {slots.map((s, i) => {
        const p = picks[i];
        return (
          <View key={i} style={[styles.slotWrap, { left: pct(s.x), top: pct(s.y) }]} pointerEvents="none">
            <View style={[styles.slotChip, p && styles.slotChipOn]}>
              <Text style={[styles.slotChipText, p && styles.slotChipTextOn]} numberOfLines={1}>{p ? (showStats ? p.rating : '✓') : s.pos}</Text>
            </View>
            <Text style={styles.slotName} numberOfLines={1}>{p ? lastName(p.name) : s.pos}</Text>
          </View>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'flex-end' },
  dismiss: { flex: 1 },
  sheet: { backgroundColor: colors.bgElev, borderTopLeftRadius: radius.xl, borderTopRightRadius: radius.xl, borderTopWidth: 1, borderColor: colors.border, paddingHorizontal: spacing(5), paddingTop: spacing(3), height: '92%' },
  grabber: { width: 44, height: 5, borderRadius: 3, backgroundColor: colors.borderBright, alignSelf: 'center', marginBottom: spacing(3) },
  close: { position: 'absolute', top: spacing(4), right: spacing(5), zIndex: 20 },
  closeText: { color: colors.textDim, fontFamily: fonts.bold, fontSize: 18 },
  flex1: { flex: 1 },
  boldA: { fontFamily: fonts.bold, color: colors.accent },
  boldT: { fontFamily: fonts.bold, color: colors.text },
  dim: { opacity: 0.4 },

  kicker: { color: colors.accent, fontFamily: fonts.extrabold, fontSize: 11, letterSpacing: 1.5, marginBottom: 1 },
  title: { color: colors.text, fontFamily: fonts.display, fontSize: 30 },
  sub: { color: colors.textDim, fontFamily: fonts.regular, fontSize: 14, lineHeight: 20, marginTop: spacing(1) },
  counts: { color: colors.textFaint, fontFamily: fonts.semibold, fontSize: 12, marginTop: spacing(2), marginBottom: spacing(3) },
  label: { color: colors.textDim, fontFamily: fonts.bold, fontSize: 12, textTransform: 'uppercase', letterSpacing: 0.5, marginTop: spacing(3), marginBottom: spacing(2) },
  chipsWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing(2) },
  optChip: { paddingVertical: spacing(2), paddingHorizontal: spacing(3), borderRadius: radius.pill, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.surface },
  optChipOn: { borderColor: colors.accent, backgroundColor: 'rgba(20,224,138,0.12)' },
  optChipText: { color: colors.textDim, fontFamily: fonts.bold, fontSize: 13 },
  optChipTextOn: { color: colors.accent },
  primaryBtn: { backgroundColor: colors.accent, borderRadius: radius.md, paddingVertical: spacing(4), alignItems: 'center', alignSelf: 'stretch', marginTop: spacing(4) },
  primaryText: { color: colors.ink, fontFamily: fonts.display, fontSize: 17, letterSpacing: 0.5 },

  hudRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: spacing(1) },
  hudText: { color: colors.textDim, fontFamily: fonts.bold, fontSize: 12.5 },
  forcesRow: { flexDirection: 'row', justifyContent: 'center', gap: spacing(5), marginBottom: spacing(2) },
  forceItem: { color: colors.textFaint, fontFamily: fonts.bold, fontSize: 12 },
  forceVal: { color: colors.accent, fontFamily: fonts.display, fontSize: 15 },

  pitch: { height: 250, borderRadius: radius.lg, backgroundColor: '#0f3d22', borderWidth: 1, borderColor: 'rgba(255,255,255,0.12)', overflow: 'hidden' },
  pitchLine: { position: 'absolute', top: '50%', left: 0, right: 0, height: 1, backgroundColor: 'rgba(255,255,255,0.12)' },
  pitchCircle: { position: 'absolute', alignSelf: 'center', top: '50%', width: 64, height: 64, borderRadius: 32, borderWidth: 1, borderColor: 'rgba(255,255,255,0.12)', marginTop: -32 },
  slotWrap: { position: 'absolute', width: CHIP, marginLeft: -CHIP / 2, marginTop: -CHIP / 2, alignItems: 'center' },
  slotChip: { width: 32, height: 32, borderRadius: 16, borderWidth: 1.5, borderColor: 'rgba(255,255,255,0.35)', backgroundColor: 'rgba(0,0,0,0.3)', alignItems: 'center', justifyContent: 'center' },
  slotChipOn: { borderColor: colors.accent, backgroundColor: colors.accent },
  slotChipText: { color: 'rgba(255,255,255,0.7)', fontFamily: fonts.extrabold, fontSize: 12 },
  slotChipTextOn: { color: colors.ink },
  slotName: { color: '#fff', fontFamily: fonts.semibold, fontSize: 9.5, marginTop: 2, textShadowColor: 'rgba(0,0,0,0.7)', textShadowRadius: 3 },

  draftBottom: { flex: 1, marginTop: spacing(3) },
  squadTitle: { color: colors.text, fontFamily: fonts.display, fontSize: 19, marginBottom: spacing(2) },
  rerollBtn: { backgroundColor: 'rgba(20,224,138,0.12)', borderWidth: 1.5, borderColor: colors.accent, borderRadius: radius.md, paddingVertical: spacing(3), alignItems: 'center', marginBottom: spacing(2) },
  rerollOff: { borderColor: colors.border, backgroundColor: 'transparent' },
  rerollText: { color: colors.accent, fontFamily: fonts.display, fontSize: 15, letterSpacing: 0.3 },
  pickHint: { color: colors.textFaint, fontFamily: fonts.semibold, fontSize: 12, marginBottom: spacing(1) },
  playerList: { maxHeight: 168 },
  playerRow: { flexDirection: 'row', alignItems: 'center', gap: spacing(2), paddingVertical: spacing(2), paddingHorizontal: spacing(3), borderRadius: radius.sm, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.surface, marginBottom: spacing(1.5) },
  playerRowOff: { opacity: 0.45, backgroundColor: 'transparent' },
  legendStar: { color: colors.amber, fontSize: 12 },
  playerName: { flex: 1, color: colors.text, fontFamily: fonts.semibold, fontSize: 14 },
  playerPos: { color: colors.textFaint, fontFamily: fonts.bold, fontSize: 11 },
  playerRating: { color: colors.accent, fontFamily: fonts.display, fontSize: 16, width: 28, textAlign: 'right' },
  readyText: { color: colors.text, fontFamily: fonts.bold, fontSize: 16, textAlign: 'center', marginTop: spacing(2) },

  diceOverlay: { position: 'absolute', top: 0, left: -spacing(5), right: -spacing(5), bottom: 0, backgroundColor: colors.bgElev, alignItems: 'center', justifyContent: 'center', zIndex: 10 },
  diceBig: { fontSize: 110 },
  diceLabel: { color: colors.textDim, fontFamily: fonts.bold, fontSize: 15, marginTop: spacing(5) },

  cpKicker: { color: colors.accent, fontFamily: fonts.extrabold, fontSize: 11, letterSpacing: 1.5, marginTop: spacing(2), textAlign: 'center' },
  cpLabel: { color: colors.text, fontFamily: fonts.display, fontSize: 24, textAlign: 'center', marginTop: spacing(1) },
  cpCard: { alignItems: 'center', marginTop: spacing(4), paddingVertical: spacing(5), borderRadius: radius.lg, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.surface },
  cpScore: { color: colors.text, fontFamily: fonts.display, fontSize: 54 },
  cpPen: { color: colors.textDim, fontFamily: fonts.semibold, fontSize: 13, marginTop: 2 },
  cpHead: { fontFamily: fonts.display, fontSize: 20, marginTop: spacing(2) },
  scorers: { flexDirection: 'row', gap: spacing(3), marginTop: spacing(4) },
  scorerCol: { flex: 1, backgroundColor: colors.surface, borderRadius: radius.md, borderWidth: 1, borderColor: colors.border, padding: spacing(3) },
  scorerColTitle: { color: colors.textFaint, fontFamily: fonts.bold, fontSize: 11, textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: spacing(2) },
  scorerLine: { color: colors.text, fontFamily: fonts.semibold, fontSize: 13, marginBottom: 3 },
  scorerLineAdv: { color: colors.textDim, fontFamily: fonts.medium, fontSize: 13, marginBottom: 3 },
  scorerNone: { color: colors.textFaint, fontFamily: fonts.regular, fontSize: 13 },
  cpBanner: { fontFamily: fonts.bold, fontSize: 15, textAlign: 'center', marginTop: spacing(4), marginBottom: spacing(2) },

  resultEmoji: { fontSize: 54, textAlign: 'center', marginTop: spacing(2) },
  resultHead: { color: colors.text, fontFamily: fonts.display, fontSize: 24, textAlign: 'center', marginTop: spacing(2) },
  resultRec: { color: colors.textDim, fontFamily: fonts.medium, fontSize: 13.5, textAlign: 'center', marginTop: spacing(1) },
  badge: { alignSelf: 'center', marginTop: spacing(3), paddingVertical: spacing(2), paddingHorizontal: spacing(4), borderRadius: radius.pill, backgroundColor: 'rgba(20,224,138,0.14)', borderWidth: 1, borderColor: colors.accent },
  badgeText: { color: colors.accent, fontFamily: fonts.display, fontSize: 14 },
  secTitle: { color: colors.accent, fontFamily: fonts.extrabold, fontSize: 12, letterSpacing: 1, textTransform: 'uppercase', marginTop: spacing(5), marginBottom: spacing(2) },
  table: { borderWidth: 1, borderColor: colors.border, borderRadius: radius.md, overflow: 'hidden', marginTop: spacing(2) },
  tableHeadRow: { flexDirection: 'row', backgroundColor: colors.surface, paddingVertical: spacing(2), paddingHorizontal: spacing(3) },
  th: { color: colors.textFaint, fontFamily: fonts.bold, fontSize: 11, width: 34, textAlign: 'center' },
  thTeam: { flex: 1, textAlign: 'left' },
  tableRow: { flexDirection: 'row', paddingVertical: spacing(2), paddingHorizontal: spacing(3), borderTopWidth: 1, borderTopColor: colors.border },
  tableRowMe: { backgroundColor: 'rgba(20,224,138,0.08)' },
  td: { color: colors.textDim, fontFamily: fonts.semibold, fontSize: 13, width: 34, textAlign: 'center' },
  tdTeam: { flex: 1, textAlign: 'left' },
  gameRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: spacing(2.5), borderBottomWidth: 1, borderBottomColor: colors.border },
  gameLabel: { color: colors.textDim, fontFamily: fonts.semibold, fontSize: 13.5 },
  koRight: { alignItems: 'flex-end' },
  gameScore: { color: colors.text, fontFamily: fonts.display, fontSize: 16 },
  penText: { color: colors.textFaint, fontFamily: fonts.medium, fontSize: 11 },
  win: { color: colors.accent },
  loss: { color: colors.live },
  ghostBtnWide: { paddingVertical: spacing(3), alignItems: 'center', alignSelf: 'stretch', marginTop: spacing(1) },
  ghostText: { color: colors.textDim, fontFamily: fonts.bold, fontSize: 14 },
});
