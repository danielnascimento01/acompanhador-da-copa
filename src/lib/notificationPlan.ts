/**
 * Planejamento das notificações locais — PURO (sem dependências nativas), pra ser
 * testável fora do app. Decide O QUÊ e QUANDO notificar; o agendamento em si
 * (expo-notifications) fica em notifications.ts.
 *
 * Regra importante: o resumo diário "X jogos hoje" lista TODOS os jogos do dia
 * (é pra repassar a grade); os avisos de "jogo começando" é que são filtrados
 * pelas seleções marcadas. Não misturar as duas listas (bug do "2 de 4 jogos").
 */
import { filterByTeams, isFinished, kickoff, type Match } from '../data/fixtures';
import { teamName, teamFlag } from '../data/teams';
import { formatTime, localDayKey } from './format';
import type { Settings } from './storage';

export type PlannedNotification = {
  date: Date;
  title: string;
  body: string;
  data: Record<string, unknown>;
};

export function matchLabel(m: Match): string {
  return `${teamFlag(m.home)} ${teamName(m.home)} x ${teamName(m.away)} ${teamFlag(m.away)}`;
}

/** Avisos de "jogo começando" (recebe a lista JÁ filtrada pelas seleções). */
export function planMatchStartNotifications(matches: Match[], settings: Settings, now: Date): PlannedNotification[] {
  if (!settings.matchStart) return [];
  const out: PlannedNotification[] = [];
  for (const m of matches) {
    const ko = kickoff(m);
    const fireAt = new Date(ko.getTime() - settings.matchStartLeadMinutes * 60_000);
    if (fireAt <= now) continue;
    const mins = settings.matchStartLeadMinutes;
    out.push({
      date: fireAt,
      title: '⚽ Vai começar!',
      body: `${matchLabel(m)} começa às ${formatTime(ko)} (em ${mins} min).`,
      data: { type: 'match-start', matchId: m.id },
    });
  }
  return out;
}

/** Resumo diário com TODOS os jogos do dia (recebe a lista COMPLETA, não filtrada). */
export function planDailyDigests(matches: Match[], settings: Settings, now: Date): PlannedNotification[] {
  if (!settings.dailyDigest) return [];

  const byDay = new Map<string, Match[]>();
  for (const m of matches) {
    const key = localDayKey(kickoff(m));
    const arr = byDay.get(key) ?? [];
    arr.push(m);
    byDay.set(key, arr);
  }

  const out: PlannedNotification[] = [];
  for (const [, dayMatches] of byDay) {
    const first = kickoff(dayMatches[0]);
    const fireAt = new Date(first.getFullYear(), first.getMonth(), first.getDate(), settings.dailyDigestHour, 0, 0, 0);
    if (fireAt <= now) continue;

    // Só lista jogos que ainda não começaram no horário do resumo (evita
    // "tem jogo hoje" para uma partida que já rolou de madrugada).
    const upcoming = dayMatches
      .filter((m) => kickoff(m) >= fireAt)
      .sort((a, b) => a.utc.localeCompare(b.utc));
    if (upcoming.length === 0) continue;

    const lines = upcoming.map((m) => `${formatTime(kickoff(m))}  ${matchLabel(m)}`);
    const count = upcoming.length;
    out.push({
      date: fireAt,
      title: count === 1 ? '📅 Tem jogo hoje!' : `📅 ${count} jogos hoje!`,
      body: lines.join('\n'),
      data: { type: 'daily-digest' },
    });
  }
  return out;
}

export function byDateAsc(a: PlannedNotification, b: PlannedNotification): number {
  return a.date.getTime() - b.date.getTime();
}

/**
 * Decide a agenda final (puro): resumo diário a partir de TODOS os jogos não
 * encerrados; avisos de "começando" só das seleções marcadas. Reserva até
 * maxDigests resumos e preenche o resto com os avisos mais próximos.
 * É aqui que mora a separação das listas — testada em scripts/daily-digest.test.ts.
 */
export function planAll(
  allMatches: Match[],
  teamIds: string[],
  settings: Settings,
  now: Date,
  maxDigests: number,
  maxPending: number,
): PlannedNotification[] {
  const live = allMatches.filter((m) => !isFinished(m));
  const mine = filterByTeams(live, teamIds); // só p/ "jogo começando"

  const digests = planDailyDigests(live, settings, now).sort(byDateAsc).slice(0, maxDigests);
  const remaining = Math.max(0, maxPending - digests.length);
  const matchStarts = planMatchStartNotifications(mine, settings, now).sort(byDateAsc).slice(0, remaining);

  return [...digests, ...matchStarts].sort(byDateAsc);
}
