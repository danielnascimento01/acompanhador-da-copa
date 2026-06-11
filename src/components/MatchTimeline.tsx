import React, { useEffect, useState } from 'react';
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';

import { Match, hasStarted } from '../data/fixtures';
import { teamFlag } from '../data/teams';
import { fetchTimeline, type LiveTimeline, type TimelineEvent } from '../lib/liveEvents';
import { colors, fonts, radius, spacing } from '../lib/theme';

/**
 * "Lance a lance" do jogo — minuto ao vivo + gols (autor, minuto, (p) pênalti) e
 * cartões, via API pública da ESPN. Só aparece em jogos que já começaram; some
 * de forma silenciosa se a ESPN não tiver dados daquele jogo.
 */
export function MatchTimeline({ match }: { match: Match }) {
  const [timeline, setTimeline] = useState<LiveTimeline | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!hasStarted(match)) {
      setTimeline(null);
      return;
    }
    let alive = true;
    let interval: ReturnType<typeof setInterval> | null = null;

    const tick = async () => {
      const t = await fetchTimeline(match);
      if (!alive) return;
      setTimeline(t);
      setLoading(false);
      // jogo encerrado → para de atualizar
      if (t?.state === 'post' && interval) {
        clearInterval(interval);
        interval = null;
      }
    };

    setLoading(true);
    tick();
    interval = setInterval(tick, 45000); // atualiza a cada 45s enquanto ao vivo
    return () => {
      alive = false;
      if (interval) clearInterval(interval);
    };
  }, [match.id, match.status]);

  if (!hasStarted(match)) return null;

  if (!timeline) {
    return loading ? (
      <View style={styles.loadingRow}>
        <ActivityIndicator color={colors.accent} size="small" />
        <Text style={styles.loadingText}>Buscando lances ao vivo…</Text>
      </View>
    ) : null;
  }

  const { state, clock, events } = timeline;
  // sem dados de lance e não está ao vivo → não mostra nada
  if (state !== 'in' && events.length === 0) return null;

  return (
    <View style={styles.card}>
      <View style={styles.head}>
        <Text style={styles.title}>📝 Lance a lance</Text>
        {state === 'in' && (
          <View style={styles.liveBadge}>
            <Text style={styles.liveText}>● AO VIVO{clock ? ` · ${clock}` : ''}</Text>
          </View>
        )}
      </View>

      {events.length === 0 ? (
        <Text style={styles.empty}>Sem lances ainda. Os gols e cartões aparecem aqui na hora.</Text>
      ) : (
        events.map((e, i) => <EventRow key={`${e.minute}-${e.player}-${i}`} match={match} event={e} />)
      )}

      <Text style={styles.source}>Dados ao vivo via ESPN</Text>
    </View>
  );
}

function EventRow({ match, event }: { match: Match; event: TimelineEvent }) {
  const flag = teamFlag(event.side === 'home' ? match.home : match.away);
  const icon = iconFor(event);
  const suffix =
    event.type === 'own-goal' ? ' (contra)' : event.penalty ? ' (p)' : '';

  return (
    <View style={styles.row}>
      <Text style={styles.icon}>{icon}</Text>
      <Text style={styles.minute}>{event.minute}</Text>
      <Text style={styles.player} numberOfLines={1}>
        {event.player}
        {suffix ? <Text style={styles.suffix}>{suffix}</Text> : null}
      </Text>
      <Text style={styles.flag}>{flag}</Text>
    </View>
  );
}

function iconFor(e: TimelineEvent): string {
  if (e.type === 'goal' || e.type === 'own-goal') return '⚽';
  if (e.type === 'red') return '🟥';
  return '🟨';
}

const styles = StyleSheet.create({
  loadingRow: { flexDirection: 'row', alignItems: 'center', gap: spacing(2), paddingVertical: spacing(3), marginBottom: spacing(4) },
  loadingText: { color: colors.textDim, fontFamily: fonts.regular, fontSize: 13 },

  card: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing(4),
    marginBottom: spacing(4),
  },
  head: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: spacing(3) },
  title: { color: colors.text, fontFamily: fonts.bold, fontSize: 14 },
  liveBadge: { backgroundColor: 'rgba(255,77,94,0.16)', borderRadius: radius.pill, paddingHorizontal: spacing(2), paddingVertical: 3 },
  liveText: { color: colors.live, fontFamily: fonts.extrabold, fontSize: 11, letterSpacing: 0.4 },
  empty: { color: colors.textDim, fontFamily: fonts.regular, fontSize: 13, lineHeight: 19 },

  row: { flexDirection: 'row', alignItems: 'center', gap: spacing(3), paddingVertical: spacing(2) },
  icon: { fontSize: 16, width: 22, textAlign: 'center' },
  minute: { color: colors.textDim, fontFamily: fonts.bold, fontSize: 13, width: 44 },
  player: { color: colors.text, fontFamily: fonts.semibold, fontSize: 15, flex: 1 },
  suffix: { color: colors.amber, fontFamily: fonts.bold, fontSize: 13 },
  flag: { fontSize: 18 },
  source: { color: colors.textFaint, fontFamily: fonts.regular, fontSize: 11, marginTop: spacing(3) },
});
