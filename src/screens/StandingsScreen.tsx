import React, { useMemo } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';

import { StandingsTable } from '../components/StandingsTable';
import { FadeInUp } from '../components/Motion';
import { computeStandings } from '../data/standings';
import { GROUPS } from '../data/teams';
import { useStore } from '../lib/store';
import { colors, fonts, radius, spacing } from '../lib/theme';

export function StandingsScreen() {
  const { matches, selected } = useStore();
  const byGroup = useMemo(() => computeStandings(matches), [matches]);
  const anyPlayed = useMemo(
    () => Object.values(byGroup).some((g) => g.some((s) => s.played > 0)),
    [byGroup],
  );

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={{ padding: spacing(4), paddingBottom: spacing(10) }}
    >
      <Text style={styles.title}>Grupos</Text>
      <View style={styles.legend}>
        <View style={styles.legendItem}>
          <View style={[styles.dot, { backgroundColor: colors.accent }]} />
          <Text style={styles.legendText}>Classificam (1º e 2º)</Text>
        </View>
        <View style={styles.legendItem}>
          <View style={[styles.dot, { backgroundColor: colors.amber }]} />
          <Text style={styles.legendText}>3º disputa vaga</Text>
        </View>
      </View>

      {!anyPlayed && (
        <Text style={styles.note}>
          Ainda sem jogos disputados — a classificação se preenche conforme as partidas acontecem.
        </Text>
      )}

      {GROUPS.map((g, i) => (
        <FadeInUp key={g} delay={i * 40}>
          <View style={styles.card}>
            <View style={styles.groupHead}>
              <View style={styles.groupTag}>
                <Text style={styles.groupTagText}>{g}</Text>
              </View>
              <Text style={styles.groupLabel}>Grupo {g}</Text>
            </View>
            <StandingsTable standings={byGroup[g]} selected={selected} />
          </View>
        </FadeInUp>
      ))}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  title: { color: colors.text, fontFamily: fonts.display, fontSize: 34, marginBottom: spacing(2) },
  legend: { flexDirection: 'row', gap: spacing(4), marginBottom: spacing(3) },
  legendItem: { flexDirection: 'row', alignItems: 'center', gap: spacing(2) },
  dot: { width: 10, height: 10, borderRadius: 5 },
  legendText: { color: colors.textDim, fontFamily: fonts.medium, fontSize: 12 },
  note: { color: colors.textFaint, fontFamily: fonts.regular, fontSize: 13, lineHeight: 19, marginBottom: spacing(3) },
  card: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing(4),
    marginBottom: spacing(3),
  },
  groupHead: { flexDirection: 'row', alignItems: 'center', gap: spacing(2), marginBottom: spacing(3) },
  groupTag: { width: 26, height: 26, borderRadius: 8, backgroundColor: colors.accent, alignItems: 'center', justifyContent: 'center' },
  groupTagText: { color: colors.ink, fontFamily: fonts.display, fontSize: 14 },
  groupLabel: { color: colors.text, fontFamily: fonts.bold, fontSize: 14, letterSpacing: 0.5 },
});
