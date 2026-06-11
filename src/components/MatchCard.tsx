import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { Match, kickoff, hasStarted, isLive, isFinished } from '../data/fixtures';
import { teamFlag, teamName } from '../data/teams';
import { formatTime } from '../lib/format';
import { Prediction } from '../lib/storage';
import { oddsFor } from '../data/odds';
import { BOOKMAKERS, buildAffiliateUrl } from '../lib/odds';
import { openUrl } from '../lib/links';
import { colors, fonts, radius, spacing } from '../lib/theme';

type Props = {
  match: Match;
  /** Ids das seleções marcadas, para destacar quem você acompanha. */
  selected: Set<string>;
  /** Palpite do usuário para este jogo (exibido se não houver placar real). */
  prediction?: Prediction;
  /** Mostrar as cotações de vitória no card (já considera kill-switch + 18+). */
  showOdds?: boolean;
  onPress?: () => void;
};

export const MatchCard = React.memo(function MatchCard({ match, selected, prediction, showOdds, onPress }: Props) {
  const ko = kickoff(match);
  const live = isLive(match);
  const finished = isFinished(match);
  const started = hasStarted(match);
  const hasScore = match.homeScore != null && match.awayScore != null;

  // Cotações só em jogos que ainda não começaram (odds pré-jogo).
  const book = BOOKMAKERS[0];
  const odds = showOdds && !started && !finished && !hasScore ? oddsFor(match, book.id) : null;
  const openOdds = () => openUrl(buildAffiliateUrl(book, match));

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
          {hasScore ? (
            <Text style={styles.score}>
              {match.homeScore}–{match.awayScore}
            </Text>
          ) : (
            <Text style={styles.time}>{formatTime(ko)}</Text>
          )}
          {live ? (
            <View style={styles.liveBadge}>
              <Text style={styles.liveText}>● AO VIVO</Text>
            </View>
          ) : finished ? (
            <Text style={styles.statusDim}>Encerrado</Text>
          ) : started ? (
            <Text style={styles.statusDim}>Em andamento</Text>
          ) : !hasScore && prediction ? (
            <Text style={styles.predictionTag}>
              🔮 {prediction.home}–{prediction.away}
            </Text>
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

      {odds && (
        <View style={styles.oddsBlock}>
          <View style={styles.oddsRow}>
            <Pressable
              style={styles.oddPill}
              onPress={openOdds}
              accessibilityRole="button"
              accessibilityLabel={`Apostar na vitória de ${teamName(match.home)} na ${book.name}`}
            >
              <Text style={styles.oddPillLabel} numberOfLines={1}>{teamName(match.home)}</Text>
              <Text style={styles.oddPillValue}>{odds.home.toFixed(2)}</Text>
            </Pressable>
            <Pressable
              style={styles.oddPill}
              onPress={openOdds}
              accessibilityRole="button"
              accessibilityLabel={`Apostar na vitória de ${teamName(match.away)} na ${book.name}`}
            >
              <Text style={styles.oddPillLabel} numberOfLines={1}>{teamName(match.away)}</Text>
              <Text style={styles.oddPillValue}>{odds.away.toFixed(2)}</Text>
            </Pressable>
          </View>
          <Text style={styles.oddsCaption}>Cotações {book.name} · Publicidade · +18</Text>
        </View>
      )}
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
  time: { color: colors.text, fontFamily: fonts.display, fontSize: 20 },
  score: { color: colors.text, fontFamily: fonts.display, fontSize: 24 },
  statusDim: { color: colors.textFaint, fontFamily: fonts.medium, fontSize: 11, marginTop: 3 },
  predictionTag: { color: colors.amber, fontFamily: fonts.bold, fontSize: 11, marginTop: 3 },
  liveBadge: { marginTop: 4, backgroundColor: 'rgba(255,77,94,0.16)', borderRadius: radius.pill, paddingHorizontal: 8, paddingVertical: 2 },
  liveText: { color: colors.live, fontFamily: fonts.extrabold, fontSize: 10, letterSpacing: 0.4 },

  oddsBlock: { marginTop: spacing(3), paddingTop: spacing(3), borderTopWidth: 1, borderTopColor: colors.border },
  oddsRow: { flexDirection: 'row', gap: spacing(2) },
  oddPill: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing(2),
    backgroundColor: colors.surface2,
    borderWidth: 1,
    borderColor: colors.borderBright,
    borderRadius: radius.sm,
    paddingVertical: spacing(2),
    paddingHorizontal: spacing(3),
  },
  oddPillLabel: { color: colors.textDim, fontFamily: fonts.semibold, fontSize: 12, flexShrink: 1 },
  oddPillValue: { color: colors.accent, fontFamily: fonts.bold, fontSize: 15 },
  oddsCaption: { color: colors.textFaint, fontFamily: fonts.regular, fontSize: 10, marginTop: spacing(2) },
});
