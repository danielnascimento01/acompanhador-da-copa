import React, { useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { StandingsTable } from '../components/StandingsTable';
import { FadeInUp } from '../components/Motion';
import { applyPredictions, computeStandings, countActivePredictions } from '../data/standings';
import { GROUPS } from '../data/teams';
import { useStore } from '../lib/store';
import { colors, fonts, radius, spacing } from '../lib/theme';

type Mode = 'official' | 'predicted';

export function StandingsScreen() {
  const { matches, selected, predictions, clearAllPredictions } = useStore();
  const [mode, setMode] = useState<Mode>('official');

  const activePredictions = useMemo(
    () => countActivePredictions(matches, predictions),
    [matches, predictions],
  );

  const effectiveMatches = useMemo(
    () => (mode === 'predicted' ? applyPredictions(matches, predictions) : matches),
    [mode, matches, predictions],
  );

  const byGroup = useMemo(() => computeStandings(effectiveMatches), [effectiveMatches]);
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

      {/* Alternância Oficial / Meus palpites */}
      <View style={styles.toggleRow}>
        <Pressable
          onPress={() => setMode('official')}
          accessibilityRole="button"
          accessibilityState={{ selected: mode === 'official' }}
          style={[styles.toggleBtn, mode === 'official' && styles.toggleActive]}
        >
          <Text style={[styles.toggleText, mode === 'official' && styles.toggleTextActive]}>
            Oficial
          </Text>
        </Pressable>
        <Pressable
          onPress={() => setMode('predicted')}
          accessibilityRole="button"
          accessibilityState={{ selected: mode === 'predicted' }}
          style={[styles.toggleBtn, mode === 'predicted' && styles.toggleActivePredict]}
        >
          <Text style={[styles.toggleText, mode === 'predicted' && styles.toggleTextActivePredict]}>
            🔮 Meus palpites{activePredictions > 0 ? ` (${activePredictions})` : ''}
          </Text>
        </Pressable>
      </View>

      {mode === 'predicted' && (
        <View style={styles.predictBanner}>
          <Text style={styles.predictBannerText}>
            {activePredictions === 0
              ? 'Você ainda não tem palpites. Toque em um jogo na aba Jogos e preencha o placar — a simulação aparece aqui.'
              : `Simulação com ${activePredictions} ${activePredictions === 1 ? 'palpite seu' : 'palpites seus'} + resultados oficiais. Os palpites ficam só no seu aparelho.`}
          </Text>
          {activePredictions > 0 && (
            <Pressable onPress={clearAllPredictions} accessibilityRole="button" accessibilityLabel="Limpar todos os palpites" hitSlop={6}>
              <Text style={styles.clearAll}>Limpar todos os palpites</Text>
            </Pressable>
          )}
        </View>
      )}

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

      {mode === 'official' && !anyPlayed && (
        <Text style={styles.note}>
          Ainda sem jogos disputados — a classificação se preenche conforme as partidas acontecem.
        </Text>
      )}

      {GROUPS.map((g, i) => (
        <FadeInUp key={g} delay={i * 40}>
          <View style={[styles.card, mode === 'predicted' && styles.cardPredicted]}>
            <View style={styles.groupHead}>
              <View style={[styles.groupTag, mode === 'predicted' && styles.groupTagPredicted]}>
                <Text style={styles.groupTagText}>{g}</Text>
              </View>
              <Text style={styles.groupLabel}>Grupo {g}</Text>
              {mode === 'predicted' && <Text style={styles.predictedFlag}>simulado</Text>}
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
  title: { color: colors.text, fontFamily: fonts.display, fontSize: 34, marginBottom: spacing(3) },
  toggleRow: {
    flexDirection: 'row',
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 4,
    marginBottom: spacing(3),
    gap: 4,
  },
  toggleBtn: {
    flex: 1,
    minHeight: 40,
    borderRadius: radius.sm,
    alignItems: 'center',
    justifyContent: 'center',
  },
  toggleActive: { backgroundColor: colors.accent },
  toggleActivePredict: { backgroundColor: colors.amber },
  toggleText: { color: colors.textDim, fontFamily: fonts.bold, fontSize: 13 },
  toggleTextActive: { color: colors.ink },
  toggleTextActivePredict: { color: colors.ink },
  predictBanner: {
    backgroundColor: 'rgba(255,194,51,0.10)',
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: 'rgba(255,194,51,0.35)',
    padding: spacing(3),
    marginBottom: spacing(3),
    gap: spacing(2),
  },
  predictBannerText: { color: colors.textDim, fontFamily: fonts.regular, fontSize: 13, lineHeight: 19 },
  clearAll: { color: colors.amber, fontFamily: fonts.bold, fontSize: 13, textDecorationLine: 'underline' },
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
  cardPredicted: { borderColor: 'rgba(255,194,51,0.45)' },
  groupHead: { flexDirection: 'row', alignItems: 'center', gap: spacing(2), marginBottom: spacing(3) },
  groupTag: { width: 26, height: 26, borderRadius: 8, backgroundColor: colors.accent, alignItems: 'center', justifyContent: 'center' },
  groupTagPredicted: { backgroundColor: colors.amber },
  groupTagText: { color: colors.ink, fontFamily: fonts.display, fontSize: 14 },
  groupLabel: { color: colors.text, fontFamily: fonts.bold, fontSize: 14, letterSpacing: 0.5 },
  predictedFlag: { color: colors.amber, fontFamily: fonts.semibold, fontSize: 11, marginLeft: 'auto', textTransform: 'uppercase', letterSpacing: 0.5 },
});
