import React, { useEffect, useMemo, useState } from 'react';
import { RefreshControl, SectionList, StyleSheet, Text, View } from 'react-native';

import { MatchCard } from '../components/MatchCard';
import { NextMatchHero } from '../components/NextMatchHero';
import { MatchDetailSheet } from './MatchDetailSheet';
import { FadeInUp } from '../components/Motion';
import { filterByTeams, kickoff, nextRelevantMatch, Match } from '../data/fixtures';
import { useStore } from '../lib/store';
import { isOddsAvailable } from '../lib/odds';
import { localDayKey, relativeDayLabel } from '../lib/format';
import { colors, fonts, spacing } from '../lib/theme';

function updatedLabel(updatedAt: number | null): string {
  if (!updatedAt) return 'puxe para atualizar';
  const mins = Math.floor((Date.now() - updatedAt) / 60000);
  if (mins < 1) return 'atualizado agora';
  if (mins < 60) return `atualizado há ${mins} min`;
  const h = Math.floor(mins / 60);
  return `atualizado há ${h}h`;
}

export function ScheduleScreen() {
  const { selected, matches, refresh, refreshing, updatedAt, predictions, settings } = useStore();
  const [detail, setDetail] = useState<Match | null>(null);
  const showOdds = isOddsAvailable(settings);

  useEffect(() => {
    if (!updatedAt && selected.size > 0) refresh();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const myMatches = useMemo(() => filterByTeams(matches, selected), [matches, selected]);
  const hero = useMemo(() => nextRelevantMatch(myMatches), [myMatches]);

  const sections = useMemo(() => {
    const byDay = new Map<string, Match[]>();
    for (const m of myMatches) {
      const key = localDayKey(kickoff(m));
      const arr = byDay.get(key) ?? [];
      arr.push(m);
      byDay.set(key, arr);
    }
    return [...byDay.entries()].map(([key, data]) => ({
      key,
      title: relativeDayLabel(kickoff(data[0])),
      data,
    }));
  }, [myMatches]);

  if (selected.size === 0) {
    return (
      <View style={styles.empty}>
        <Text style={styles.emptyEmoji}>📡</Text>
        <Text style={styles.emptyTitle}>Comece escolhendo seus times</Text>
        <Text style={styles.emptyText}>
          Vá na aba <Text style={styles.bold}>Seleções</Text> e marque quem você quer acompanhar. Os
          jogos aparecem aqui, com lembretes antes de cada partida.
        </Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Seus jogos</Text>
        <Text style={styles.subtitle}>
          {myMatches.length} jogos · seu fuso · {updatedLabel(updatedAt)}
        </Text>
      </View>
      <SectionList
        sections={sections}
        keyExtractor={(item) => item.id}
        stickySectionHeadersEnabled={false}
        contentContainerStyle={{ paddingBottom: spacing(10), paddingHorizontal: spacing(4) }}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={refresh}
            tintColor={colors.accent}
            colors={[colors.accent]}
          />
        }
        ListHeaderComponent={
          hero ? (
            <FadeInUp>
              <NextMatchHero match={hero} />
            </FadeInUp>
          ) : null
        }
        renderSectionHeader={({ section }) => <Text style={styles.day}>{section.title}</Text>}
        renderItem={({ item }) => (
          <MatchCard
            match={item}
            selected={selected}
            prediction={predictions[item.id]}
            showOdds={showOdds}
            onPress={() => setDetail(item)}
          />
        )}
      />
      <MatchDetailSheet
        match={detail ? (matches.find((m) => m.id === detail.id) ?? detail) : null}
        matches={matches}
        selected={selected}
        onClose={() => setDetail(null)}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { paddingHorizontal: spacing(4), paddingTop: spacing(2), paddingBottom: spacing(3) },
  title: { color: colors.text, fontFamily: fonts.display, fontSize: 34 },
  subtitle: { color: colors.textDim, fontFamily: fonts.medium, fontSize: 13, marginTop: 2 },
  day: {
    color: colors.accent,
    fontFamily: fonts.extrabold,
    fontSize: 13,
    letterSpacing: 0.5,
    marginTop: spacing(5),
    marginBottom: spacing(2),
    textTransform: 'uppercase',
  },
  empty: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: spacing(8) },
  emptyEmoji: { fontSize: 52, marginBottom: spacing(4) },
  emptyTitle: { color: colors.text, fontFamily: fonts.bold, fontSize: 21, marginBottom: spacing(2), textAlign: 'center' },
  emptyText: { color: colors.textDim, fontFamily: fonts.regular, fontSize: 15, textAlign: 'center', lineHeight: 22 },
  bold: { color: colors.accent, fontFamily: fonts.bold },
});
