import React, { useMemo } from 'react';
import { Modal, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { teamFlag, teamName } from '../data/teams';
import { BRACKET, STAGE_META, Slot, groupPositions, resolveSlot, slotLabel } from '../data/bracket';
import { bestThirds, ThirdRow } from '../data/bestThirds';
import { formatDayShort, formatTime } from '../lib/format';
import { useStore } from '../lib/store';

/** Data + hora do jogo no fuso do aparelho (ex.: "dom., 28/06 · 16:00"). */
function whenLabel(utc: string): string {
  const d = new Date(utc);
  return `${formatDayShort(d)} · ${formatTime(d)}`;
}
import { colors, fonts, radius, spacing } from '../lib/theme';

/**
 * "Caminho até a final" — chave OFICIAL do mata-mata (jogos 73–104). Mostra qual
 * colocado de qual grupo pega quem. Os vencedores/2º aparecem conforme os grupos
 * terminam (com certeza matemática); os "melhores terceiros" e as fases seguintes
 * ficam como rótulo até a definição oficial. Nunca inventa um confronto.
 */
export function BracketSheet({ visible, onClose }: { visible: boolean; onClose: () => void }) {
  const { matches, selected } = useStore();
  const positions = useMemo(() => groupPositions(matches), [matches]);
  const thirds = useMemo(() => bestThirds(matches), [matches]);

  const resolved = useMemo(() => {
    let n = 0;
    for (const m of BRACKET) {
      if (resolveSlot(m.a, positions)) n++;
      if (resolveSlot(m.b, positions)) n++;
    }
    return n;
  }, [positions]);

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

          <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: spacing(8) }}>
            <View style={styles.banner}>
              <Text style={styles.bannerText}>
                {resolved === 0
                  ? 'As seleções aparecem aqui conforme se classificam. Os "melhores terceiros" e as fases seguintes preenchem com a definição oficial — nunca um confronto chutado.'
                  : `${resolved} ${resolved === 1 ? 'vaga já definida' : 'vagas já definidas'}. O resto preenche conforme os grupos terminam.`}
              </Text>
            </View>

            <BestThirdsBlock result={thirds} selected={selected} />

            {STAGE_META.map((stage) => (
              <View key={stage.key} style={styles.stageBlock}>
                <Text style={styles.stageName}>{stage.name}</Text>
                {BRACKET.filter((m) => m.stage === stage.key).map((m) => (
                  <View key={m.id} style={[styles.match, stage.key === 'final' && styles.matchFinal]}>
                    <View style={styles.matchHead}>
                      <Text style={styles.matchN}>
                        {stage.key === 'third' || stage.key === 'final' ? stage.name : `Jogo ${m.idx}`}
                      </Text>
                      <Text style={styles.matchDate}>{whenLabel(m.utc)}</Text>
                    </View>
                    <SlotView slot={m.a} positions={positions} selected={selected} />
                    <Text style={styles.vs}>×</Text>
                    <SlotView slot={m.b} positions={positions} selected={selected} />
                  </View>
                ))}
              </View>
            ))}

            <Text style={styles.footer}>
              Estrutura oficial (jogos 73–104). Avançam os 2 primeiros de cada grupo + os 8 melhores
              terceiros.
            </Text>
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}

/**
 * Calculadora dos 8 melhores terceiros — a parte do formato de 48 que "ninguém
 * mostra direito". Ranqueia os 12 terceiros e marca quem avança, SEM nunca chutar:
 * empate na fronteira 8/9 vira "disputa"; grupos em andamento ficam provisórios.
 */
function BestThirdsBlock({ result, selected }: { result: ReturnType<typeof bestThirds>; selected: Set<string> }) {
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
          <Text style={styles.thirdFlag}>{teamFlag(row.teamId)}</Text>
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
  selected,
}: {
  slot: Slot;
  positions: Record<string, { first?: string; second?: string }>;
  selected: Set<string>;
}) {
  const teamId = resolveSlot(slot, positions);
  if (teamId) {
    const fav = selected.has(teamId);
    return (
      <View style={[styles.slot, styles.slotResolved, fav && styles.slotFav]}>
        <Text style={styles.slotFlag}>{teamFlag(teamId)}</Text>
        <Text style={[styles.slotTeam, fav && styles.slotTeamFav]} numberOfLines={1}>
          {teamName(teamId)}
        </Text>
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

const styles = StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'flex-end' },
  dismiss: { flex: 1 },
  sheet: {
    backgroundColor: colors.bgElev,
    borderTopLeftRadius: radius.xl,
    borderTopRightRadius: radius.xl,
    borderTopWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: spacing(5),
    paddingTop: spacing(3),
    maxHeight: '90%',
  },
  grabber: { width: 44, height: 5, borderRadius: 3, backgroundColor: colors.borderBright, alignSelf: 'center', marginBottom: spacing(3) },
  close: { position: 'absolute', top: spacing(4), right: spacing(5), zIndex: 2 },
  closeText: { color: colors.textDim, fontFamily: fonts.bold, fontSize: 18 },
  title: { color: colors.text, fontFamily: fonts.display, fontSize: 28 },
  sub: { color: colors.textDim, fontFamily: fonts.medium, fontSize: 13, marginBottom: spacing(4) },
  banner: {
    backgroundColor: 'rgba(21,194,214,0.10)',
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: 'rgba(21,194,214,0.30)',
    padding: spacing(3),
    marginBottom: spacing(4),
  },
  bannerText: { color: colors.textDim, fontFamily: fonts.regular, fontSize: 13, lineHeight: 19 },
  stageBlock: { marginBottom: spacing(4) },
  stageName: {
    color: colors.accent,
    fontFamily: fonts.extrabold,
    fontSize: 13,
    letterSpacing: 0.5,
    textTransform: 'uppercase',
    marginBottom: spacing(2),
  },
  match: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    padding: spacing(3),
    marginBottom: spacing(2),
  },
  matchFinal: { borderColor: colors.accent, backgroundColor: 'rgba(20,224,138,0.06)' },
  matchHead: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: spacing(2) },
  matchN: { color: colors.textFaint, fontFamily: fonts.bold, fontSize: 11, letterSpacing: 0.3 },
  matchDate: { color: colors.textFaint, fontFamily: fonts.semibold, fontSize: 11 },
  slot: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing(2),
    backgroundColor: colors.surface2,
    borderRadius: radius.sm,
    paddingVertical: spacing(2),
    paddingHorizontal: spacing(3),
    minHeight: 38,
  },
  slotResolved: { backgroundColor: 'rgba(255,255,255,0.04)', borderWidth: 1, borderColor: colors.border },
  slotFav: { borderColor: colors.accent, backgroundColor: 'rgba(20,224,138,0.10)' },
  slotFlag: { fontSize: 20 },
  slotTeam: { color: colors.text, fontFamily: fonts.bold, fontSize: 14, flex: 1 },
  slotTeamFav: { color: colors.accent },
  slotLabel: { color: colors.textDim, fontFamily: fonts.semibold, fontSize: 13, flex: 1 },
  vs: { color: colors.textFaint, fontFamily: fonts.bold, fontSize: 11, textAlign: 'center', paddingVertical: 3 },
  footer: { color: colors.textFaint, fontFamily: fonts.regular, fontSize: 12, lineHeight: 18, marginTop: spacing(2), textAlign: 'center' },

  // Calculadora dos melhores terceiros
  thirdsBlock: { marginBottom: spacing(5) },
  thirdsCriterio: { color: colors.textDim, fontFamily: fonts.regular, fontSize: 12.5, lineHeight: 18, marginBottom: spacing(2) },
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
  thirdsNoteText: { color: colors.amber, fontFamily: fonts.semibold, fontSize: 12.5, lineHeight: 18 },
  thirdsNoteTextOk: { color: colors.accent },
  thirdsCut: {
    height: 1,
    backgroundColor: colors.accent,
    opacity: 0.5,
    marginVertical: spacing(2),
  },
  thirdRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing(2),
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.sm,
    paddingVertical: spacing(2),
    paddingHorizontal: spacing(2),
    marginBottom: 6,
    minHeight: 40,
  },
  thirdRowIn: { borderColor: 'rgba(20,224,138,0.35)', backgroundColor: 'rgba(20,224,138,0.05)' },
  thirdRowFav: { borderColor: colors.accent },
  thirdRank: { color: colors.textFaint, fontFamily: fonts.extrabold, fontSize: 12, width: 24, fontVariant: ['tabular-nums'] },
  thirdRankIn: { color: colors.accent },
  thirdGroupTag: {
    width: 20,
    height: 20,
    borderRadius: 6,
    backgroundColor: colors.surface2,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  thirdGroupTagText: { color: colors.textDim, fontFamily: fonts.bold, fontSize: 11 },
  thirdFlag: { fontSize: 17 },
  thirdName: { color: colors.text, fontFamily: fonts.bold, fontSize: 13.5, flex: 1 },
  thirdNameFav: { color: colors.accent },
  thirdProv: { color: colors.textFaint, fontFamily: fonts.regular, fontSize: 11 },
  thirdStats: { color: colors.textDim, fontFamily: fonts.semibold, fontSize: 11.5, fontVariant: ['tabular-nums'] },
  pill: { borderRadius: radius.pill, paddingVertical: 2, paddingHorizontal: spacing(2), minWidth: 56, alignItems: 'center' },
  pillText: { fontFamily: fonts.bold, fontSize: 10.5, letterSpacing: 0.3, textTransform: 'uppercase' },
  pillIn: { backgroundColor: colors.accent },
  pillInText: { color: colors.ink },
  pillTie: { backgroundColor: 'rgba(255,194,51,0.18)', borderWidth: 1, borderColor: colors.amber },
  pillTieText: { color: colors.amber },
  pillOut: { backgroundColor: colors.surface2 },
  pillOutText: { color: colors.textFaint },
});
