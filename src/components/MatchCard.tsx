import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { Match, kickoff, matchDisplay } from '../data/fixtures';
import { teamFlag, teamName } from '../data/teams';
import { formatTime, isLateNight } from '../lib/format';
import { Prediction } from '../lib/storage';
import { colors, fonts, radius, spacing } from '../lib/theme';

type Props = {
  match: Match;
  /** Ids das seleções marcadas, para destacar quem você acompanha. */
  selected: Set<string>;
  /** Palpite do usuário para este jogo (exibido se não houver placar real). */
  prediction?: Prediction;
  onPress?: () => void;
};

export const MatchCard = React.memo(function MatchCard({ match, selected, prediction, onPress }: Props) {
  const ko = kickoff(match);
  // Estado de exibição confirmado (nunca pelo relógio): live só sob isLive,
  // placar só sob (ao vivo|encerrado)&&placar — senão neutro. Mata o "Em andamento"
  // fantasma de jogo encerrado com dado velho.
  const d = matchDisplay(match);
  const live = d.state === 'live';
  const lateNight = d.state === 'upcoming' && isLateNight(ko);

  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={`${teamName(match.home)} contra ${teamName(match.away)}, ver detalhes`}
      style={({ pressed }) => [styles.card, live && styles.cardLive, pressed && styles.cardPressed]}
    >
      {live && <View style={styles.liveBar} />}

      <View style={styles.teamsRow}>
        <View style={styles.side}>
          <View style={styles.flagWrap}>
            <Text style={styles.flag}>{teamFlag(match.home)}</Text>
          </View>
          <Text style={[styles.team, selected.has(match.home) && styles.teamSelected]} numberOfLines={1}>
            {teamName(match.home)}
          </Text>
        </View>

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
            <Text style={styles.statusDim}>aguardando resultado</Text>
          ) : d.state === 'unconfirmed' ? (
            <Text style={styles.statusDim}>atualizando…</Text>
          ) : prediction ? (
            <Text style={styles.predictionTag}>
              🔮 {prediction.home}–{prediction.away}
            </Text>
          ) : lateNight ? (
            <Text style={styles.lateNight}>🌙 madrugada</Text>
          ) : (
            <Text style={styles.statusDim}>Rodada {match.round}</Text>
          )}
        </View>

        <View style={[styles.side, styles.sideRight]}>
          <Text
            style={[styles.team, styles.teamRight, selected.has(match.away) && styles.teamSelected]}
            numberOfLines={1}
          >
            {teamName(match.away)}
          </Text>
          <View style={styles.flagWrap}>
            <Text style={styles.flag}>{teamFlag(match.away)}</Text>
          </View>
        </View>
      </View>
    </Pressable>
  );
});

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    paddingVertical: spacing(3),
    paddingHorizontal: spacing(3),
    marginBottom: spacing(2),
    overflow: 'hidden',
  },
  cardLive: { borderColor: colors.live },
  cardPressed: { opacity: 0.6 },
  liveBar: { position: 'absolute', left: 0, top: 0, bottom: 0, width: 3, backgroundColor: colors.live },
  teamsRow: { flexDirection: 'row', alignItems: 'center' },
  side: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: spacing(2) },
  sideRight: { justifyContent: 'flex-end' },
  flagWrap: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: colors.surface2,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  flag: { fontSize: 22 },
  team: { color: colors.text, fontFamily: fonts.semibold, fontSize: 15, flexShrink: 1 },
  teamRight: { textAlign: 'right' },
  teamSelected: { color: colors.accent, fontFamily: fonts.bold },
  center: { alignItems: 'center', minWidth: 82, paddingHorizontal: spacing(2) },
  time: { color: colors.text, fontFamily: fonts.display, fontSize: 20, fontVariant: ['tabular-nums'] },
  score: { color: colors.text, fontFamily: fonts.display, fontSize: 24, fontVariant: ['tabular-nums'] },
  statusDim: { color: colors.textFaint, fontFamily: fonts.medium, fontSize: 11, marginTop: 3 },
  predictionTag: { color: colors.amber, fontFamily: fonts.bold, fontSize: 11, marginTop: 3 },
  lateNight: { color: colors.amber, fontFamily: fonts.bold, fontSize: 10.5, marginTop: 3, letterSpacing: 0.3 },
  liveBadge: { marginTop: 4, backgroundColor: 'rgba(255,77,94,0.16)', borderRadius: radius.pill, paddingHorizontal: 8, paddingVertical: 2 },
  liveText: { color: colors.live, fontFamily: fonts.extrabold, fontSize: 10, letterSpacing: 0.4 },
});
