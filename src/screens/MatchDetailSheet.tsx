import React, { useState } from 'react';
import { Modal, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';

import { Flag } from '../components/Flag';
import { StandingsTable } from '../components/StandingsTable';
import { PredictionEditor } from '../components/PredictionEditor';
import { Match, kickoff, isPredictable, matchDisplay } from '../data/fixtures';
import { getTeam, teamName } from '../data/teams';
import { standingsForGroup } from '../data/standings';
import { teamOutlook } from '../data/scenarios';
import { broadcastersFor, kindLabel, watchUrl } from '../data/broadcasters';
import { MatchTimeline, type LiveClock } from '../components/MatchTimeline';
import { MatchStats } from '../components/MatchStats';
import { AdBanner } from '../components/AdBanner';
import { formatDayLong, formatTime } from '../lib/format';
import { openUrl } from '../lib/links';
import { shareMatch } from '../lib/share';
import { useStore } from '../lib/store';
import { fonts, radius, spacing } from '../lib/theme';
import { useThemedStyles, useTheme, type ThemeTokens } from '../lib/theme-context';

type Props = {
  match: Match | null;
  matches: Match[];
  selected: Set<string>;
  onClose: () => void;
};

export function MatchDetailSheet({ match, matches, selected, onClose }: Props) {
  const styles = useThemedStyles(makeStyles);
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
  const styles = useThemedStyles(makeStyles);
  const { g } = useTheme();
  const { predictions, setPrediction, clearPrediction, settings, updateSettings, toggleFollowMatch, isFollowingMatch } = useStore();
  const ko = kickoff(match);
  const following = isFollowingMatch(match.id);
  const [clock, setClock] = useState<LiveClock | null>(null);

  // Seguir os gols deste jogo. Se o push de gol estiver desligado, ligar no modo
  // "minhas seleções" (senão o 🔔 não teria efeito — evita confusão).
  const onToggleFollow = () => {
    const willFollow = !following;
    toggleFollowMatch(match.id);
    if (willFollow && settings.goalPush === 'off') updateSettings({ goalPush: 'mine' });
  };
  // Estado confirmado (nunca pelo relógio): 'unconfirmed' (apito passou mas sem
  // status reconciliado) cai em neutro 'RODADA N' e esconde placar parcial/preso.
  const d = matchDisplay(match);
  const live = d.state === 'live';
  const finished = d.state === 'finished' || d.state === 'awaiting';
  const hasScore = d.showScore;

  const homeGroup = getTeam(match.home)?.group;
  const awayGroup = getTeam(match.away)?.group;
  const sameGroup = homeGroup && homeGroup === awayGroup ? homeGroup : null;
  const standings = sameGroup ? standingsForGroup(matches, sameGroup) : [];
  // Cenário de classificação (100% provável) de cada time deste jogo de grupo.
  const outlooks = sameGroup
    ? [match.home, match.away]
        .map((id) => ({ id, o: teamOutlook(matches, id) }))
        .filter((x): x is { id: string; o: NonNullable<typeof x.o> } => !!x.o)
    : [];

  return (
    <View style={styles.sheet}>
      <View style={styles.grabber} />
      <View style={styles.sheetHeader}>
        <View style={styles.headerLeft}>
          <Pressable
            onPress={() => shareMatch(match)}
            accessibilityRole="button"
            accessibilityLabel="Compartilhar no WhatsApp"
            hitSlop={8}
          >
            <Text style={styles.shareText}>↗ Compartilhar</Text>
          </Pressable>
          {!finished && !match.stageLabel && (
            <Pressable
              onPress={onToggleFollow}
              accessibilityRole="button"
              accessibilityState={{ selected: following }}
              accessibilityLabel={following ? 'Deixar de seguir os gols deste jogo' : 'Seguir os gols deste jogo'}
              hitSlop={8}
            >
              <Text style={[styles.followText, following && styles.followTextActive]}>
                {following ? '🔔 Seguindo' : '🔕 Seguir gols'}
              </Text>
            </Pressable>
          )}
        </View>
        <Pressable onPress={onClose} accessibilityRole="button" accessibilityLabel="Fechar" hitSlop={8}>
          <Text style={styles.closeText}>✕</Text>
        </Pressable>
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: spacing(8) }}>
        <LinearGradient
          colors={live ? g.live : g.hero}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.scoreCard}
        >
          <Text style={styles.headLabel}>
            {live
              ? clock?.halftime
                ? 'INTERVALO'
                : `AO VIVO${clock?.clock ? ` · ${clock.clock}` : ''}`
              : finished ? 'ENCERRADO' : match.stageLabel ? match.stageLabel.toUpperCase() : `RODADA ${match.round}`}
          </Text>
          <View style={styles.scoreRow}>
            <View style={styles.teamCol}>
              <Flag teamId={match.home} size={58} radius={17} />
              <Text style={styles.teamName} numberOfLines={2}>
                {match.homeLabel ?? teamName(match.home)}
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
              <Flag teamId={match.away} size={58} radius={17} />
              <Text style={styles.teamName} numberOfLines={2}>
                {match.awayLabel ?? teamName(match.away)}
              </Text>
            </View>
          </View>
        </LinearGradient>

        {/* Lance a lance ao vivo (ESPN) — minuto, gols, cartões. Só p/ jogos iniciados. */}
        <MatchTimeline match={match} onClock={setClock} />

        {/* Escalações + estatísticas (ESPN summary). Só p/ jogos iniciados. */}
        <MatchStats match={match} />

        {isPredictable(match) ? (
          <PredictionEditor
            match={match}
            prediction={predictions[match.id]}
            onChange={(p) => setPrediction(match.id, p)}
            onClear={() => clearPrediction(match.id)}
          />
        ) : !hasScore && !live && !finished ? (
          <View style={styles.lockedNote}>
            <Text style={styles.lockedNoteText}>🔒 Palpites fecham no apito inicial.</Text>
          </View>
        ) : null}

        <View style={styles.infoCard}>
          <InfoRow icon="🗓️" label="Data" value={`${formatDayLong(ko)} · ${formatTime(ko)}`} hint="no seu fuso" />
          {match.venue && <InfoRow icon="📍" label="Estádio" value={match.venue} />}
          {sameGroup && <InfoRow icon="🏷️" label="Grupo" value={`Grupo ${sameGroup}`} />}
        </View>

        {/* Onde assistir */}
        <View style={styles.watchCard}>
          <Text style={styles.watchTitle}>📺 Onde assistir</Text>
          {broadcastersFor(match).map((b) => {
            const url = watchUrl(b, match);
            return (
              <Pressable
                key={b.id}
                style={[styles.watchRow, b.free && styles.watchRowFree]}
                onPress={url ? () => openUrl(url) : undefined}
                disabled={!url}
                accessibilityRole={url ? 'link' : 'text'}
                accessibilityLabel={`${b.name}${b.free ? ', grátis' : ''}${url ? ', abrir' : ''}`}
              >
                <Text style={styles.watchEmoji}>{b.emoji}</Text>
                <View style={styles.flex1}>
                  <Text style={styles.watchName}>{b.name}</Text>
                  <Text style={styles.watchKind}>
                    {b.free ? 'Grátis' : 'Pago'} · {kindLabel(b.kind)}
                  </Text>
                </View>
                {url ? (
                  <Text style={[styles.watchCta, b.free && styles.watchCtaFree]}>
                    {b.search ? 'Assistir ▶' : 'Abrir ›'}
                  </Text>
                ) : null}
              </Pressable>
            );
          })}
          <Text style={styles.watchNote}>A grade pode variar por jogo. Toque na CazéTV para abrir o jogo ao vivo no YouTube.</Text>
        </View>

        {/* Anúncio entre "Onde assistir" e "Classificação" (jogos iniciados e não iniciados). */}
        <AdBanner />

        {sameGroup && standings.length > 0 && (
          <View style={styles.tableCard}>
            <Text style={styles.tableTitle}>Classificação · Grupo {sameGroup}</Text>
            <StandingsTable standings={standings} selected={selected} primaryTeam={settings.primaryTeam} />
          </View>
        )}

        {outlooks.length > 0 && (
          <View style={styles.tableCard}>
            <Text style={styles.tableTitle}>📊 Cenário de classificação</Text>
            {outlooks.map(({ id, o }) => (
              <View key={id} style={styles.scenarioRow}>
                <View style={styles.scenarioHead}>
                  <Flag teamId={id} size={20} radius={6} />
                  <Text style={styles.scenarioTeam}>{teamName(id)}</Text>
                </View>
                <Text style={styles.scenarioText}>{o.phraseLong}</Text>
              </View>
            ))}
            <Text style={styles.scenarioNote}>
              Cálculo automático sobre os resultados reais do grupo. "Vaga direta" = 1º ou 2º.
            </Text>
          </View>
        )}
      </ScrollView>
    </View>
  );
}

function InfoRow({ icon, label, value, hint }: { icon: string; label: string; value: string; hint?: string }) {
  const styles = useThemedStyles(makeStyles);
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

const makeStyles = ({ c }: ThemeTokens) => StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'flex-end' },
  dismissArea: { flex: 1 },
  sheet: {
    backgroundColor: c.bgElev,
    borderTopLeftRadius: radius.xl,
    borderTopRightRadius: radius.xl,
    borderTopWidth: 1,
    borderColor: c.border,
    paddingHorizontal: spacing(5),
    paddingTop: spacing(3),
    maxHeight: '88%',
  },
  grabber: { width: 44, height: 5, borderRadius: 3, backgroundColor: c.borderBright, alignSelf: 'center', marginBottom: spacing(3) },
  sheetHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing(3),
  },
  headerLeft: { flexDirection: 'row', alignItems: 'center', gap: spacing(4) },
  closeText: { color: c.textDim, fontFamily: fonts.bold, fontSize: 18 },
  shareText: { color: c.accent, fontFamily: fonts.bold, fontSize: 13 },
  followText: { color: c.textDim, fontFamily: fonts.bold, fontSize: 13 },
  followTextActive: { color: c.amber },
  scoreCard: { borderRadius: radius.xl, padding: spacing(5), marginBottom: spacing(4) },
  headLabel: { color: 'rgba(255,255,255,0.9)', fontFamily: fonts.display, fontSize: 13, letterSpacing: 1, textAlign: 'center' },
  scoreRow: { flexDirection: 'row', alignItems: 'center', marginTop: spacing(4) },
  teamCol: { flex: 1, alignItems: 'center', gap: spacing(2) },
  flag: { fontSize: 48 },
  teamName: { color: '#fff', fontFamily: fonts.bold, fontSize: 16, textAlign: 'center' },
  middle: { paddingHorizontal: spacing(2), minWidth: 70, alignItems: 'center' },
  score: { color: '#fff', fontFamily: fonts.display, fontSize: 44, fontVariant: ['tabular-nums'] },
  time: { color: '#fff', fontFamily: fonts.display, fontSize: 30, fontVariant: ['tabular-nums'] },
  infoCard: {
    backgroundColor: c.surface,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: c.border,
    padding: spacing(4),
    marginBottom: spacing(4),
    gap: spacing(3),
  },
  infoRow: { flexDirection: 'row', alignItems: 'center', gap: spacing(3) },
  infoIcon: { fontSize: 20, width: 26, textAlign: 'center' },
  flex1: { flex: 1 },
  infoLabel: { color: c.textFaint, fontFamily: fonts.bold, fontSize: 11, textTransform: 'uppercase', letterSpacing: 0.5 },
  infoValue: { color: c.text, fontFamily: fonts.semibold, fontSize: 15, marginTop: 1 },
  infoHint: { color: c.textDim, fontFamily: fonts.regular, fontSize: 12 },
  watchCard: {
    backgroundColor: c.surface,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: c.border,
    padding: spacing(4),
    marginBottom: spacing(4),
  },
  watchTitle: { color: c.text, fontFamily: fonts.bold, fontSize: 14, marginBottom: spacing(3) },
  watchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing(3),
    paddingVertical: spacing(3),
    paddingHorizontal: spacing(3),
    borderRadius: radius.md,
    backgroundColor: c.surface2,
    borderWidth: 1,
    borderColor: c.border,
    marginBottom: spacing(2),
  },
  watchRowFree: { borderColor: c.accent },
  watchEmoji: { fontSize: 22, width: 28, textAlign: 'center' },
  watchName: { color: c.text, fontFamily: fonts.bold, fontSize: 15 },
  watchKind: { color: c.textDim, fontFamily: fonts.regular, fontSize: 12, marginTop: 1 },
  watchCta: { color: c.textDim, fontFamily: fonts.bold, fontSize: 13 },
  watchCtaFree: { color: c.accent },
  watchNote: { color: c.textFaint, fontFamily: fonts.regular, fontSize: 12, lineHeight: 17, marginTop: spacing(1) },
  tableCard: {
    backgroundColor: c.surface,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: c.border,
    padding: spacing(4),
  },
  tableTitle: { color: c.text, fontFamily: fonts.bold, fontSize: 14, marginBottom: spacing(3) },
  scenarioRow: { marginBottom: spacing(3) },
  scenarioHead: { flexDirection: 'row', alignItems: 'center', gap: spacing(2), marginBottom: 4 },
  scenarioTeam: { color: c.text, fontFamily: fonts.bold, fontSize: 14 },
  scenarioText: { color: c.textDim, fontFamily: fonts.regular, fontSize: 13.5, lineHeight: 19 },
  scenarioNote: { color: c.textFaint, fontFamily: fonts.regular, fontSize: 11.5, lineHeight: 16, marginTop: spacing(1) },
  lockedNote: {
    backgroundColor: c.surface,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: c.border,
    padding: spacing(3),
    marginBottom: spacing(4),
    alignItems: 'center',
  },
  lockedNoteText: { color: c.textDim, fontFamily: fonts.semibold, fontSize: 13 },
});
