import React, { useMemo } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { Flag } from './Flag';
import { Match } from '../data/fixtures';
import { teamName } from '../data/teams';
import { teamOutlook, TeamOutlook } from '../data/scenarios';
import { colors, fonts, radius, spacing, state } from '../lib/theme';

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
  primaryTeam?: string | null;
  onPressTeam?: (teamId: string) => void;
};

/**
 * Faixa "Situação das suas seleções": UMA linha horizontal de chips (rola para o
 * lado), um por seleção marcada — não polui mesmo com muitas seleções. Cada chip
 * mostra a situação 100%-provável (motor de cenários). Toca → abre o próximo jogo.
 * A seleção PRINCIPAL (modo "minha seleção") vem primeiro, com ⭐ e destaque.
 */
export function TeamStatusBanner({ matches, selected, primaryTeam, onPressTeam }: Props) {
  const rows = useMemo(
    () =>
      [...selected]
        .map((id) => ({ id, o: teamOutlook(matches, id) }))
        .filter((x): x is { id: string; o: TeamOutlook } => !!x.o)
        // seleção principal primeiro
        .sort((a, b) => (a.id === primaryTeam ? -1 : b.id === primaryTeam ? 1 : 0)),
    [matches, selected, primaryTeam],
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
          const isPrimary = id === primaryTeam;
          return (
            <Pressable
              key={id}
              onPress={onPressTeam ? () => onPressTeam(id) : undefined}
              disabled={!onPressTeam}
              style={({ pressed }) => [
                styles.chip,
                isPrimary && styles.chipPrimary,
                pressed && styles.pressed,
              ]}
              accessibilityRole={onPressTeam ? 'button' : 'text'}
              accessibilityLabel={`${isPrimary ? 'Sua seleção principal, ' : ''}${teamName(id)}: ${o.phraseShort}`}
            >
              <Flag teamId={id} size={32} />
              <View style={styles.info}>
                <View style={styles.nameRow}>
                  <Text style={[styles.team, isPrimary && styles.teamPrimary]} numberOfLines={1}>
                    {teamName(id)}
                  </Text>
                  {isPrimary && <Text style={styles.star}>★</Text>}
                </View>
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
    color: colors.accent,
    fontFamily: fonts.extrabold,
    fontSize: 12,
    letterSpacing: 1.2,
    textTransform: 'uppercase',
    marginBottom: spacing(2.5),
  },
  row: { gap: spacing(2.5), paddingRight: spacing(2) },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing(2.5),
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.lg,
    paddingVertical: spacing(2.5),
    paddingHorizontal: spacing(3),
  },
  chipPrimary: { backgroundColor: state.favoriteBg, borderColor: state.favoriteBorder },
  pressed: { opacity: 0.6 },
  info: { gap: 1 },
  nameRow: { flexDirection: 'row', alignItems: 'center', gap: spacing(1) },
  team: { color: colors.text, fontFamily: fonts.bold, fontSize: 14 },
  teamPrimary: { color: colors.accent },
  star: { color: colors.amber, fontSize: 11 },
  status: { fontFamily: fonts.semibold, fontSize: 11.5 },
});
