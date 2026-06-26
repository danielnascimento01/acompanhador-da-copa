import React, { useMemo, useRef, useState } from 'react';
import { Modal, Pressable, ScrollView, Share, StyleSheet, Text, View } from 'react-native';

import {
  FORMATIONS, TACTICS, dataCounts, rollSquad, slotsFor, squadKey,
} from '../data/draft/data';
import { calcForces, simulateCampaign } from '../data/draft/engine';
import type { CampaignResult, FormationKey, Mode, Player, Slot, Squad, Tactic } from '../data/draft/types';
import { colors, fonts, radius, spacing } from '../lib/theme';

const APP_LINK = 'https://play.google.com/store/apps/details?id=com.danielnascimento.copa2026';
const TACTIC_LABEL: Record<Tactic, string> = { defensivo: 'Defensivo', equilibrado: 'Equilibrado', ofensivo: 'Ofensivo' };
const CHIP = 52;

type Phase = 'setup' | 'draft' | 'result';

function makeSeed(): string {
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
}

export function DadoDeCraque({ visible, onClose }: { visible: boolean; onClose: () => void }) {
  const [phase, setPhase] = useState<Phase>('setup');
  const [formation, setFormation] = useState<FormationKey>('4-3-3');
  const [tactic, setTactic] = useState<Tactic>('equilibrado');
  const [mode, setMode] = useState<Mode>('classico');

  const [seed, setSeed] = useState('');
  const [slots, setSlots] = useState<Slot[]>([]);
  const [picks, setPicks] = useState<(Player | null)[]>([]);
  const [current, setCurrent] = useState<Squad | null>(null);
  const [rerolls, setRerolls] = useState(3);
  const [result, setResult] = useState<CampaignResult | null>(null);

  const usedRef = useRef<Set<string>>(new Set());
  const attemptRef = useRef(0);

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
    setRerolls(mode === 'almanaque' ? 1 : 3);
    setResult(null);
    // primeiro elenco
    attemptRef.current = 1;
    setCurrent(rollSquad(`${s}:a1`, 0));
    setPhase('draft');
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
    const newFilled = np.filter(Boolean).length;
    setPicks(np);
    setCurrent(newFilled < np.length ? freshSquad(newFilled) : null);
  };

  const reroll = () => {
    if (rerolls <= 0 || !current) return;
    setRerolls((r) => r - 1);
    setCurrent(freshSquad(filled, squadKey(current)));
  };

  const skipSquad = () => {
    if (!current) return;
    setCurrent(freshSquad(filled, squadKey(current)));
  };

  const simulate = () => {
    setResult(simulateCampaign(calcForces(slots, picks), seed));
    setPhase('result');
  };

  const shareResult = () => {
    if (!result) return;
    const tag = result.perfect ? ' — 7 A 0! 🏆' : result.champion ? ' — CAMPEÃO! 🏆' : '';
    Share.share({
      message: `🎲 No Dado de Craque, montei meu time e fechei a Copa em ${result.record}${tag}! Monta o seu e tenta superar — Acompanhador da Copa 2026:\n${APP_LINK}`,
    }).catch(() => {});
  };

  const reset = () => {
    setPhase('setup');
    setResult(null);
    setCurrent(null);
  };

  const currentPickable = current ? current.players.filter(pickable) : [];
  const noneFits = !!current && currentPickable.length === 0 && filled < slots.length;

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
                <Text style={styles.bold}> 7 a 0</Text> (vencer os 7 jogos da Copa).
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

              {filled < slots.length ? (
                <View style={styles.draftBottom}>
                  <View style={styles.squadHead}>
                    <Text style={styles.squadTitle}>🎲 {current?.name} {current?.year}</Text>
                    <Text style={styles.rerollInfo}>{rerolls} re-sorteio{rerolls === 1 ? '' : 's'}</Text>
                  </View>
                  {noneFits ? (
                    <Text style={styles.noFit}>Nenhum jogador deste elenco encaixa nas vagas restantes.</Text>
                  ) : null}
                  <ScrollView style={styles.playerList} showsVerticalScrollIndicator={false}>
                    {current?.players.map((p) => {
                      const ok = pickable(p);
                      return (
                        <Pressable
                          key={p.id}
                          onPress={() => pick(p)}
                          disabled={!ok}
                          style={[styles.playerRow, !ok && styles.playerRowOff]}
                          accessibilityRole="button"
                          accessibilityLabel={`Escalar ${p.name}`}
                        >
                          {p.legend && <Text style={styles.legendStar}>★</Text>}
                          <Text style={[styles.playerName, !ok && styles.dim]} numberOfLines={1}>{p.name}</Text>
                          <Text style={[styles.playerPos, !ok && styles.dim]}>{p.pos.join('/')}</Text>
                          {showStats && <Text style={[styles.playerRating, !ok && styles.dim]}>{p.rating}</Text>}
                        </Pressable>
                      );
                    })}
                  </ScrollView>
                  <View style={styles.draftBtns}>
                    {noneFits ? (
                      <Pressable style={styles.ghostBtn} onPress={skipSquad} accessibilityRole="button" accessibilityLabel="Sortear outro elenco">
                        <Text style={styles.ghostText}>🎲 Sortear outro</Text>
                      </Pressable>
                    ) : (
                      <Pressable style={[styles.ghostBtn, rerolls <= 0 && styles.ghostOff]} onPress={reroll} disabled={rerolls <= 0} accessibilityRole="button" accessibilityLabel="Re-sortear o elenco">
                        <Text style={[styles.ghostText, rerolls <= 0 && styles.dim]}>🔄 Re-sortear ({rerolls})</Text>
                      </Pressable>
                    )}
                  </View>
                </View>
              ) : (
                <View style={styles.draftBottom}>
                  <Text style={styles.readyText}>Time completo! Hora da verdade. 🏆</Text>
                  <Pressable style={styles.primaryBtn} onPress={simulate} accessibilityRole="button" accessibilityLabel="Simular a campanha">
                    <Text style={styles.primaryText}>⚡ Simular a Copa</Text>
                  </Pressable>
                </View>
              )}
            </View>
          )}

          {phase === 'result' && result && (
            <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: spacing(8) }}>
              <Text style={styles.resultEmoji}>{result.perfect ? '🏆' : result.champion ? '🥇' : result.group.advanced ? '💪' : '😕'}</Text>
              <Text style={styles.resultHead}>
                {result.perfect ? '7 A 0! CAMPANHA PERFEITA' : result.champion ? 'CAMPEÃO DO MUNDO!' : result.group.advanced ? `Caiu nas ${result.eliminatedAt === 'OITAVAS' ? 'Oitavas' : result.eliminatedAt === 'QUARTAS' ? 'Quartas' : result.eliminatedAt === 'SEMI' ? 'Semis' : 'fases finais'}` : 'Eliminado na fase de grupos'}
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
                    <Text style={[styles.td, styles.tdTeam, r.isMe && styles.bold]} numberOfLines={1}>{i + 1}. {r.isMe ? 'Seu time' : r.name}</Text>
                    <Text style={styles.td}>{r.P}</Text>
                    <Text style={styles.td}>{r.GD > 0 ? `+${r.GD}` : r.GD}</Text>
                    <Text style={[styles.td, styles.bold]}>{r.Pts}</Text>
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
                    {k.penalties && <Text style={styles.penText}>{k.penalties.meWin ? 'venceu nos pênaltis' : 'perdeu nos pênaltis'}</Text>}
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

const pct = (n: number) => `${n}%` as `${number}%`;

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
              <Text style={[styles.slotChipText, p && styles.slotChipTextOn]} numberOfLines={1}>
                {p ? (showStats ? p.rating : '✓') : s.pos}
              </Text>
            </View>
            <Text style={styles.slotName} numberOfLines={1}>{p ? lastName(p.name) : s.pos}</Text>
          </View>
        );
      })}
    </View>
  );
}

function lastName(name: string): string {
  const parts = name.trim().split(' ');
  return parts.length > 1 ? parts[parts.length - 1] : name;
}

const styles = StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'flex-end' },
  dismiss: { flex: 1 },
  sheet: { backgroundColor: colors.bgElev, borderTopLeftRadius: radius.xl, borderTopRightRadius: radius.xl, borderTopWidth: 1, borderColor: colors.border, paddingHorizontal: spacing(5), paddingTop: spacing(3), height: '92%' },
  grabber: { width: 44, height: 5, borderRadius: 3, backgroundColor: colors.borderBright, alignSelf: 'center', marginBottom: spacing(3) },
  close: { position: 'absolute', top: spacing(4), right: spacing(5), zIndex: 2 },
  closeText: { color: colors.textDim, fontFamily: fonts.bold, fontSize: 18 },
  flex1: { flex: 1 },
  bold: { fontFamily: fonts.bold, color: colors.text },
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
  primaryBtn: { backgroundColor: colors.accent, borderRadius: radius.md, paddingVertical: spacing(4), alignItems: 'center', alignSelf: 'stretch', marginTop: spacing(5) },
  primaryText: { color: colors.ink, fontFamily: fonts.display, fontSize: 17, letterSpacing: 0.5 },

  hudRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: spacing(1) },
  hudText: { color: colors.textDim, fontFamily: fonts.bold, fontSize: 12.5 },
  forcesRow: { flexDirection: 'row', justifyContent: 'center', gap: spacing(5), marginBottom: spacing(2) },
  forceItem: { color: colors.textFaint, fontFamily: fonts.bold, fontSize: 12 },
  forceVal: { color: colors.accent, fontFamily: fonts.display, fontSize: 15 },

  pitch: { height: 280, borderRadius: radius.lg, backgroundColor: '#0f3d22', borderWidth: 1, borderColor: 'rgba(255,255,255,0.12)', overflow: 'hidden' },
  pitchLine: { position: 'absolute', top: '50%', left: 0, right: 0, height: 1, backgroundColor: 'rgba(255,255,255,0.12)' },
  pitchCircle: { position: 'absolute', alignSelf: 'center', top: '50%', width: 70, height: 70, borderRadius: 35, borderWidth: 1, borderColor: 'rgba(255,255,255,0.12)', marginTop: -35 },
  slotWrap: { position: 'absolute', width: CHIP, marginLeft: -CHIP / 2, marginTop: -CHIP / 2, alignItems: 'center' },
  slotChip: { width: 34, height: 34, borderRadius: 17, borderWidth: 1.5, borderColor: 'rgba(255,255,255,0.35)', backgroundColor: 'rgba(0,0,0,0.3)', alignItems: 'center', justifyContent: 'center' },
  slotChipOn: { borderColor: colors.accent, backgroundColor: colors.accent },
  slotChipText: { color: 'rgba(255,255,255,0.7)', fontFamily: fonts.extrabold, fontSize: 12 },
  slotChipTextOn: { color: colors.ink },
  slotName: { color: '#fff', fontFamily: fonts.semibold, fontSize: 9.5, marginTop: 2, textShadowColor: 'rgba(0,0,0,0.7)', textShadowRadius: 3 },

  draftBottom: { flex: 1, marginTop: spacing(3) },
  squadHead: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: spacing(2) },
  squadTitle: { color: colors.text, fontFamily: fonts.display, fontSize: 18 },
  rerollInfo: { color: colors.textFaint, fontFamily: fonts.bold, fontSize: 12 },
  noFit: { color: colors.amber, fontFamily: fonts.semibold, fontSize: 12.5, marginBottom: spacing(2) },
  playerList: { flex: 1 },
  playerRow: { flexDirection: 'row', alignItems: 'center', gap: spacing(2), paddingVertical: spacing(2.5), paddingHorizontal: spacing(3), borderRadius: radius.sm, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.surface, marginBottom: spacing(1.5) },
  playerRowOff: { opacity: 0.5, backgroundColor: 'transparent' },
  legendStar: { color: colors.amber, fontSize: 12 },
  playerName: { flex: 1, color: colors.text, fontFamily: fonts.semibold, fontSize: 14 },
  playerPos: { color: colors.textFaint, fontFamily: fonts.bold, fontSize: 11 },
  playerRating: { color: colors.accent, fontFamily: fonts.display, fontSize: 16, width: 28, textAlign: 'right' },
  draftBtns: { flexDirection: 'row', gap: spacing(2), marginTop: spacing(2) },
  ghostBtn: { flex: 1, paddingVertical: spacing(3), borderRadius: radius.md, borderWidth: 1, borderColor: colors.border, alignItems: 'center' },
  ghostOff: { opacity: 0.5 },
  ghostText: { color: colors.textDim, fontFamily: fonts.bold, fontSize: 14 },
  readyText: { color: colors.text, fontFamily: fonts.bold, fontSize: 16, textAlign: 'center', marginTop: spacing(2) },

  resultEmoji: { fontSize: 54, textAlign: 'center', marginTop: spacing(2) },
  resultHead: { color: colors.text, fontFamily: fonts.display, fontSize: 24, textAlign: 'center', marginTop: spacing(2) },
  resultRec: { color: colors.textDim, fontFamily: fonts.medium, fontSize: 13.5, textAlign: 'center', marginTop: spacing(1) },
  badge: { alignSelf: 'center', marginTop: spacing(3), paddingVertical: spacing(2), paddingHorizontal: spacing(4), borderRadius: radius.pill, backgroundColor: 'rgba(20,224,138,0.14)', borderWidth: 1, borderColor: colors.accent },
  badgeText: { color: colors.accent, fontFamily: fonts.display, fontSize: 14 },
  secTitle: { color: colors.accent, fontFamily: fonts.extrabold, fontSize: 12, letterSpacing: 1, textTransform: 'uppercase', marginTop: spacing(5), marginBottom: spacing(2) },
  table: { borderWidth: 1, borderColor: colors.border, borderRadius: radius.md, overflow: 'hidden' },
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
});
