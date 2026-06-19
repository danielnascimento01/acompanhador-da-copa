import React, { useEffect, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { Match, hasStarted, isLive } from '../data/fixtures';
import { teamFlag, teamName } from '../data/teams';
import { fetchMatchSummary, type MatchSummary, type TeamLineup, type TeamStat } from '../lib/liveEvents';
import { colors, fonts, radius, spacing } from '../lib/theme';

/**
 * Escalações + estatísticas do jogo (via endpoint summary da ESPN). Só aparece em
 * jogos que já começaram e some em silêncio se a ESPN não tiver os dados (jogos
 * antigos/sem cobertura). Atualiza enquanto ao vivo. Tudo orientado ao nosso mando.
 */
export function MatchStats({ match }: { match: Match }) {
  const [data, setData] = useState<MatchSummary | null>(null);

  useEffect(() => {
    if (!hasStarted(match)) {
      setData(null);
      return;
    }
    let alive = true;
    let interval: ReturnType<typeof setInterval> | null = null;

    const tick = async () => {
      const s = await fetchMatchSummary(match);
      if (!alive) return;
      setData(s);
      if (!isLive(match) && interval) {
        clearInterval(interval);
        interval = null;
      }
    };
    tick();
    if (isLive(match)) interval = setInterval(tick, 30000);
    return () => {
      alive = false;
      if (interval) clearInterval(interval);
    };
  }, [match.id, match.status]);

  if (!hasStarted(match) || !data) return null;

  return (
    <>
      {data.stats.length > 0 && (
        <View style={styles.card}>
          <Text style={styles.title}>📊 Estatísticas</Text>
          <View style={styles.statHead}>
            <Text style={styles.statHeadFlag}>{teamFlag(match.home)}</Text>
            <Text style={styles.statHeadSpacer} />
            <Text style={styles.statHeadFlag}>{teamFlag(match.away)}</Text>
          </View>
          {data.stats.map((s) => (
            <StatRow key={s.key} stat={s} />
          ))}
        </View>
      )}

      {(data.home || data.away) && (
        <View style={styles.card}>
          <Text style={styles.title}>👥 Escalações</Text>
          {data.home && <LineupBlock teamId={match.home} lineup={data.home} />}
          {data.away && <LineupBlock teamId={match.away} lineup={data.away} />}
          <Text style={styles.note}>Fonte: ESPN. Titulares confirmados saem ~1h antes do apito.</Text>
        </View>
      )}
    </>
  );
}

function StatRow({ stat }: { stat: TeamStat }) {
  const hn = parseFloat(stat.home);
  const an = parseFloat(stat.away);
  const total = (Number.isFinite(hn) ? hn : 0) + (Number.isFinite(an) ? an : 0);
  const homePct = Number.isFinite(hn) && total > 0 ? (hn / total) * 100 : 50;
  return (
    <View style={styles.statRow}>
      <View style={styles.statValues}>
        <Text style={styles.statVal}>{stat.home}</Text>
        <Text style={styles.statLabel}>{stat.label}</Text>
        <Text style={styles.statVal}>{stat.away}</Text>
      </View>
      <View style={styles.bar}>
        <View style={[styles.barHome, { width: `${homePct}%` }]} />
        <View style={[styles.barAway, { width: `${100 - homePct}%` }]} />
      </View>
    </View>
  );
}

function LineupBlock({ teamId, lineup }: { teamId: string; lineup: TeamLineup }) {
  const [showSubs, setShowSubs] = useState(false);
  return (
    <View style={styles.lineup}>
      <View style={styles.lineupHead}>
        <Text style={styles.lineupFlag}>{teamFlag(teamId)}</Text>
        <Text style={styles.lineupTeam} numberOfLines={1}>
          {teamName(teamId)}
        </Text>
        {lineup.formation ? <Text style={styles.formation}>{lineup.formation}</Text> : null}
      </View>
      {lineup.starters.map((p, i) => (
        <PlayerRow key={`s${i}`} number={p.number} name={p.name} pos={p.pos} />
      ))}
      {lineup.subs.length > 0 && (
        <>
          <Pressable
            onPress={() => setShowSubs((v) => !v)}
            accessibilityRole="button"
            hitSlop={6}
            style={({ pressed }) => [styles.subsToggle, pressed && styles.pressed]}
          >
            <Text style={styles.subsToggleText}>
              {showSubs ? 'Ocultar reservas ↑' : `Reservas (${lineup.subs.length}) ↓`}
            </Text>
          </Pressable>
          {showSubs &&
            lineup.subs.map((p, i) => <PlayerRow key={`r${i}`} number={p.number} name={p.name} pos={p.pos} dim />)}
        </>
      )}
    </View>
  );
}

function PlayerRow({
  number,
  name,
  pos,
  dim,
}: {
  number: string | null;
  name: string;
  pos: string | null;
  dim?: boolean;
}) {
  return (
    <View style={styles.playerRow}>
      <Text style={styles.playerNum}>{number ?? '–'}</Text>
      <Text style={[styles.playerName, dim && styles.playerNameDim]} numberOfLines={1}>
        {name}
      </Text>
      {pos ? <Text style={styles.playerPos}>{pos}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing(4),
    marginBottom: spacing(4),
  },
  title: { color: colors.text, fontFamily: fonts.bold, fontSize: 14, marginBottom: spacing(3) },
  note: { color: colors.textFaint, fontFamily: fonts.regular, fontSize: 11.5, lineHeight: 16, marginTop: spacing(2) },

  statHead: { flexDirection: 'row', alignItems: 'center', marginBottom: spacing(1) },
  statHeadFlag: { fontSize: 18 },
  statHeadSpacer: { flex: 1 },
  statRow: { marginBottom: spacing(3) },
  statValues: { flexDirection: 'row', alignItems: 'center', marginBottom: 5 },
  statVal: { color: colors.text, fontFamily: fonts.bold, fontSize: 14, width: 52, fontVariant: ['tabular-nums'] },
  statLabel: { color: colors.textDim, fontFamily: fonts.semibold, fontSize: 12.5, flex: 1, textAlign: 'center' },
  bar: { flexDirection: 'row', height: 6, borderRadius: 3, overflow: 'hidden', backgroundColor: colors.surface2 },
  barHome: { backgroundColor: colors.accent, height: 6 },
  barAway: { backgroundColor: colors.teal, height: 6 },

  lineup: { marginBottom: spacing(3) },
  lineupHead: { flexDirection: 'row', alignItems: 'center', gap: spacing(2), marginBottom: spacing(2) },
  lineupFlag: { fontSize: 20 },
  lineupTeam: { color: colors.text, fontFamily: fonts.bold, fontSize: 14, flex: 1 },
  formation: {
    color: colors.accent,
    fontFamily: fonts.extrabold,
    fontSize: 12,
    letterSpacing: 0.5,
    fontVariant: ['tabular-nums'],
  },
  playerRow: { flexDirection: 'row', alignItems: 'center', gap: spacing(3), paddingVertical: 3 },
  playerNum: {
    color: colors.textFaint,
    fontFamily: fonts.bold,
    fontSize: 13,
    width: 22,
    textAlign: 'center',
    fontVariant: ['tabular-nums'],
  },
  playerName: { color: colors.text, fontFamily: fonts.semibold, fontSize: 14, flex: 1 },
  playerNameDim: { color: colors.textDim, fontFamily: fonts.regular },
  playerPos: { color: colors.textFaint, fontFamily: fonts.medium, fontSize: 11 },
  subsToggle: { paddingVertical: spacing(2) },
  subsToggleText: { color: colors.textDim, fontFamily: fonts.bold, fontSize: 12.5 },
  pressed: { opacity: 0.6 },
});
