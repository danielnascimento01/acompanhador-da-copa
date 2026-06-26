import React from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { Flag } from './Flag';
import { Standing } from '../data/standings';
import { teamName } from '../data/teams';
import { fonts, spacing } from '../lib/theme';
import { useTheme, useThemedStyles, type ThemeTokens } from '../lib/theme-context';

type Props = {
  standings: Standing[];
  selected?: Set<string>;
  /** Seleção FAVORITA (principal). Só ela leva a ⭐ — as demais selecionadas
   * apenas ficam destacadas (verde), pois são "acompanhar", não "favorito". */
  primaryTeam?: string | null;
};

const NUM_COLS: { key: keyof Standing; label: string }[] = [
  { key: 'played', label: 'J' },
  { key: 'win', label: 'V' },
  { key: 'draw', label: 'E' },
  { key: 'loss', label: 'D' },
  { key: 'gd', label: 'SG' },
  { key: 'points', label: 'P' },
];

export function StandingsTable({ standings, selected, primaryTeam }: Props) {
  const styles = useThemedStyles(makeStyles);
  const { c: tc } = useTheme();
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
        const isPrimary = !!primaryTeam && s.teamId === primaryTeam;
        // Badge: 1º-2º classificam (verde), 3º disputa (âmbar), 4º neutro.
        const top2 = i < 2;
        const third = i === 2;
        const badgeBg = top2 ? tc.accent : third ? tc.amber : tc.surface2;
        const badgeFg = top2 || third ? tc.ink : tc.textDim;
        return (
          <View
            key={s.teamId}
            style={[styles.row, mine && styles.rowMine, i < standings.length - 1 && styles.rowBorder]}
          >
            <View style={[styles.posWrap, { backgroundColor: badgeBg }]}>
              <Text style={[styles.pos, { color: badgeFg }]}>{i + 1}</Text>
            </View>
            <Flag teamId={s.teamId} size={24} radius={7} />
            {isPrimary && <Text style={styles.star}>★</Text>}
            <Text style={[styles.team, mine && styles.teamMine]} numberOfLines={1}>
              {teamName(s.teamId)}
            </Text>
            {NUM_COLS.map((c) => (
              <Text
                key={c.key}
                style={[
                  styles.num,
                  c.key === 'points' && styles.points,
                  c.key === 'gd' && { color: s.gd > 0 ? tc.accent : s.gd < 0 ? tc.live : tc.textDim },
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

const makeStyles = ({ c, st }: ThemeTokens) => StyleSheet.create({
  headerRow: { flexDirection: 'row', alignItems: 'center', paddingBottom: spacing(2), gap: 2 },
  posHead: { width: 24, color: c.textFaint, fontFamily: fonts.bold, fontSize: 10, textAlign: 'center' },
  teamHead: { flex: 1, color: c.textFaint, fontFamily: fonts.bold, fontSize: 10, marginLeft: spacing(2) },
  numHead: { color: c.textFaint, fontFamily: fonts.bold, fontSize: 10 },
  row: { flexDirection: 'row', alignItems: 'center', paddingVertical: spacing(2.5), gap: 2, borderRadius: 8, paddingHorizontal: 4, marginHorizontal: -4 },
  rowMine: { backgroundColor: st.favoriteBg },
  rowBorder: { borderBottomWidth: 1, borderBottomColor: c.border, borderRadius: 0, marginHorizontal: 0, paddingHorizontal: 0 },
  posWrap: { width: 22, height: 22, borderRadius: 6, alignItems: 'center', justifyContent: 'center', marginRight: spacing(2) },
  pos: { fontFamily: fonts.extrabold, fontSize: 11, fontVariant: ['tabular-nums'] },
  star: { color: c.amber, fontSize: 11, marginLeft: spacing(2) },
  team: { flex: 1, color: c.text, fontFamily: fonts.semibold, fontSize: 14, marginLeft: spacing(2) },
  teamMine: { color: c.accent, fontFamily: fonts.bold },
  num: { width: NUM_W, textAlign: 'center', color: c.textDim, fontFamily: fonts.medium, fontSize: 12, fontVariant: ['tabular-nums'] },
  points: { color: c.text, fontFamily: fonts.display, fontSize: 15 },
});
