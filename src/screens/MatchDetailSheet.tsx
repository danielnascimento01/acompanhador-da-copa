import React from 'react';
import { Modal, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';

import { StandingsTable } from '../components/StandingsTable';
import { Match, kickoff, isLive, isFinished } from '../data/fixtures';
import { getTeam, teamFlag, teamName } from '../data/teams';
import { standingsForGroup } from '../data/standings';
import { formatDayLong, formatTime } from '../lib/format';
import { colors, fonts, gradients, radius, spacing } from '../lib/theme';

type Props = {
  match: Match | null;
  matches: Match[];
  selected: Set<string>;
  onClose: () => void;
};

export function MatchDetailSheet({ match, matches, selected, onClose }: Props) {
  return (
    <Modal visible={!!match} animationType="slide" transparent onRequestClose={onClose}>
      <View style={styles.backdrop}>
        <Pressable style={styles.dismissArea} onPress={onClose} accessibilityLabel="Fechar" />
        {match && <Content match={match} matches={matches} selected={selected} onClose={onClose} />}
      </View>
    </Modal>
  );
}

function Content({ match, matches, selected, onClose }: { match: Match } & Omit<Props, 'match'>) {
  const ko = kickoff(match);
  const live = isLive(match);
  const finished = isFinished(match);
  const hasScore = match.homeScore != null && match.awayScore != null;

  const homeGroup = getTeam(match.home)?.group;
  const awayGroup = getTeam(match.away)?.group;
  const sameGroup = homeGroup && homeGroup === awayGroup ? homeGroup : null;
  const standings = sameGroup ? standingsForGroup(matches, sameGroup) : [];

  return (
    <View style={styles.sheet}>
      <View style={styles.grabber} />
      <Pressable style={styles.closeBtn} onPress={onClose} accessibilityRole="button" accessibilityLabel="Fechar" hitSlop={10}>
        <Text style={styles.closeText}>✕</Text>
      </Pressable>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: spacing(8) }}>
        <LinearGradient
          colors={live ? gradients.live : gradients.hero}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.scoreCard}
        >
          <Text style={styles.headLabel}>
            {live ? 'AO VIVO' : finished ? 'ENCERRADO' : `RODADA ${match.round}`}
          </Text>
          <View style={styles.scoreRow}>
            <View style={styles.teamCol}>
              <Text style={styles.flag}>{teamFlag(match.home)}</Text>
              <Text style={styles.teamName} numberOfLines={2}>
                {teamName(match.home)}
              </Text>
            </View>
            <View style={styles.middle}>
              {hasScore ? (
                <Text style={styles.score}>
                  {match.homeScore}–{match.awayScore}
                </Text>
              ) : (
                <Text style={styles.time}>{formatTime(ko)}</Text>
              )}
            </View>
            <View style={styles.teamCol}>
              <Text style={styles.flag}>{teamFlag(match.away)}</Text>
              <Text style={styles.teamName} numberOfLines={2}>
                {teamName(match.away)}
              </Text>
            </View>
          </View>
        </LinearGradient>

        <View style={styles.infoCard}>
          <InfoRow icon="🗓️" label="Data" value={`${formatDayLong(ko)} · ${formatTime(ko)}`} hint="no seu fuso" />
          {match.venue && <InfoRow icon="📍" label="Estádio" value={match.venue} />}
          {sameGroup && <InfoRow icon="🏷️" label="Grupo" value={`Grupo ${sameGroup}`} />}
        </View>

        {sameGroup && standings.length > 0 && (
          <View style={styles.tableCard}>
            <Text style={styles.tableTitle}>Classificação · Grupo {sameGroup}</Text>
            <StandingsTable standings={standings} selected={selected} />
          </View>
        )}
      </ScrollView>
    </View>
  );
}

function InfoRow({ icon, label, value, hint }: { icon: string; label: string; value: string; hint?: string }) {
  return (
    <View style={styles.infoRow}>
      <Text style={styles.infoIcon}>{icon}</Text>
      <View style={styles.flex1}>
        <Text style={styles.infoLabel}>{label}</Text>
        <Text style={styles.infoValue}>
          {value}
          {hint ? <Text style={styles.infoHint}>{`  ${hint}`}</Text> : null}
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'flex-end' },
  dismissArea: { flex: 1 },
  sheet: {
    backgroundColor: colors.bgElev,
    borderTopLeftRadius: radius.xl,
    borderTopRightRadius: radius.xl,
    borderTopWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: spacing(5),
    paddingTop: spacing(3),
    maxHeight: '88%',
  },
  grabber: { width: 44, height: 5, borderRadius: 3, backgroundColor: colors.borderBright, alignSelf: 'center', marginBottom: spacing(3) },
  closeBtn: { position: 'absolute', top: spacing(4), right: spacing(5), zIndex: 2 },
  closeText: { color: colors.textDim, fontFamily: fonts.bold, fontSize: 18 },
  scoreCard: { borderRadius: radius.xl, padding: spacing(5), marginBottom: spacing(4) },
  headLabel: { color: 'rgba(255,255,255,0.9)', fontFamily: fonts.display, fontSize: 13, letterSpacing: 1, textAlign: 'center' },
  scoreRow: { flexDirection: 'row', alignItems: 'center', marginTop: spacing(4) },
  teamCol: { flex: 1, alignItems: 'center', gap: spacing(2) },
  flag: { fontSize: 48 },
  teamName: { color: '#fff', fontFamily: fonts.bold, fontSize: 16, textAlign: 'center' },
  middle: { paddingHorizontal: spacing(2), minWidth: 70, alignItems: 'center' },
  score: { color: '#fff', fontFamily: fonts.display, fontSize: 44 },
  time: { color: '#fff', fontFamily: fonts.display, fontSize: 30 },
  infoCard: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing(4),
    marginBottom: spacing(4),
    gap: spacing(3),
  },
  infoRow: { flexDirection: 'row', alignItems: 'center', gap: spacing(3) },
  infoIcon: { fontSize: 20, width: 26, textAlign: 'center' },
  flex1: { flex: 1 },
  infoLabel: { color: colors.textFaint, fontFamily: fonts.bold, fontSize: 11, textTransform: 'uppercase', letterSpacing: 0.5 },
  infoValue: { color: colors.text, fontFamily: fonts.semibold, fontSize: 15, marginTop: 1 },
  infoHint: { color: colors.textDim, fontFamily: fonts.regular, fontSize: 12 },
  tableCard: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing(4),
  },
  tableTitle: { color: colors.text, fontFamily: fonts.bold, fontSize: 14, marginBottom: spacing(3) },
});
