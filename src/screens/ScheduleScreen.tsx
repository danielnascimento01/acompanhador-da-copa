import React, { useEffect, useMemo, useState } from 'react';
import { AppState, Pressable, RefreshControl, SectionList, StyleSheet, Text, View } from 'react-native';

import { MatchCard } from '../components/MatchCard';
import { NextMatchHero } from '../components/NextMatchHero';
import { TeamStatusBanner } from '../components/TeamStatusBanner';
import { MatchDetailSheet } from './MatchDetailSheet';
import { DayMatchesSheet } from './DayMatchesSheet';
import { FadeInUp } from '../components/Motion';
import { hasStarted, hasMatchInPlayWindow, isFinished, isLive, kickoff, nextRelevantMatchFor, Match } from '../data/fixtures';
import { isStale } from '../lib/freshness';
import { useStore } from '../lib/store';
import { localDayKey, relativeDayLabel } from '../lib/format';
import { colors, fonts, radius, spacing } from '../lib/theme';

type DaySection = {
  key: string;
  title: string;
  data: Match[];
  kind?: 'upcoming' | 'past';
  toggle?: boolean;
};

function updatedLabel(updatedAt: number | null): string {
  if (!updatedAt) return 'puxe para atualizar';
  const mins = Math.floor((Date.now() - updatedAt) / 60000);
  if (mins < 1) return 'atualizado agora';
  if (mins < 60) return `atualizado há ${mins} min`;
  const h = Math.floor(mins / 60);
  return `atualizado há ${h}h`;
}

/** Agrupa jogos por dia (no fuso local). `reverse` deixa os dias mais recentes no topo. */
function groupByDay(list: Match[], kind: 'upcoming' | 'past'): DaySection[] {
  const byDay = new Map<string, Match[]>();
  for (const m of list) {
    const key = localDayKey(kickoff(m));
    const arr = byDay.get(key) ?? [];
    arr.push(m);
    byDay.set(key, arr);
  }
  let entries = [...byDay.entries()];
  if (kind === 'past') entries = entries.reverse();
  return entries.map(([key, data]) => ({
    key,
    title: relativeDayLabel(kickoff(data[0])),
    data,
    kind,
  }));
}

export function ScheduleScreen() {
  const { selected, matches, settings, refresh, refreshing, updatedAt, online, predictions } = useStore();
  const [detail, setDetail] = useState<Match | null>(null);
  const [showPast, setShowPast] = useState(false);
  const [dayOpen, setDayOpen] = useState(false);

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

  // Reparte os jogos: "próximos" (ao vivo/futuro, fora o hero) vão na lista;
  // "passados" (encerrados ou já iniciados que não estão ao vivo) ficam escondidos
  // atrás do botão "Ver jogos passados".
  const { upcomingSections, pastSections } = useMemo(() => {
    const now = new Date();
    const upcoming: Match[] = [];
    const past: Match[] = [];
    for (const m of matches) {
      if (hero && m.id === hero.id) continue; // já aparece em destaque no topo
      if (isFinished(m) || (hasStarted(m, now) && !isLive(m, now))) past.push(m);
      else upcoming.push(m);
    }
    return {
      upcomingSections: groupByDay(upcoming, 'upcoming'),
      pastSections: groupByDay(past, 'past'),
    };
  }, [matches, hero]);

  const sections = useMemo<DaySection[]>(() => {
    if (pastSections.length === 0) return upcomingSections;
    const toggle: DaySection = { key: '__toggle__', title: '', data: [], toggle: true };
    return showPast
      ? [...upcomingSections, toggle, ...pastSections]
      : [...upcomingSections, toggle];
  }, [upcomingSections, pastSections, showPast]);

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.kicker}>AO VIVO & PRÓXIMOS</Text>
        <Text style={styles.title}>Jogos da Copa</Text>
        <Text style={[styles.subtitle, !online && styles.subtitleOffline]}>
          {!online
            ? '⚠️ Sem internet · mostrando dados salvos'
            : `${hasLive && autoOn ? '🟢 atualizando ao vivo' : hero ? 'Próximo jogo em destaque' : 'Sem jogos à frente'} · ${updatedLabel(updatedAt)}`}
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
            tintColor={colors.accent}
            colors={[colors.accent]}
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
        renderSectionHeader={({ section }) =>
          (section as DaySection).toggle ? (
            <Pressable
              onPress={() => setShowPast((v) => !v)}
              accessibilityRole="button"
              style={({ pressed }) => [styles.pastBtn, pressed && styles.pastBtnPressed]}
            >
              <Text style={styles.pastBtnText}>
                {showPast ? 'Ocultar jogos passados  ↑' : 'Ver jogos passados  ↓'}
              </Text>
            </Pressable>
          ) : (
            <Text style={[styles.day, (section as DaySection).kind === 'past' && styles.dayPast]}>
              {section.title}
            </Text>
          )
        }
        renderItem={({ item }) => (
          <MatchCard
            match={item}
            selected={selected}
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
        onClose={() => setDayOpen(false)}
        onSelectMatch={(m) => {
          setDayOpen(false);
          setDetail(m);
        }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { paddingHorizontal: spacing(4), paddingTop: spacing(2), paddingBottom: spacing(3) },
  kicker: { color: colors.accent, fontFamily: fonts.extrabold, fontSize: 11, letterSpacing: 1.5, textTransform: 'uppercase', marginBottom: 1 },
  title: { color: colors.text, fontFamily: fonts.display, fontSize: 36, letterSpacing: 0.3 },
  subtitle: { color: colors.textDim, fontFamily: fonts.medium, fontSize: 13, marginTop: 2 },
  subtitleOffline: { color: colors.amber },
  headerBtns: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing(2), marginTop: spacing(2) },
  headerBtn: {
    paddingVertical: 5,
    paddingHorizontal: spacing(3),
    borderRadius: radius.pill,
    borderWidth: 1,
    borderColor: colors.accent,
    backgroundColor: 'rgba(20,224,138,0.08)',
  },
  shareTodayPressed: { opacity: 0.6 },
  shareTodayText: { color: colors.accent, fontFamily: fonts.bold, fontSize: 12.5 },
  day: {
    color: colors.accent,
    fontFamily: fonts.extrabold,
    fontSize: 13,
    letterSpacing: 0.5,
    marginTop: spacing(5),
    marginBottom: spacing(2),
    textTransform: 'uppercase',
  },
  dayPast: { color: colors.textFaint },
  pastBtn: {
    marginTop: spacing(5),
    marginBottom: spacing(1),
    paddingVertical: spacing(3),
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    alignItems: 'center',
  },
  pastBtnPressed: { opacity: 0.6 },
  pastBtnText: { color: colors.textDim, fontFamily: fonts.bold, fontSize: 13, letterSpacing: 0.3 },
  empty: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: spacing(8) },
  emptyEmoji: { fontSize: 52, marginBottom: spacing(4) },
  emptyTitle: { color: colors.text, fontFamily: fonts.bold, fontSize: 21, marginBottom: spacing(2), textAlign: 'center' },
  emptyText: { color: colors.textDim, fontFamily: fonts.regular, fontSize: 15, textAlign: 'center', lineHeight: 22 },
  bold: { color: colors.accent, fontFamily: fonts.bold },
});
