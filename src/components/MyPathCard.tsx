import React, { useMemo } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { Flag } from './Flag';
import { STAGE_META, teamBracketPath, type PathLeg } from '../data/bracket';
import { teamName } from '../data/teams';
import { formatDayShort, formatTime } from '../lib/format';
import { useStore } from '../lib/store';
import { fonts, radius, spacing } from '../lib/theme';
import { useThemedStyles, type ThemeTokens } from '../lib/theme-context';

const abbrevOf = (stage: PathLeg['stage']): string => STAGE_META.find((s) => s.key === stage)?.abbrev ?? '';

/**
 * "Caminho do Hexa" (ou da seleção principal escolhida) — rota até a final: quem
 * pega quem, fase a fase, com data/hora. Some sozinho se não houver seleção
 * principal ou se ela ainda não tem entrada certa na chave (grupo indefinido).
 */
export function MyPathCard({ onPress }: { onPress: () => void }) {
  const styles = useThemedStyles(makeStyles);
  const { matches, predictions, settings } = useStore();
  const teamId = settings.primaryTeam;

  const path = useMemo(
    () => (teamId ? teamBracketPath(matches, predictions, teamId) : []),
    [matches, predictions, teamId],
  );

  if (!teamId || path.length === 0) return null;

  const lastLeg = path[path.length - 1];
  const champion = lastLeg.stage === 'final' && lastLeg.outcome === 'won';
  const eliminated = lastLeg.outcome === 'lost';
  const title = teamId === 'Brazil' ? 'Caminho do Hexa' : 'Caminho até a final';

  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={`Ver o caminho de ${teamName(teamId)} até a final`}
      style={({ pressed }) => [styles.card, pressed && styles.pressed]}
    >
      <View style={styles.head}>
        <Flag teamId={teamId} size={26} radius={7} />
        <View style={styles.headText}>
          <Text style={styles.title}>{title}</Text>
          <Text style={styles.sub}>
            {champion
              ? `${teamName(teamId)} é a CAMPEÃ 🏆`
              : eliminated
                ? `Eliminada nas ${STAGE_META.find((s) => s.key === lastLeg.stage)?.name.toLowerCase()}`
                : `Rota de ${teamName(teamId)} até a final`}
          </Text>
        </View>
      </View>

      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.legsRow}>
        {path.map((leg) => (
          <LegChip key={leg.matchId} leg={leg} />
        ))}
      </ScrollView>
    </Pressable>
  );
}

function LegChip({ leg }: { leg: PathLeg }) {
  const styles = useThemedStyles(makeStyles);
  const d = new Date(leg.utc);
  return (
    <View style={[styles.chip, leg.outcome === 'lost' && styles.chipLost, leg.outcome === 'won' && styles.chipWon]}>
      <Text style={styles.chipStage}>{abbrevOf(leg.stage)}</Text>
      {leg.opponentId ? (
        <View style={styles.chipOpp}>
          <Flag teamId={leg.opponentId} size={22} radius={6} />
          <Text style={styles.chipOppName} numberOfLines={1}>
            {teamName(leg.opponentId)}
          </Text>
        </View>
      ) : (
        <Text style={styles.chipOppLabel} numberOfLines={2}>
          {leg.opponentLabel}
        </Text>
      )}
      <Text style={styles.chipWhen}>
        {leg.outcome === 'live' ? '● AO VIVO' : leg.outcome === 'won' ? 'Venceu ✓' : leg.outcome === 'lost' ? 'Eliminada ✕' : `${formatDayShort(d)} · ${formatTime(d)}`}
      </Text>
      {leg.predicted && <Text style={styles.chipPredicted}>🎮 palpite</Text>}
    </View>
  );
}

const makeStyles = ({ c }: ThemeTokens) => StyleSheet.create({
  card: {
    backgroundColor: c.surface,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: c.accent,
    padding: spacing(4),
    marginBottom: spacing(3),
  },
  pressed: { opacity: 0.8 },
  head: { flexDirection: 'row', alignItems: 'center', gap: spacing(2), marginBottom: spacing(3) },
  headText: { flex: 1 },
  title: { color: c.text, fontFamily: fonts.extrabold, fontSize: 16 },
  sub: { color: c.textDim, fontFamily: fonts.medium, fontSize: 12.5, marginTop: 1 },
  legsRow: { gap: spacing(2), paddingRight: spacing(2) },
  chip: {
    width: 108,
    backgroundColor: c.surface2,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: c.border,
    padding: spacing(2),
    gap: 3,
  },
  chipWon: { borderColor: c.accent },
  chipLost: { borderColor: c.textFaint, opacity: 0.6 },
  chipStage: { color: c.accent, fontFamily: fonts.extrabold, fontSize: 10, letterSpacing: 0.4, textTransform: 'uppercase' },
  chipOpp: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 2 },
  chipOppName: { color: c.text, fontFamily: fonts.bold, fontSize: 12, flex: 1 },
  chipOppLabel: { color: c.textDim, fontFamily: fonts.semibold, fontSize: 11, marginTop: 2, minHeight: 28 },
  chipWhen: { color: c.textFaint, fontFamily: fonts.semibold, fontSize: 10, marginTop: 2 },
  chipPredicted: { color: '#A855F7', fontFamily: fonts.bold, fontSize: 9, marginTop: 1 },
});
