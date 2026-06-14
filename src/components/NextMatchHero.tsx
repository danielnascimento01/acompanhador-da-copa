import React, { useEffect, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';

import { Match, kickoff, isLive } from '../data/fixtures';
import { teamFlag, teamName } from '../data/teams';
import { fetchTimeline, type LiveTimeline, type TimelineEvent } from '../lib/liveEvents';
import { formatTime, relativeDayLabel } from '../lib/format';
import { colors, fonts, gradients, radius, spacing, elevation } from '../lib/theme';

/** Lances "de destaque" pro card resumo: gols, gols contra e vermelhos. */
function isKeyEvent(e: TimelineEvent): boolean {
  return e.type === 'goal' || e.type === 'own-goal' || e.type === 'red';
}
function eventIcon(e: TimelineEvent): string {
  return e.type === 'red' ? '🟥' : '⚽';
}
function eventSuffix(e: TimelineEvent): string {
  return e.type === 'own-goal' ? ' (contra)' : e.penalty ? ' (p)' : '';
}

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

export function NextMatchHero({ match, onPress }: { match: Match; onPress?: () => void }) {
  const [now, setNow] = useState(() => new Date());
  const [timeline, setTimeline] = useState<LiveTimeline | null>(null);
  // Janela de tempo + status (trava status "preso"). Re-avalia a cada segundo (now).
  const liveByStatus = isLive(match, now);
  // A ESPN é a fonte em tempo real: se ela diz que acabou, não está ao vivo —
  // mesmo que o status do dataset ainda diga 2H/LIVE. Resolve o caso na hora.
  const live = liveByStatus && timeline?.state !== 'post';

  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(id);
  }, []);

  // Lances ao vivo (ESPN) direto no card resumo — atualiza a cada 20s.
  // O gate é o status (liveByStatus), não o `live` derivado: assim o polling
  // continua e o state:'post' persiste, sem loop de fetch/limpa/refetch.
  useEffect(() => {
    if (!liveByStatus) {
      setTimeline(null);
      return;
    }
    let alive = true;
    const tick = async () => {
      const t = await fetchTimeline(match);
      if (alive) setTimeline(t);
    };
    tick();
    const id = setInterval(tick, 20000);
    return () => {
      alive = false;
      clearInterval(id);
    };
  }, [match.id, liveByStatus]);

  // Status diz ao vivo, mas a ESPN confirma que já acabou → "recém-encerrado".
  // (Evita mostrar como "próximo jogo" com contagem regressiva um jogo terminado.)
  const ended = liveByStatus && timeline?.state === 'post';

  const keyEvents = timeline?.events.filter(isKeyEvent) ?? [];

  const ko = kickoff(match);
  // Prefere o placar do dataset; cai pro placar da ESPN quando o embutido ainda é null.
  const homeScore = match.homeScore ?? timeline?.homeScore ?? null;
  const awayScore = match.awayScore ?? timeline?.awayScore ?? null;
  const hasScore = homeScore != null && awayScore != null;
  const cd = countdown(ko, now);

  return (
    <Pressable
      onPress={onPress}
      disabled={!onPress}
      accessibilityRole={onPress ? 'button' : undefined}
      accessibilityLabel={`${teamName(match.home)} contra ${teamName(match.away)}, ver detalhes`}
      style={({ pressed }) => (pressed && onPress ? styles.pressed : undefined)}
    >
    <LinearGradient
      colors={live ? gradients.live : gradients.hero}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={[styles.card, elevation(2)]}
    >
      <View style={styles.glow} pointerEvents="none" />

      <View style={styles.topRow}>
        <Text style={styles.label}>{live ? 'ACONTECENDO AGORA' : ended ? 'ENCERRADO' : 'PRÓXIMO JOGO'}</Text>
        {live ? (
          <View style={styles.liveDot}>
            <Text style={styles.liveText}>
              {timeline?.halftime ? '● INTERVALO' : `● AO VIVO${timeline?.clock ? ` · ${timeline.clock}` : ''}`}
            </Text>
          </View>
        ) : ended ? (
          <View style={styles.liveDot}>
            <Text style={styles.liveText}>● ENCERRADO</Text>
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
              {homeScore}–{awayScore}
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

      {(live || ended) && keyEvents.length > 0 && (
        <View style={styles.events}>
          {keyEvents.map((e, i) => (
            <View key={`${e.minute}-${e.player}-${i}`} style={styles.eventRow}>
              <Text style={styles.eventText} numberOfLines={1}>
                {eventIcon(e)} {e.minute} {e.player}
                {eventSuffix(e)}
              </Text>
              <Text style={styles.eventFlag}>{teamFlag(e.side === 'home' ? match.home : match.away)}</Text>
            </View>
          ))}
        </View>
      )}

      {!live && !ended && (
        <View style={styles.countdownWrap}>
          <Text style={styles.countdownBig}>{cd.big}</Text>
          <Text style={styles.countdownSmall}>{cd.small}</Text>
        </View>
      )}

      {match.venue && <Text style={styles.venue}>📍 {match.venue}</Text>}

      {onPress && (
        <View style={styles.detailsHint}>
          <Text style={styles.detailsHintText}>Toque para ver detalhes ›</Text>
        </View>
      )}
    </LinearGradient>
    </Pressable>
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
  events: {
    marginTop: spacing(4),
    paddingTop: spacing(3),
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.2)',
    gap: spacing(1),
  },
  eventRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: spacing(2) },
  eventText: { color: '#fff', fontFamily: fonts.semibold, fontSize: 14, flex: 1 },
  eventFlag: { fontSize: 16 },
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
  pressed: { opacity: 0.85 },
  detailsHint: {
    marginTop: spacing(4),
    paddingTop: spacing(3),
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.18)',
    alignItems: 'center',
  },
  detailsHintText: { color: 'rgba(255,255,255,0.92)', fontFamily: fonts.bold, fontSize: 12, letterSpacing: 0.3 },
});
