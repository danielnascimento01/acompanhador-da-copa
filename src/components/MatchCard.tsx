import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { Flag } from './Flag';
import { Match, kickoff, matchDisplay } from '../data/fixtures';
import { teamName } from '../data/teams';
import { formatTime, isLateNight } from '../lib/format';
import { Prediction } from '../lib/storage';
import { colors, fonts, radius, spacing, state } from '../lib/theme';

type Props = {
  match: Match;
  /** Ids das seleções marcadas, para destacar quem você acompanha (nome verde). */
  selected: Set<string>;
  /** Seleção FAVORITA (principal): só ela leva a ⭐. Acompanhadas ficam só verdes. */
  primaryTeam?: string | null;
  /** Palpite do usuário para este jogo (exibido se não houver placar real). */
  prediction?: Prediction;
  onPress?: () => void;
};

export const MatchCard = React.memo(function MatchCard({ match, selected, primaryTeam, prediction, onPress }: Props) {
  const ko = kickoff(match);
  // Estado de exibição confirmado (nunca pelo relógio): live só sob isLive,
  // placar só sob (ao vivo|encerrado)&&placar — senão neutro. Mata o "Em andamento"
  // fantasma de jogo encerrado com dado velho.
  const d = matchDisplay(match);
  const live = d.state === 'live';
  const lateNight = d.state === 'upcoming' && isLateNight(ko);
  const homeFav = selected.has(match.home);
  const awayFav = selected.has(match.away);
  const homePrimary = !!primaryTeam && match.home === primaryTeam;
  const awayPrimary = !!primaryTeam && match.away === primaryTeam;

  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={`${teamName(match.home)} contra ${teamName(match.away)}, ver detalhes`}
      style={({ pressed }) => [styles.card, live && styles.cardLive, pressed && styles.cardPressed]}
    >
      {/* Mandante */}
      <View style={styles.side}>
        <Flag teamId={match.home} size={40} />
        <Text style={[styles.team, homeFav && styles.teamFav]} numberOfLines={1}>
          {teamName(match.home)}
        </Text>
        {homePrimary && <Text style={styles.star}>★</Text>}
      </View>

      {/* Centro: placar/hora + estado */}
      <View style={styles.center}>
        {d.showScore ? (
          <Text style={styles.score}>
            {match.homeScore}–{match.awayScore}
          </Text>
        ) : (
          <Text style={styles.time}>{formatTime(ko)}</Text>
        )}
        {d.state === 'live' ? (
          <View style={styles.liveBadge}>
            <Text style={styles.liveText}>● AO VIVO</Text>
          </View>
        ) : d.state === 'finished' ? (
          <Text style={styles.statusDim}>Encerrado</Text>
        ) : d.state === 'awaiting' ? (
          <Text style={styles.statusDim}>aguardando</Text>
        ) : d.state === 'unconfirmed' ? (
          <Text style={styles.statusDim}>atualizando…</Text>
        ) : prediction ? (
          <View style={styles.predChip}>
            <Text style={styles.predText}>🔮 {prediction.home}–{prediction.away}</Text>
          </View>
        ) : lateNight ? (
          <Text style={styles.lateNight}>🌙 madrugada</Text>
        ) : (
          <Text style={styles.statusDim}>Rodada {match.round}</Text>
        )}
      </View>

      {/* Visitante */}
      <View style={[styles.side, styles.sideRight]}>
        {awayPrimary && <Text style={styles.star}>★</Text>}
        <Text style={[styles.team, styles.teamRight, awayFav && styles.teamFav]} numberOfLines={1}>
          {teamName(match.away)}
        </Text>
        <Flag teamId={match.away} size={40} />
      </View>
    </Pressable>
  );
});

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    paddingVertical: spacing(3),
    paddingHorizontal: spacing(3),
    marginBottom: spacing(2.5),
    overflow: 'hidden',
  },
  cardLive: { borderColor: state.liveBorder, backgroundColor: '#13171E' },
  cardPressed: { opacity: 0.6 },
  side: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: spacing(2) },
  sideRight: { justifyContent: 'flex-end' },
  team: { color: colors.text, fontFamily: fonts.semibold, fontSize: 15, flexShrink: 1 },
  teamRight: { textAlign: 'right' },
  teamFav: { color: colors.accent, fontFamily: fonts.bold },
  star: { color: colors.amber, fontSize: 11 },
  center: { alignItems: 'center', minWidth: 78, paddingHorizontal: spacing(2) },
  time: { color: colors.text, fontFamily: fonts.display, fontSize: 22, fontVariant: ['tabular-nums'] },
  score: { color: colors.text, fontFamily: fonts.display, fontSize: 26, fontVariant: ['tabular-nums'] },
  statusDim: { color: colors.textFaint, fontFamily: fonts.medium, fontSize: 11, marginTop: 3 },
  predChip: {
    marginTop: 4,
    backgroundColor: state.amberTint,
    borderRadius: radius.pill,
    paddingHorizontal: 8,
    paddingVertical: 2,
  },
  predText: { color: colors.amber, fontFamily: fonts.bold, fontSize: 11 },
  lateNight: { color: colors.amber, fontFamily: fonts.bold, fontSize: 10.5, marginTop: 3, letterSpacing: 0.3 },
  liveBadge: {
    marginTop: 4,
    backgroundColor: state.liveTint,
    borderRadius: radius.pill,
    paddingHorizontal: 8,
    paddingVertical: 2,
  },
  liveText: { color: colors.live, fontFamily: fonts.extrabold, fontSize: 10, letterSpacing: 0.4 },
});
