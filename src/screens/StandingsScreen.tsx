import React, { useMemo, useState } from 'react';
import { Alert, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { StandingsTable } from '../components/StandingsTable';
import { QuickPredictRow } from '../components/QuickPredictRow';
import { FadeInUp } from '../components/Motion';
import { applyPredictions, computeStandings, countActivePredictions } from '../data/standings';
import { Match, isPredictable, hasMatchInPlayWindow } from '../data/fixtures';
import { GROUPS, getTeam } from '../data/teams';
import { ScorersSheet } from './ScorersSheet';
import { HistorySheet } from './HistorySheet';
import { VenuesSheet } from './VenuesSheet';
import { BracketSheet } from './BracketSheet';
import { useStore } from '../lib/store';
import { isStale } from '../lib/freshness';
import { colors, fonts, radius, spacing } from '../lib/theme';

type Mode = 'official' | 'predicted';

export function StandingsScreen() {
  const { matches, selected, predictions, setPrediction, clearAllPredictions, updatedAt, settings } = useStore();
  const dataStale = isStale(updatedAt, Date.now(), hasMatchInPlayWindow(matches), settings.dataSaver);
  const [mode, setMode] = useState<Mode>('official');
  const [scorersOpen, setScorersOpen] = useState(false);
  const [historyOpen, setHistoryOpen] = useState(false);
  const [venuesOpen, setVenuesOpen] = useState(false);
  const [bracketOpen, setBracketOpen] = useState(false);

  const activePredictions = useMemo(
    () => countActivePredictions(matches, predictions),
    [matches, predictions],
  );

  // Jogos palpitáveis de cada grupo (para o preenchimento rápido na simulação).
  const predictableByGroup = useMemo(() => {
    const map: Record<string, Match[]> = {};
    for (const g of GROUPS) map[g] = [];
    for (const m of matches) {
      if (!isPredictable(m)) continue;
      const g = getTeam(m.home)?.group;
      if (g && getTeam(m.away)?.group === g) map[g].push(m);
    }
    return map;
  }, [matches]);

  const confirmClearAll = () => {
    Alert.alert('Limpar todos os palpites?', 'Isso apaga todos os placares que você palpitou. Não dá para desfazer.', [
      { text: 'Cancelar', style: 'cancel' },
      { text: 'Limpar tudo', style: 'destructive', onPress: clearAllPredictions },
    ]);
  };

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
    <>
    <ScrollView
      style={styles.container}
      contentContainerStyle={{ padding: spacing(4), paddingBottom: spacing(10) }}
    >
      <Text style={styles.kicker}>FASE DE GRUPOS</Text>
      <Text style={styles.title}>Grupos</Text>

      {dataStale && (
        <View style={styles.staleBadge}>
          <Text style={styles.staleBadgeText}>⚠ Classificação pode estar desatualizada — atualize na aba Jogos</Text>
        </View>
      )}

      {/* Mais da Copa: Artilheiros + História + Sedes */}
      <View style={styles.moreRow}>
        <Pressable style={styles.moreBtn} onPress={() => setScorersOpen(true)} accessibilityRole="button" accessibilityLabel="Ver artilheiros">
          <Ionicons name="football-outline" size={22} color={colors.text} />
          <Text style={styles.moreText}>Artilheiros</Text>
        </Pressable>
        <Pressable style={styles.moreBtn} onPress={() => setHistoryOpen(true)} accessibilityRole="button" accessibilityLabel="Ver história da Copa">
          <Ionicons name="book-outline" size={22} color={colors.text} />
          <Text style={styles.moreText}>História</Text>
        </Pressable>
        <Pressable style={styles.moreBtn} onPress={() => setVenuesOpen(true)} accessibilityRole="button" accessibilityLabel="Ver sedes e estádios">
          <Ionicons name="location-outline" size={22} color={colors.text} />
          <Text style={styles.moreText}>Sedes</Text>
        </Pressable>
        <Pressable style={styles.moreBtn} onPress={() => setBracketOpen(true)} accessibilityRole="button" accessibilityLabel="Ver o mata-mata, caminho até a final">
          <Ionicons name="git-network-outline" size={22} color={colors.text} />
          <Text style={styles.moreText}>Mata-mata</Text>
        </Pressable>
      </View>

      {/* Alternância Oficial / Meus palpites */}
      <View style={styles.toggleRow}>
        <Pressable
          onPress={() => setMode('official')}
          accessibilityRole="button"
          accessibilityState={{ selected: mode === 'official' }}
          style={[styles.toggleBtn, mode === 'official' && styles.toggleActive]}
        >
          <Text style={[styles.toggleText, mode === 'official' && styles.toggleTextActive]}>
            Resultados
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
              ? 'Preencha os placares dos jogos abaixo de cada grupo — a classificação simula na hora. Os palpites ficam só no seu aparelho.'
              : `Simulação com ${activePredictions} ${activePredictions === 1 ? 'palpite seu' : 'palpites seus'} + resultados oficiais. Os palpites ficam só no seu aparelho.`}
          </Text>
          {activePredictions > 0 && (
            <Pressable onPress={confirmClearAll} accessibilityRole="button" accessibilityLabel="Limpar todos os palpites" hitSlop={6}>
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
            <StandingsTable standings={byGroup[g]} selected={selected} primaryTeam={settings.primaryTeam} />

            {mode === 'predicted' && predictableByGroup[g].length > 0 && (
              <View style={styles.quickPredict}>
                <Text style={styles.quickPredictTitle}>Palpite os jogos do grupo</Text>
                {predictableByGroup[g].map((m) => (
                  <QuickPredictRow
                    key={m.id}
                    match={m}
                    prediction={predictions[m.id]}
                    onChange={(p) => setPrediction(m.id, p)}
                  />
                ))}
              </View>
            )}
          </View>
        </FadeInUp>
      ))}
      </ScrollView>

      <ScorersSheet visible={scorersOpen} onClose={() => setScorersOpen(false)} />
      <HistorySheet visible={historyOpen} onClose={() => setHistoryOpen(false)} />
      <VenuesSheet visible={venuesOpen} onClose={() => setVenuesOpen(false)} />
      <BracketSheet visible={bracketOpen} onClose={() => setBracketOpen(false)} />
    </>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  kicker: { color: colors.accent, fontFamily: fonts.extrabold, fontSize: 11, letterSpacing: 1.5, textTransform: 'uppercase', marginBottom: 1 },
  title: { color: colors.text, fontFamily: fonts.display, fontSize: 36, letterSpacing: 0.3, marginBottom: spacing(3) },
  staleBadge: {
    backgroundColor: 'rgba(255,194,51,0.10)',
    borderRadius: radius.sm,
    borderWidth: 1,
    borderColor: 'rgba(255,194,51,0.35)',
    paddingHorizontal: spacing(3),
    paddingVertical: spacing(2),
    marginBottom: spacing(3),
  },
  staleBadgeText: { color: colors.amber, fontFamily: fonts.semibold, fontSize: 13 },
  moreRow: { flexDirection: 'row', gap: spacing(2), marginBottom: spacing(3) },
  moreBtn: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing(1),
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    paddingVertical: spacing(3),
  },
  moreEmoji: { fontSize: 20 },
  moreText: { color: colors.text, fontFamily: fonts.bold, fontSize: 13 },
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
  quickPredict: {
    marginTop: spacing(3),
    paddingTop: spacing(3),
    borderTopWidth: 1,
    borderTopColor: colors.border,
    gap: spacing(1),
  },
  quickPredictTitle: {
    color: colors.textFaint,
    fontFamily: fonts.bold,
    fontSize: 11,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: spacing(1),
    textAlign: 'center',
  },
});
