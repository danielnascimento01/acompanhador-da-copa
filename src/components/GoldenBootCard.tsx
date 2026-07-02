import React, { useEffect, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { PlayerAvatar } from './PlayerAvatar';
import { fetchLiveScorers, type LiveScorer } from '../lib/liveScorers';
import { fonts, radius, spacing } from '../lib/theme';
import { useThemedStyles, type ThemeTokens } from '../lib/theme-context';

const MEDAL = ['🥇', '🥈', '🥉'];

/**
 * Corrida da Chuteira de Ouro — top 3 artilheiros em destaque. Some sozinho
 * enquanto não há gols (sem dado fabricado). Toque abre a lista completa (top 20).
 */
export function GoldenBootCard({ onPress, refreshKey }: { onPress: () => void; refreshKey?: unknown }) {
  const styles = useThemedStyles(makeStyles);
  const [scorers, setScorers] = useState<LiveScorer[]>([]);

  useEffect(() => {
    let cancelled = false;
    fetchLiveScorers().then((data) => {
      if (!cancelled) setScorers(data.slice(0, 3));
    });
    return () => { cancelled = true; };
  }, [refreshKey]);

  if (scorers.length === 0) return null;

  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel="Ver a corrida da Chuteira de Ouro completa"
      style={({ pressed }) => [styles.card, pressed && styles.pressed]}
    >
      <View style={styles.head}>
        <Text style={styles.title}>👟 Corrida da Chuteira de Ouro</Text>
        <Text style={styles.seeAll}>ver todos ›</Text>
      </View>
      <View style={styles.row}>
        {scorers.map((s, i) => (
          <View key={`${s.player}-${i}`} style={styles.player}>
            <Text style={styles.medal}>{MEDAL[i]}</Text>
            <PlayerAvatar athleteId={s.athleteId} teamId={s.teamId} flag={s.flag} size={36} radius={10} />
            <Text style={styles.name} numberOfLines={1}>{s.player}</Text>
            <Text style={styles.goals}>{s.goals} {s.goals === 1 ? 'gol' : 'gols'}</Text>
          </View>
        ))}
      </View>
    </Pressable>
  );
}

const makeStyles = ({ c }: ThemeTokens) => StyleSheet.create({
  card: {
    backgroundColor: c.surface,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: c.border,
    padding: spacing(4),
    marginBottom: spacing(3),
  },
  pressed: { opacity: 0.8 },
  head: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: spacing(3) },
  title: { color: c.text, fontFamily: fonts.extrabold, fontSize: 15 },
  seeAll: { color: c.accent, fontFamily: fonts.bold, fontSize: 12 },
  row: { flexDirection: 'row', gap: spacing(2) },
  player: { flex: 1, alignItems: 'center', gap: 2 },
  medal: { fontSize: 16 },
  name: { color: c.text, fontFamily: fonts.bold, fontSize: 12, marginTop: 2, textAlign: 'center' },
  goals: { color: c.textDim, fontFamily: fonts.semibold, fontSize: 11 },
});
