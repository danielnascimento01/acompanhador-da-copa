import React, { useMemo } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { Flag } from './Flag';
import { Match } from '../data/fixtures';
import { teamName } from '../data/teams';
import { knockoutResults } from '../data/bracket';
import { teamOutlook, TeamOutlook } from '../data/scenarios';
import { fonts, radius, spacing } from '../lib/theme';
import { useTheme, useThemedStyles, type ThemeTokens } from '../lib/theme-context';

/** Cor pela situação (verde=classificada, vermelho=eliminada, âmbar=em disputa/3º). */
function statusColor(o: TeamOutlook, c: ThemeTokens['c'], koEliminated: boolean): string {
  if (koEliminated) return c.live;
  if (o.guaranteedTop2) return c.accent;
  if (o.eliminatedFromTop2 && !o.canFinishThird) return c.live;
  return c.amber;
}

/**
 * Rótulo curto pro chip. `koEliminated` = perdeu um jogo do mata-mata (avançou da
 * fase de grupos mas caiu depois) → sobrepõe o "Classificada" da fase de grupos.
 * Texto no feminino (concorda com "seleção").
 */
function shortLabel(o: TeamOutlook, koEliminated: boolean): string {
  if (koEliminated) return 'Eliminada';
  if (o.guaranteedTop2) return 'Classificada';
  if (o.eliminatedFromTop2) return o.canFinishThird ? 'Via 3º' : 'Eliminada';
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
  const styles = useThemedStyles(makeStyles);
  const { c } = useTheme();
  // Seleções que perderam algum jogo do mata-mata = eliminadas (mesmo tendo se
  // classificado na fase de grupos). knockoutResults dá o perdedor de cada confronto.
  const koEliminated = useMemo(() => {
    const s = new Set<string>();
    for (const r of Object.values(knockoutResults(matches))) s.add(r.loser);
    return s;
  }, [matches]);

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
          const elim = koEliminated.has(id);
          const color = statusColor(o, c, elim);
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
              accessibilityLabel={`${isPrimary ? 'Sua seleção principal, ' : ''}${teamName(id)}: ${elim ? 'Eliminada' : o.phraseShort}`}
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
                  {shortLabel(o, elim)}
                </Text>
              </View>
            </Pressable>
          );
        })}
      </ScrollView>
    </View>
  );
}

const makeStyles = ({ c, st }: ThemeTokens) => StyleSheet.create({
  wrap: { marginBottom: spacing(4) },
  title: {
    color: c.accent,
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
    backgroundColor: c.surface,
    borderWidth: 1,
    borderColor: c.border,
    borderRadius: radius.lg,
    paddingVertical: spacing(2.5),
    paddingHorizontal: spacing(3),
  },
  chipPrimary: { backgroundColor: st.favoriteBg, borderColor: st.favoriteBorder },
  pressed: { opacity: 0.6 },
  info: { gap: 1 },
  nameRow: { flexDirection: 'row', alignItems: 'center', gap: spacing(1) },
  team: { color: c.text, fontFamily: fonts.bold, fontSize: 14 },
  teamPrimary: { color: c.accent },
  star: { color: c.amber, fontSize: 11 },
  status: { fontFamily: fonts.semibold, fontSize: 11.5 },
});
