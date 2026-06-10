import React from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { Standing } from '../data/standings';
import { teamFlag, teamName } from '../data/teams';
import { colors, fonts, radius, spacing } from '../lib/theme';

type Props = {
  standings: Standing[];
  selected?: Set<string>;
};

const NUM_COLS: { key: keyof Standing; label: string }[] = [
  { key: 'played', label: 'J' },
  { key: 'win', label: 'V' },
  { key: 'draw', label: 'E' },
  { key: 'loss', label: 'D' },
  { key: 'gd', label: 'SG' },
  { key: 'points', label: 'P' },
];

/** Cor da posição: 1º-2º classificam direto, 3º disputa as melhores vagas. */
function rankColor(index: number): string {
  if (index < 2) return colors.accent;
  if (index === 2) return colors.amber;
  return colors.textFaint;
}

export function StandingsTable({ standings, selected }: Props) {
  return (
    <View>
      <View style={styles.headerRow}>
        <Text style={styles.posHead}>#</Text>
        <Text style={styles.teamHead}>Time</Text>
        {NUM_COLS.map((c) => (
          <Text key={c.key} style={[styles.num, styles.numHead]}>
            {c.label}
          </Text>
        ))}
      </View>

      {standings.map((s, i) => {
        const mine = selected?.has(s.teamId);
        return (
          <View key={s.teamId} style={[styles.row, i < standings.length - 1 && styles.rowBorder]}>
            <View style={[styles.posWrap, { backgroundColor: rankColor(i) }]}>
              <Text style={styles.pos}>{i + 1}</Text>
            </View>
            <Text style={styles.flag}>{teamFlag(s.teamId)}</Text>
            <Text style={[styles.team, mine && styles.teamMine]} numberOfLines={1}>
              {teamName(s.teamId)}
            </Text>
            {NUM_COLS.map((c) => (
              <Text
                key={c.key}
                style={[
                  styles.num,
                  c.key === 'points' && styles.points,
                  c.key === 'gd' && { color: s.gd > 0 ? colors.accent : s.gd < 0 ? colors.live : colors.textDim },
                ]}
              >
                {c.key === 'gd' && s.gd > 0 ? `+${s.gd}` : String(s[c.key])}
              </Text>
            ))}
          </View>
        );
      })}
    </View>
  );
}

const NUM_W = 24;

const styles = StyleSheet.create({
  headerRow: { flexDirection: 'row', alignItems: 'center', paddingBottom: spacing(2), gap: 2 },
  posHead: { width: 22, color: colors.textFaint, fontFamily: fonts.bold, fontSize: 10, textAlign: 'center' },
  teamHead: { flex: 1, color: colors.textFaint, fontFamily: fonts.bold, fontSize: 10, marginLeft: spacing(2) },
  numHead: { color: colors.textFaint, fontFamily: fonts.bold, fontSize: 10 },
  row: { flexDirection: 'row', alignItems: 'center', paddingVertical: spacing(2), gap: 2 },
  rowBorder: { borderBottomWidth: 1, borderBottomColor: colors.border },
  posWrap: { width: 20, height: 20, borderRadius: 5, alignItems: 'center', justifyContent: 'center' },
  pos: { color: colors.ink, fontFamily: fonts.extrabold, fontSize: 11 },
  flag: { fontSize: 18, marginLeft: 2 },
  team: { flex: 1, color: colors.text, fontFamily: fonts.semibold, fontSize: 13, marginLeft: spacing(2) },
  teamMine: { color: colors.accent, fontFamily: fonts.bold },
  num: { width: NUM_W, textAlign: 'center', color: colors.textDim, fontFamily: fonts.medium, fontSize: 12 },
  points: { color: colors.text, fontFamily: fonts.extrabold },
});
