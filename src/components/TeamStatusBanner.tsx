import React, { useMemo } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { Match } from '../data/fixtures';
import { teamFlag, teamName } from '../data/teams';
import { teamOutlook, TeamOutlook } from '../data/scenarios';
import { colors, fonts, radius, spacing } from '../lib/theme';

/** Cor da faixa pela situação (verde=classificado, vermelho=eliminado, âmbar=em disputa). */
function statusColor(o: TeamOutlook): string {
  if (o.guaranteedTop2) return colors.accent;
  if (o.eliminatedFromTop2 && !o.canFinishThird) return colors.live;
  return colors.amber;
}

type Props = {
  matches: Match[];
  selected: Set<string>;
  onPressTeam?: (teamId: string) => void;
};

/**
 * Faixa "Situação das suas seleções": uma linha por seleção marcada com a frase
 * de status (100% provável — vinda do motor de cenários). Só aparece quando há
 * seleções marcadas que estão na fase de grupos.
 */
export function TeamStatusBanner({ matches, selected, onPressTeam }: Props) {
  const rows = useMemo(
    () =>
      [...selected]
        .map((id) => ({ id, o: teamOutlook(matches, id) }))
        .filter((x): x is { id: string; o: TeamOutlook } => !!x.o),
    [matches, selected],
  );

  if (rows.length === 0) return null;

  return (
    <View style={styles.wrap}>
      <Text style={styles.title}>Situação das suas seleções</Text>
      {rows.map(({ id, o }) => {
        const color = statusColor(o);
        return (
          <Pressable
            key={id}
            onPress={onPressTeam ? () => onPressTeam(id) : undefined}
            disabled={!onPressTeam}
            style={({ pressed }) => [styles.row, { borderLeftColor: color }, pressed && styles.pressed]}
            accessibilityRole={onPressTeam ? 'button' : 'text'}
            accessibilityLabel={`${teamName(id)}: ${o.phraseShort}`}
          >
            <Text style={styles.flag}>{teamFlag(id)}</Text>
            <View style={styles.flex1}>
              <Text style={styles.team} numberOfLines={1}>
                {teamName(id)}
              </Text>
              <Text style={[styles.phrase, { color }]} numberOfLines={2}>
                {o.phraseShort}
              </Text>
            </View>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { marginBottom: spacing(4) },
  title: {
    color: colors.textFaint,
    fontFamily: fonts.extrabold,
    fontSize: 12,
    letterSpacing: 0.5,
    textTransform: 'uppercase',
    marginBottom: spacing(2),
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing(3),
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderLeftWidth: 3,
    borderRadius: radius.md,
    paddingVertical: spacing(2),
    paddingHorizontal: spacing(3),
    marginBottom: spacing(2),
  },
  pressed: { opacity: 0.6 },
  flag: { fontSize: 26 },
  flex1: { flex: 1 },
  team: { color: colors.text, fontFamily: fonts.bold, fontSize: 14 },
  phrase: { fontFamily: fonts.semibold, fontSize: 12.5, marginTop: 1 },
});
