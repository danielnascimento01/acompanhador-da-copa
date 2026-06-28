import React, { useMemo, useRef, useState } from 'react';
import { Modal, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { Flag } from '../components/Flag';
import { teamName } from '../data/teams';
import { BRACKET, STAGE_META, Slot, StageKey, groupPositions, knockoutResults, resolveSlot, slotLabel, type KnockoutResults } from '../data/bracket';
import { bestThirds, ThirdRow } from '../data/bestThirds';
import { Match, hasStarted, isLive } from '../data/fixtures';
import { formatDayShort, formatTime } from '../lib/format';
import { useStore } from '../lib/store';
import { MatchDetailSheet } from './MatchDetailSheet';

/** Data + hora do jogo no fuso do aparelho (ex.: "dom., 28/06 · 16:00"). */
function whenLabel(utc: string): string {
  const d = new Date(utc);
  return `${formatDayShort(d)} · ${formatTime(d)}`;
}
import { fonts, radius, spacing } from '../lib/theme';
import { useThemedStyles, type ThemeTokens } from '../lib/theme-context';

/** Abas de rodada no topo. A disputa de 3º lugar entra junto da aba "Final". */
const STAGE_TABS = STAGE_META.filter((s) => s.key !== 'third');

/**
 * "Caminho até a final" — chave OFICIAL do mata-mata (jogos 73–104). Mostra qual
 * colocado de qual grupo pega quem. Os vencedores/2º aparecem conforme os grupos
 * terminam (com certeza matemática); os "melhores terceiros" e as fases seguintes
 * ficam como rótulo até a definição oficial. Nunca inventa um confronto.
 */
export function BracketSheet({ visible, onClose }: { visible: boolean; onClose: () => void }) {
  const styles = useThemedStyles(makeStyles);
  const { matches, selected } = useStore();
  const positions = useMemo(() => groupPositions(matches), [matches]);
  // Vencedores/perdedores confirmados de cada confronto (cascata 16-avos→final)
  // — preenche os slots "Vencedor 16-avos J3" com o time real assim que decide.
  const results = useMemo(() => knockoutResults(matches), [matches]);
  const thirds = useMemo(() => bestThirds(matches), [matches]);
  // Os jogos do mata-mata já vêm em `matches` (com placar/status ao vivo da ESPN),
  // indexados pelo MESMO id da chave (ex.: "r32-1"). Achamos o jogo "vivo" por id
  // para abrir o detalhe completo (lance a lance, escalações, onde assistir…).
  const liveById = useMemo(() => new Map(matches.map((m) => [m.id, m])), [matches]);
  const [detail, setDetail] = useState<Match | null>(null);

  const resolved = useMemo(() => {
    let n = 0;
    for (const m of BRACKET) {
      if (resolveSlot(m.a, positions, results)) n++;
      if (resolveSlot(m.b, positions, results)) n++;
    }
    return n;
  }, [positions, results]);

  // Aba de rodada ativa — o mata-mata vira navegável por fase (toque no botão).
  const [activeStage, setActiveStage] = useState<StageKey>('r32');
  const contentRef = useRef<ScrollView>(null);
  const selectStage = (key: StageKey) => {
    setActiveStage(key);
    contentRef.current?.scrollTo({ y: 0, animated: false }); // volta ao topo da fase
  };
  // Fases exibidas: a "Final" mostra também a disputa de 3º lugar.
  const stagesToShow: StageKey[] = activeStage === 'final' ? ['final', 'third'] : [activeStage];

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <View style={styles.backdrop}>
        <Pressable style={styles.dismiss} onPress={onClose} accessibilityLabel="Fechar" />
        <View style={styles.sheet}>
          <View style={styles.grabber} />
          <Pressable style={styles.close} onPress={onClose} accessibilityRole="button" accessibilityLabel="Fechar" hitSlop={10}>
            <Text style={styles.closeText}>✕</Text>
          </Pressable>

          <Text style={styles.title}>Caminho até a final</Text>
          <Text style={styles.sub}>Quem pega quem, do mata-mata à final</Text>

          {/* Abas de rodada — toque para ir direto à fase */}
          <View>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              style={styles.tabsRow}
              contentContainerStyle={styles.tabsContent}
            >
              {STAGE_TABS.map((t) => {
                const active = activeStage === t.key;
                return (
                  <Pressable
                    key={t.key}
                    onPress={() => selectStage(t.key)}
                    accessibilityRole="button"
                    accessibilityState={{ selected: active }}
                    accessibilityLabel={t.name}
                    style={[styles.tab, active && styles.tabActive]}
                  >
                    <Text style={[styles.tabText, active && styles.tabTextActive]} numberOfLines={1}>
                      {t.abbrev}
                    </Text>
                  </Pressable>
                );
              })}
            </ScrollView>
          </View>

          <ScrollView ref={contentRef} showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: spacing(8) }}>
            <View style={styles.banner}>
              <Text style={styles.bannerText}>
                {resolved === 0
                  ? 'As seleções aparecem aqui conforme se classificam. Os "melhores terceiros" e as fases seguintes preenchem com a definição oficial — nunca um confronto chutado.'
                  : `${resolved} ${resolved === 1 ? 'vaga já definida' : 'vagas já definidas'}. O resto preenche conforme os grupos terminam.`}
              </Text>
            </View>

            {/* Os melhores terceiros só fazem sentido na 1ª fase do mata-mata. */}
            {activeStage === 'r32' && <BestThirdsBlock result={thirds} selected={selected} />}

            {stagesToShow.map((stageKey) => {
              const stage = STAGE_META.find((s) => s.key === stageKey)!;
              return (
                <View key={stage.key} style={styles.stageBlock}>
                  <Text style={styles.stageName}>{stage.name}</Text>
                  {BRACKET.filter((m) => m.stage === stage.key).map((m) => {
                    const live = liveById.get(m.id);
                    const started = live ? hasStarted(live) : false;
                    const liveNow = live ? isLive(live) : false;
                    return (
                      <Pressable
                        key={m.id}
                        onPress={() => live && setDetail(live)}
                        disabled={!live}
                        accessibilityRole={live ? 'button' : undefined}
                        accessibilityLabel={live ? 'Abrir detalhes do jogo' : undefined}
                        style={({ pressed }) => [
                          styles.match,
                          stage.key === 'final' && styles.matchFinal,
                          pressed && live && styles.matchPressed,
                        ]}
                      >
                        <View style={styles.matchHead}>
                          <Text style={styles.matchN}>
                            {stage.key === 'third' || stage.key === 'final' ? stage.name : `Jogo ${m.idx}`}
                          </Text>
                          {liveNow ? (
                            <Text style={styles.matchLive}>● AO VIVO</Text>
                          ) : (
                            <Text style={styles.matchDate}>{whenLabel(m.utc)}</Text>
                          )}
                        </View>
                        <SlotView slot={m.a} positions={positions} results={results} selected={selected} score={started ? live?.homeScore : null} />
                        <Text style={styles.vs}>×</Text>
                        <SlotView slot={m.b} positions={positions} results={results} selected={selected} score={started ? live?.awayScore : null} />
                        {live ? <Text style={styles.matchTap}>Toque para ver lance a lance, escalações e mais ›</Text> : null}
                      </Pressable>
                    );
                  })}
                </View>
              );
            })}

            <Text style={styles.footer}>
              Estrutura oficial (jogos 73–104). Avançam os 2 primeiros de cada grupo + os 8 melhores
              terceiros.
            </Text>
          </ScrollView>
        </View>
      </View>

      {/* Detalhe completo do jogo do mata-mata (lance a lance, escalações, onde
          assistir, anúncios…) — abre por cima da chave ao tocar num confronto. */}
      <MatchDetailSheet
        match={detail ? (liveById.get(detail.id) ?? detail) : null}
        matches={matches}
        selected={selected}
        onClose={() => setDetail(null)}
      />
    </Modal>
  );
}

/**
 * Calculadora dos 8 melhores terceiros — a parte do formato de 48 que "ninguém
 * mostra direito". Ranqueia os 12 terceiros e marca quem avança, SEM nunca chutar:
 * empate na fronteira 8/9 vira "disputa"; grupos em andamento ficam provisórios.
 */
function BestThirdsBlock({ result, selected }: { result: ReturnType<typeof bestThirds>; selected: Set<string> }) {
  const styles = useThemedStyles(makeStyles);
  return (
    <View style={styles.thirdsBlock}>
      <Text style={styles.stageName}>Os 8 melhores terceiros</Text>
      <Text style={styles.thirdsCriterio}>
        Avançam os 8 melhores 3ºs entre os 12 grupos. Critério: 1) pontos · 2) saldo de gols · 3) gols
        marcados · depois fair-play e sorteio.
      </Text>
      <View style={[styles.thirdsNote, result.definitive && styles.thirdsNoteOk]}>
        <Text style={[styles.thirdsNoteText, result.definitive && styles.thirdsNoteTextOk]}>{result.note}</Text>
      </View>

      {result.rows.map((row, i) => (
        <React.Fragment key={row.group}>
          {i === 8 && <View style={styles.thirdsCut} />}
          <ThirdRowView row={row} selected={selected} />
        </React.Fragment>
      ))}
    </View>
  );
}

function ThirdRowView({ row, selected }: { row: ThirdRow; selected: Set<string> }) {
  const styles = useThemedStyles(makeStyles);
  const fav = row.played > 0 && selected.has(row.teamId);
  const status =
    row.qualifies === 'in'
      ? { label: 'avança', style: styles.pillIn, text: styles.pillInText }
      : row.qualifies === 'tie'
        ? { label: 'disputa', style: styles.pillTie, text: styles.pillTieText }
        : { label: 'fora', style: styles.pillOut, text: styles.pillOutText };
  const gd = row.gd > 0 ? `+${row.gd}` : `${row.gd}`;
  return (
    <View style={[styles.thirdRow, row.qualifies === 'in' && styles.thirdRowIn, fav && styles.thirdRowFav]}>
      <Text style={[styles.thirdRank, row.qualifies === 'in' && styles.thirdRankIn]}>{row.rank}º</Text>
      <View style={styles.thirdGroupTag}>
        <Text style={styles.thirdGroupTagText}>{row.group}</Text>
      </View>
      {row.played > 0 ? (
        <>
          <Flag teamId={row.teamId} size={24} radius={7} />
          <Text style={[styles.thirdName, fav && styles.thirdNameFav]} numberOfLines={1}>
            {teamName(row.teamId)}
            {!row.locked ? <Text style={styles.thirdProv}>  · parcial</Text> : null}
          </Text>
        </>
      ) : (
        <Text style={styles.thirdName} numberOfLines={1}>
          3º do Grupo {row.group} <Text style={styles.thirdProv}>· a definir</Text>
        </Text>
      )}
      <Text style={styles.thirdStats}>
        {row.points} pt{row.points === 1 ? '' : 's'} · SG {gd} · G {row.gf}
      </Text>
      <View style={[styles.pill, status.style]}>
        <Text style={[styles.pillText, status.text]}>{status.label}</Text>
      </View>
    </View>
  );
}

function SlotView({
  slot,
  positions,
  results,
  selected,
  score,
}: {
  slot: Slot;
  positions: Record<string, { first?: string; second?: string }>;
  results: KnockoutResults;
  selected: Set<string>;
  score?: number | null;
}) {
  const styles = useThemedStyles(makeStyles);
  const teamId = resolveSlot(slot, positions, results);
  if (teamId) {
    const fav = selected.has(teamId);
    return (
      <View style={[styles.slot, styles.slotResolved, fav && styles.slotFav]}>
        <Flag teamId={teamId} size={22} radius={6} />
        <Text style={[styles.slotTeam, fav && styles.slotTeamFav]} numberOfLines={1}>
          {teamName(teamId)}
        </Text>
        {score != null ? <Text style={styles.slotScore}>{score}</Text> : null}
      </View>
    );
  }
  return (
    <View style={styles.slot}>
      <Text style={styles.slotLabel} numberOfLines={1}>
        {slotLabel(slot)}
      </Text>
    </View>
  );
}

const makeStyles = ({ c }: ThemeTokens) => StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'flex-end' },
  dismiss: { flex: 1 },
  sheet: {
    backgroundColor: c.bgElev,
    borderTopLeftRadius: radius.xl,
    borderTopRightRadius: radius.xl,
    borderTopWidth: 1,
    borderColor: c.border,
    paddingHorizontal: spacing(5),
    paddingTop: spacing(3),
    maxHeight: '90%',
  },
  grabber: { width: 44, height: 5, borderRadius: 3, backgroundColor: c.borderBright, alignSelf: 'center', marginBottom: spacing(3) },
  close: { position: 'absolute', top: spacing(4), right: spacing(5), zIndex: 2 },
  closeText: { color: c.textDim, fontFamily: fonts.bold, fontSize: 18 },
  title: { color: c.text, fontFamily: fonts.display, fontSize: 28 },
  sub: { color: c.textDim, fontFamily: fonts.medium, fontSize: 13, marginBottom: spacing(3) },
  tabsRow: { flexGrow: 0, marginBottom: spacing(4) },
  tabsContent: { gap: spacing(2), paddingRight: spacing(4) },
  tab: {
    paddingHorizontal: spacing(4),
    paddingVertical: spacing(2),
    borderRadius: radius.pill,
    backgroundColor: c.surface2,
    borderWidth: 1,
    borderColor: c.border,
  },
  tabActive: { backgroundColor: c.accent, borderColor: c.accent },
  tabText: { color: c.textDim, fontFamily: fonts.bold, fontSize: 13 },
  tabTextActive: { color: c.ink },
  banner: {
    backgroundColor: 'rgba(21,194,214,0.10)',
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: 'rgba(21,194,214,0.30)',
    padding: spacing(3),
    marginBottom: spacing(4),
  },
  bannerText: { color: c.textDim, fontFamily: fonts.regular, fontSize: 13, lineHeight: 19 },
  stageBlock: { marginBottom: spacing(4) },
  stageName: {
    color: c.accent,
    fontFamily: fonts.extrabold,
    fontSize: 13,
    letterSpacing: 0.5,
    textTransform: 'uppercase',
    marginBottom: spacing(2),
  },
  match: {
    backgroundColor: c.surface,
    borderWidth: 1,
    borderColor: c.border,
    borderRadius: radius.md,
    padding: spacing(3),
    marginBottom: spacing(2),
  },
  matchFinal: { borderColor: c.accent, backgroundColor: 'rgba(20,224,138,0.06)' },
  matchPressed: { opacity: 0.6 },
  matchHead: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: spacing(2) },
  matchN: { color: c.textFaint, fontFamily: fonts.bold, fontSize: 11, letterSpacing: 0.3 },
  matchDate: { color: c.textFaint, fontFamily: fonts.semibold, fontSize: 11 },
  matchLive: { color: c.accent, fontFamily: fonts.extrabold, fontSize: 11, letterSpacing: 0.3 },
  matchTap: { color: c.accent, fontFamily: fonts.semibold, fontSize: 11, marginTop: spacing(2), textAlign: 'center' },
  slot: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing(2),
    backgroundColor: c.surface2,
    borderRadius: radius.sm,
    paddingVertical: spacing(2),
    paddingHorizontal: spacing(3),
    minHeight: 38,
  },
  slotResolved: { backgroundColor: c.surface2, borderWidth: 1, borderColor: c.border },
  slotFav: { borderColor: c.accent, backgroundColor: 'rgba(20,224,138,0.10)' },
  slotFlag: { fontSize: 20 },
  slotTeam: { color: c.text, fontFamily: fonts.bold, fontSize: 14, flex: 1 },
  slotTeamFav: { color: c.accent },
  slotScore: { color: c.text, fontFamily: fonts.display, fontSize: 18, fontVariant: ['tabular-nums'], minWidth: 20, textAlign: 'right' },
  slotLabel: { color: c.textDim, fontFamily: fonts.semibold, fontSize: 13, flex: 1 },
  vs: { color: c.textFaint, fontFamily: fonts.bold, fontSize: 11, textAlign: 'center', paddingVertical: 3 },
  footer: { color: c.textFaint, fontFamily: fonts.regular, fontSize: 12, lineHeight: 18, marginTop: spacing(2), textAlign: 'center' },

  // Calculadora dos melhores terceiros
  thirdsBlock: { marginBottom: spacing(5) },
  thirdsCriterio: { color: c.textDim, fontFamily: fonts.regular, fontSize: 12.5, lineHeight: 18, marginBottom: spacing(2) },
  thirdsNote: {
    backgroundColor: 'rgba(255,194,51,0.10)',
    borderRadius: radius.sm,
    borderWidth: 1,
    borderColor: 'rgba(255,194,51,0.30)',
    paddingVertical: spacing(2),
    paddingHorizontal: spacing(3),
    marginBottom: spacing(3),
  },
  thirdsNoteOk: { backgroundColor: 'rgba(20,224,138,0.10)', borderColor: 'rgba(20,224,138,0.30)' },
  thirdsNoteText: { color: c.amber, fontFamily: fonts.semibold, fontSize: 12.5, lineHeight: 18 },
  thirdsNoteTextOk: { color: c.accent },
  thirdsCut: {
    height: 1,
    backgroundColor: c.accent,
    opacity: 0.5,
    marginVertical: spacing(2),
  },
  thirdRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing(2),
    backgroundColor: c.surface,
    borderWidth: 1,
    borderColor: c.border,
    borderRadius: radius.sm,
    paddingVertical: spacing(2),
    paddingHorizontal: spacing(2),
    marginBottom: 6,
    minHeight: 40,
  },
  thirdRowIn: { borderColor: 'rgba(20,224,138,0.35)', backgroundColor: 'rgba(20,224,138,0.05)' },
  thirdRowFav: { borderColor: c.accent },
  thirdRank: { color: c.textFaint, fontFamily: fonts.extrabold, fontSize: 12, width: 24, fontVariant: ['tabular-nums'] },
  thirdRankIn: { color: c.accent },
  thirdGroupTag: {
    width: 20,
    height: 20,
    borderRadius: 6,
    backgroundColor: c.surface2,
    borderWidth: 1,
    borderColor: c.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  thirdGroupTagText: { color: c.textDim, fontFamily: fonts.bold, fontSize: 11 },
  thirdFlag: { fontSize: 17 },
  thirdName: { color: c.text, fontFamily: fonts.bold, fontSize: 13.5, flex: 1 },
  thirdNameFav: { color: c.accent },
  thirdProv: { color: c.textFaint, fontFamily: fonts.regular, fontSize: 11 },
  thirdStats: { color: c.textDim, fontFamily: fonts.semibold, fontSize: 11.5, fontVariant: ['tabular-nums'] },
  pill: { borderRadius: radius.pill, paddingVertical: 2, paddingHorizontal: spacing(2), minWidth: 56, alignItems: 'center' },
  pillText: { fontFamily: fonts.bold, fontSize: 10.5, letterSpacing: 0.3, textTransform: 'uppercase' },
  pillIn: { backgroundColor: c.accent },
  pillInText: { color: c.ink },
  pillTie: { backgroundColor: 'rgba(255,194,51,0.18)', borderWidth: 1, borderColor: c.amber },
  pillTieText: { color: c.amber },
  pillOut: { backgroundColor: c.surface2 },
  pillOutText: { color: c.textFaint },
});
