import React, { useEffect, useMemo, useState } from 'react';
import { AppState, Pressable, RefreshControl, SectionList, StyleSheet, Text, View } from 'react-native';

import { MatchCard } from '../components/MatchCard';
import { NextMatchHero } from '../components/NextMatchHero';
import { TeamStatusBanner } from '../components/TeamStatusBanner';
import { AdBanner } from '../components/AdBanner';
import { MatchDetailSheet } from './MatchDetailSheet';
import { DayMatchesSheet } from './DayMatchesSheet';
import { PastMatchesSheet } from './PastMatchesSheet';
import { FadeInUp } from '../components/Motion';
import { hasStarted, hasMatchInPlayWindow, isFinished, isLive, kickoff, nextRelevantMatchFor, Match } from '../data/fixtures';
import { openSuggestion } from '../lib/links';
import { isStale } from '../lib/freshness';
import { useStore } from '../lib/store';
import { localDayKey, relativeDayLabel } from '../lib/format';
import { fonts, radius, spacing } from '../lib/theme';
import { useThemedStyles, useTheme, type ThemeTokens } from '../lib/theme-context';

type DaySection = {
  key: string;
  title: string;
  data: Match[];
};

function updatedLabel(updatedAt: number | null): string {
  if (!updatedAt) return 'puxe para atualizar';
  const mins = Math.floor((Date.now() - updatedAt) / 60000);
  if (mins < 1) return 'atualizado agora';
  if (mins < 60) return `atualizado há ${mins} min`;
  const h = Math.floor(mins / 60);
  return `atualizado há ${h}h`;
}

/** Agrupa os jogos (futuros/ao vivo) por dia, no fuso local. */
function groupByDay(list: Match[]): DaySection[] {
  const byDay = new Map<string, Match[]>();
  for (const m of list) {
    const key = localDayKey(kickoff(m));
    const arr = byDay.get(key) ?? [];
    arr.push(m);
    byDay.set(key, arr);
  }
  return [...byDay.entries()].map(([key, data]) => ({
    key,
    title: relativeDayLabel(kickoff(data[0])),
    data,
  }));
}

// Aviso anti-apostas: aparece só nos primeiros ~15s da sessão; some ao trocar de
// aba ou no fim do tempo, e não volta (flag de módulo = dura enquanto o app vive).
let antiBetsDismissed = false;

export function ScheduleScreen() {
  const styles = useThemedStyles(makeStyles);
  const { c } = useTheme();
  const { selected, matches, settings, refresh, refreshing, updatedAt, online, predictions } = useStore();
  const [detail, setDetail] = useState<Match | null>(null);
  const [dayOpen, setDayOpen] = useState(false);
  const [pastOpen, setPastOpen] = useState(false);
  const [showAntiBets, setShowAntiBets] = useState(!antiBetsDismissed);

  // Esconde o aviso anti-apostas após 15s — ou ao sair da aba (cleanup). Não reaparece.
  useEffect(() => {
    if (!showAntiBets) return;
    const t = setTimeout(() => { antiBetsDismissed = true; setShowAntiBets(false); }, 15000);
    return () => { clearTimeout(t); antiBetsDismissed = true; };
  }, [showAntiBets]);

  // Ao abrir a aba (mount), reatualiza se o cache estiver VELHO (por idade, não só
  // se estiver vazio) — cobre a troca de aba com dados defasados. Independe de
  // seleção: a grade é global; seleção só afeta avisos/hero.
  useEffect(() => {
    const now = Date.now();
    const inWindow = hasMatchInPlayWindow(matches, new Date(now));
    if (!refreshing && isStale(updatedAt, now, inWindow, settings.dataSaver)) refresh();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Mostra TODOS os jogos (não filtra por seleção). As seleções marcadas servem
  // só para notificações; os jogos de todo mundo aparecem aqui. O hero prioriza a
  // seleção PRINCIPAL do usuário (modo "minha seleção"), se houver.
  const hero = useMemo(
    () => nextRelevantMatchFor(matches, settings.primaryTeam),
    [matches, settings.primaryTeam],
  );
  const hasLive = useMemo(() => matches.some((m) => isLive(m)), [matches]);
  // Janela de relógio: liga o poll perto do horário dos jogos mesmo que o status
  // no cache ainda não diga "ao vivo" — é a rede que confirma ao vivo/encerrado.
  const hasMatchInWindow = useMemo(() => hasMatchInPlayWindow(matches), [matches]);
  const anyToday = useMemo(() => {
    const key = localDayKey(new Date());
    return matches.some((m) => localDayKey(kickoff(m)) === key);
  }, [matches]);

  // Atualização automática enquanto há jogo AO VIVO: faz polling com backoff
  // (30s → 120s) só com o app em primeiro plano e fora do modo economia. Pausa
  // em background e quando não há jogo ao vivo. Evita o pull-to-refresh manual.
  const autoOn = (hasLive || hasMatchInWindow) && !settings.dataSaver;
  useEffect(() => {
    if (!autoOn) return;
    let alive = true;
    let delay = 30000;
    let timer: ReturnType<typeof setTimeout>;
    const tick = async () => {
      if (AppState.currentState === 'active') await refresh();
      if (!alive) return;
      delay = Math.min(Math.round(delay * 1.5), 120000);
      timer = setTimeout(tick, delay);
    };
    timer = setTimeout(tick, delay);
    const sub = AppState.addEventListener('change', (s) => {
      // ao voltar pro primeiro plano, atualiza já e reinicia o backoff
      if (s === 'active' && alive) {
        refresh();
        delay = 30000;
      }
    });
    return () => {
      alive = false;
      clearTimeout(timer);
      sub.remove();
    };
  }, [autoOn, refresh]);

  // Abre o detalhe do próximo jogo (ainda não encerrado) de uma seleção.
  const openTeamNext = (teamId: string) => {
    const now = Date.now();
    const m = matches
      .filter((x) => (x.home === teamId || x.away === teamId) && !isFinished(x) && kickoff(x).getTime() > now)
      .sort((a, b) => a.utc.localeCompare(b.utc))[0];
    if (m) setDetail(m);
  };

  // A lista mostra só os "próximos" (ao vivo/futuro). Os "passados" (encerrados ou
  // já iniciados que não estão ao vivo) ficam na sheet "Jogos passados", aberta
  // pelo botão no topo — mantém a grade enxuta e o histórico a um toque.
  const { sections, hasPast } = useMemo(() => {
    const now = new Date();
    const upcoming: Match[] = [];
    let pastCount = 0;
    for (const m of matches) {
      if (isFinished(m) || (hasStarted(m, now) && !isLive(m, now))) pastCount++;
      else upcoming.push(m);
    }
    return { sections: groupByDay(upcoming), hasPast: pastCount > 0 };
  }, [matches]);

  return (
    <View style={styles.container}>
      {showAntiBets && (
        <View style={styles.noBetsBanner} accessibilityRole="text">
          <Text style={styles.noBetsIcon}>🚫</Text>
          <Text style={styles.noBetsText}>
            Temos noção do prejuízo que apostas podem trazer. Por isso, aqui você nunca verá anúncios de bets.
          </Text>
        </View>
      )}
      <View style={styles.header}>
        <Text style={styles.title}>Jogos da Copa</Text>
        <Text style={[styles.subtitle, !online && styles.subtitleOffline]}>
          {!online
            ? '⚠️ Sem internet · mostrando dados salvos'
            : `${hasLive && autoOn ? '🟢 ao vivo · ' : ''}${updatedLabel(updatedAt)}`}
        </Text>
        <View style={styles.headerBtns}>
          {anyToday && (
            <Pressable
              onPress={() => setDayOpen(true)}
              accessibilityRole="button"
              accessibilityLabel="Ver todos os jogos de hoje"
              style={({ pressed }) => [styles.headerBtn, pressed && styles.shareTodayPressed]}
            >
              <Text style={styles.shareTodayText}>📅 Jogos de hoje</Text>
            </Pressable>
          )}
          {hasPast && (
            <Pressable
              onPress={() => setPastOpen(true)}
              accessibilityRole="button"
              accessibilityLabel="Ver jogos passados"
              style={({ pressed }) => [styles.headerBtn, styles.pastHeaderBtn, pressed && styles.shareTodayPressed]}
            >
              <Text style={styles.pastHeaderText}>🏁 Jogos passados</Text>
            </Pressable>
          )}
          <Pressable
            onPress={openSuggestion}
            accessibilityRole="button"
            accessibilityLabel="Enviar sugestão"
            style={({ pressed }) => [styles.headerBtn, styles.suggestionBtn, pressed && styles.shareTodayPressed]}
          >
            <Text style={styles.suggestionText}>💬 Sugestão</Text>
          </Pressable>
        </View>
      </View>
      <SectionList
        sections={sections}
        keyExtractor={(item) => item.id}
        stickySectionHeadersEnabled={false}
        contentContainerStyle={{ paddingBottom: spacing(10), paddingHorizontal: spacing(4) }}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={refresh}
            tintColor={c.accent}
            colors={[c.accent]}
          />
        }
        ListHeaderComponent={
          <>
            <TeamStatusBanner
              matches={matches}
              selected={selected}
              primaryTeam={settings.primaryTeam}
              onPressTeam={openTeamNext}
            />
            {hero ? (
              <FadeInUp>
                <NextMatchHero match={hero} onPress={() => setDetail(hero)} />
              </FadeInUp>
            ) : null}
          </>
        }
        renderSectionHeader={({ section }) => <Text style={styles.day}>{section.title}</Text>}
        renderSectionFooter={({ section }) =>
          sections.length > 0 && (section as DaySection).key === sections[0].key ? <AdBanner /> : null
        }
        renderItem={({ item }) => (
          <MatchCard
            match={item}
            selected={selected}
            primaryTeam={settings.primaryTeam}
            prediction={predictions[item.id]}
            onPress={() => setDetail(item)}
          />
        )}
      />
      <MatchDetailSheet
        match={detail ? (matches.find((m) => m.id === detail.id) ?? detail) : null}
        matches={matches}
        selected={selected}
        onClose={() => setDetail(null)}
      />
      <DayMatchesSheet
        visible={dayOpen}
        matches={matches}
        selected={selected}
        primaryTeam={settings.primaryTeam}
        onClose={() => setDayOpen(false)}
        onSelectMatch={(m) => {
          setDayOpen(false);
          setDetail(m);
        }}
      />
      <PastMatchesSheet
        visible={pastOpen}
        matches={matches}
        selected={selected}
        primaryTeam={settings.primaryTeam}
        onClose={() => setPastOpen(false)}
        onSelectMatch={(m) => {
          setPastOpen(false);
          setDetail(m);
        }}
      />
    </View>
  );
}

const makeStyles = ({ c, st }: ThemeTokens) => StyleSheet.create({
  container: { flex: 1 },
  noBetsBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing(2),
    marginHorizontal: spacing(4),
    marginTop: spacing(2),
    paddingVertical: spacing(2),
    paddingHorizontal: spacing(3),
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: c.border,
    backgroundColor: c.surface,
  },
  noBetsIcon: { fontSize: 16 },
  noBetsText: { flex: 1, color: c.textDim, fontFamily: fonts.semibold, fontSize: 12, lineHeight: 16 },
  header: { paddingHorizontal: spacing(4), paddingTop: spacing(2), paddingBottom: spacing(3) },
  title: { color: c.text, fontFamily: fonts.display, fontSize: 36, letterSpacing: 0.3 },
  subtitle: { color: c.textDim, fontFamily: fonts.medium, fontSize: 13, marginTop: 2 },
  subtitleOffline: { color: c.amber },
  headerBtns: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing(2), marginTop: spacing(2) },
  headerBtn: {
    paddingVertical: 5,
    paddingHorizontal: spacing(3),
    borderRadius: radius.pill,
    borderWidth: 1,
    borderColor: c.accent,
    backgroundColor: st.favoriteBg,
  },
  suggestionBtn: { borderColor: c.border, backgroundColor: 'transparent' },
  pastHeaderBtn: { borderColor: c.border, backgroundColor: c.surface },
  shareTodayPressed: { opacity: 0.6 },
  shareTodayText: { color: c.accent, fontFamily: fonts.bold, fontSize: 12.5 },
  suggestionText: { color: c.textDim, fontFamily: fonts.bold, fontSize: 12.5 },
  pastHeaderText: { color: c.textDim, fontFamily: fonts.bold, fontSize: 12.5 },
  day: {
    color: c.accent,
    fontFamily: fonts.extrabold,
    fontSize: 13,
    letterSpacing: 0.5,
    marginTop: spacing(5),
    marginBottom: spacing(2),
    textTransform: 'uppercase',
  },
  empty: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: spacing(8) },
  emptyEmoji: { fontSize: 52, marginBottom: spacing(4) },
  emptyTitle: { color: c.text, fontFamily: fonts.bold, fontSize: 21, marginBottom: spacing(2), textAlign: 'center' },
  emptyText: { color: c.textDim, fontFamily: fonts.regular, fontSize: 15, textAlign: 'center', lineHeight: 22 },
  bold: { color: c.accent, fontFamily: fonts.bold },
});
