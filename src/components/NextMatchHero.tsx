import React, { useEffect, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';

import { Match, kickoff, isLive } from '../data/fixtures';
import { teamFlag, teamName } from '../data/teams';
import { formatTime, relativeDayLabel } from '../lib/format';
import { colors, fonts, gradients, radius, spacing, elevation } from '../lib/theme';

function countdown(target: Date, now: Date) {
  let ms = target.getTime() - now.getTime();
  if (ms <= 0) return { big: 'COMEÇANDO', small: 'agora' };
  const d = Math.floor(ms / 86400000);
  ms -= d * 86400000;
  const h = Math.floor(ms / 3600000);
  ms -= h * 3600000;
  const m = Math.floor(ms / 60000);
  ms -= m * 60000;
  const s = Math.floor(ms / 1000);
  const pad = (n: number) => String(n).padStart(2, '0');
  if (d > 0) return { big: `${d}d ${pad(h)}h`, small: 'para o apito inicial' };
  return { big: `${pad(h)}:${pad(m)}:${pad(s)}`, small: 'para o apito inicial' };
}

export function NextMatchHero({ match }: { match: Match }) {
  const [now, setNow] = useState(() => new Date());
  const live = isLive(match);

  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(id);
  }, []);

  const ko = kickoff(match);
  const hasScore = match.homeScore != null && match.awayScore != null;
  const cd = countdown(ko, now);

  return (
    <LinearGradient
      colors={live ? gradients.live : gradients.hero}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={[styles.card, elevation(2)]}
    >
      <View style={styles.glow} pointerEvents="none" />

      <View style={styles.topRow}>
        <Text style={styles.label}>{live ? 'ACONTECENDO AGORA' : 'PRÓXIMO JOGO'}</Text>
        {live ? (
          <View style={styles.liveDot}>
            <Text style={styles.liveText}>● AO VIVO</Text>
          </View>
        ) : (
          <Text style={styles.when}>
            {relativeDayLabel(ko)} · {formatTime(ko)}
          </Text>
        )}
      </View>

      <View style={styles.matchRow}>
        <View style={styles.teamBlock}>
          <View style={styles.flagWrap}>
            <Text style={styles.flagBig}>{teamFlag(match.home)}</Text>
          </View>
          <Text style={styles.teamName} numberOfLines={1}>
            {teamName(match.home)}
          </Text>
        </View>

        <View style={styles.middle}>
          {hasScore ? (
            <Text style={styles.score}>
              {match.homeScore}–{match.awayScore}
            </Text>
          ) : (
            <Text style={styles.vs}>VS</Text>
          )}
        </View>

        <View style={styles.teamBlock}>
          <View style={styles.flagWrap}>
            <Text style={styles.flagBig}>{teamFlag(match.away)}</Text>
          </View>
          <Text style={styles.teamName} numberOfLines={1}>
            {teamName(match.away)}
          </Text>
        </View>
      </View>

      {!live && (
        <View style={styles.countdownWrap}>
          <Text style={styles.countdownBig}>{cd.big}</Text>
          <Text style={styles.countdownSmall}>{cd.small}</Text>
        </View>
      )}

      {match.venue && <Text style={styles.venue}>📍 {match.venue}</Text>}
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: radius.xl,
    padding: spacing(5),
    marginBottom: spacing(5),
    overflow: 'hidden',
  },
  glow: {
    position: 'absolute',
    top: -60,
    right: -40,
    width: 180,
    height: 180,
    borderRadius: 90,
    backgroundColor: 'rgba(255,255,255,0.10)',
  },
  topRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  label: { color: 'rgba(255,255,255,0.92)', fontFamily: fonts.display, fontSize: 13, letterSpacing: 1 },
  when: { color: 'rgba(255,255,255,0.85)', fontFamily: fonts.semibold, fontSize: 13 },
  liveDot: { backgroundColor: 'rgba(0,0,0,0.28)', borderRadius: radius.pill, paddingHorizontal: 10, paddingVertical: 3 },
  liveText: { color: '#fff', fontFamily: fonts.extrabold, fontSize: 11, letterSpacing: 0.5 },
  matchRow: { flexDirection: 'row', alignItems: 'center', marginTop: spacing(5) },
  teamBlock: { flex: 1, alignItems: 'center', gap: spacing(2) },
  flagWrap: {
    width: 76,
    height: 76,
    borderRadius: 38,
    backgroundColor: 'rgba(255,255,255,0.14)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.25)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  flagBig: { fontSize: 40 },
  teamName: { color: '#fff', fontFamily: fonts.bold, fontSize: 15, textAlign: 'center' },
  middle: { paddingHorizontal: spacing(2), minWidth: 60, alignItems: 'center' },
  vs: { color: 'rgba(255,255,255,0.65)', fontFamily: fonts.display, fontSize: 22 },
  score: { color: '#fff', fontFamily: fonts.display, fontSize: 40 },
  countdownWrap: { alignItems: 'center', marginTop: spacing(5) },
  countdownBig: {
    color: '#fff',
    fontFamily: fonts.display,
    fontSize: 40,
    letterSpacing: 1,
    fontVariant: ['tabular-nums'],
  },
  countdownSmall: { color: 'rgba(255,255,255,0.8)', fontFamily: fonts.medium, fontSize: 12, marginTop: 2 },
  venue: { color: 'rgba(255,255,255,0.78)', fontFamily: fonts.medium, fontSize: 12, textAlign: 'center', marginTop: spacing(3) },
});
