import React, { useMemo } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { Match } from '../data/fixtures';
import { teamFlag, teamName } from '../data/teams';
import { teamOutlook, TeamOutlook } from '../data/scenarios';
import { colors, fonts, radius, spacing } from '../lib/theme';

/** Cor pela situação (verde=classificado, vermelho=eliminado, âmbar=em disputa/3º). */
function statusColor(o: TeamOutlook): string {
  if (o.guaranteedTop2) return colors.accent;
  if (o.eliminatedFromTop2 && !o.canFinishThird) return colors.live;
  return colors.amber;
}

/** Rótulo curto pro chip. */
function shortLabel(o: TeamOutlook): string {
  if (o.guaranteedTop2) return 'Classificado';
  if (o.eliminatedFromTop2) return o.canFinishThird ? 'Via 3º' : 'Eliminado';
  return `${o.rank}º Grupo ${o.group}`;
}

type Props = {
  matches: Match[];
  selected: Set<string>;
  onPressTeam?: (teamId: string) => void;
};

/**
 * Faixa "Situação das suas seleções": UMA linha horizontal de chips (rola para o
 * lado), um por seleção marcada — não polui mesmo com muitas seleções. Cada chip
 * mostra a situação 100%-provável (motor de cenários). Toca → abre o próximo jogo.
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
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.row}
      >
        {rows.map(({ id, o }) => {
          const color = statusColor(o);
          return (
            <Pressable
              key={id}
              onPress={onPressTeam ? () => onPressTeam(id) : undefined}
              disabled={!onPressTeam}
              style={({ pressed }) => [styles.chip, { borderColor: color }, pressed && styles.pressed]}
              accessibilityRole={onPressTeam ? 'button' : 'text'}
              accessibilityLabel={`${teamName(id)}: ${o.phraseShort}`}
            >
              <Text style={styles.flag}>{teamFlag(id)}</Text>
              <View>
                <Text style={styles.team} numberOfLines={1}>
                  {teamName(id)}
                </Text>
                <Text style={[styles.status, { color }]} numberOfLines={1}>
                  {shortLabel(o)}
                </Text>
              </View>
            </Pressable>
          );
        })}
      </ScrollView>
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
  row: { gap: spacing(2), paddingRight: spacing(2) },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing(2),
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderRadius: radius.md,
    paddingVertical: spacing(2),
    paddingHorizontal: spacing(3),
  },
  pressed: { opacity: 0.6 },
  flag: { fontSize: 22 },
  team: { color: colors.text, fontFamily: fonts.bold, fontSize: 13 },
  status: { fontFamily: fonts.semibold, fontSize: 11.5, marginTop: 1 },
});
