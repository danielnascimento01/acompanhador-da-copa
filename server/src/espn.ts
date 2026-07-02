/** ESPN API helpers — API pública não-oficial, sem autenticação. */

const SCOREBOARD = 'https://site.api.espn.com/apis/site/v2/sports/soccer/fifa.world/scoreboard';
const SUMMARY    = 'https://site.api.espn.com/apis/site/v2/sports/soccer/fifa.world/summary';

export function yyyymmdd(d: Date): string {
  return `${d.getUTCFullYear()}${String(d.getUTCMonth() + 1).padStart(2, '0')}${String(d.getUTCDate()).padStart(2, '0')}`;
}

export type ESPNCompetitor = {
  homeAway: 'home' | 'away';
  score: string;
  team: { id: string; displayName: string; abbreviation: string };
};

export type ESPNStatusType = {
  state?: 'pre' | 'in' | 'post' | string;
  name?: string;
  description?: string;
  detail?: string;
  shortDetail?: string;
  completed?: boolean;
};

export type ESPNNote = {
  type?: string;
  headline?: string;
  text?: string;
  detail?: string;
  shortDetail?: string;
  description?: string;
};

export type ESPNHeadline = {
  headline?: string;
  shortLinkText?: string;
  description?: string;
};

/**
 * Lance do scoreboard (competitions[0].details[]) — É AQUI que a ESPN coloca o
 * artilheiro (o /summary?event= costuma vir SEM play-by-play na Copa). Tem o
 * tipo, o time, o atleta e a marcação de gol contra/pênalti.
 */
export type ESPNDetail = {
  type?: { text?: string };
  scoringPlay?: boolean;
  ownGoal?: boolean;
  penaltyKick?: boolean;
  clock?: { value?: number; displayValue?: string };
  team?: { id?: string };
  athletesInvolved?: Array<{ id?: string; displayName?: string; team?: { id?: string } }>;
};

export type ESPNEvent = {
  id: string;
  name: string;
  date?: string;
  headlines?: ESPNHeadline[];
  status: {
    type: ESPNStatusType;
    displayClock?: string;
    period?: number;
  };
  competitions: Array<{
    date?: string;
    startDate?: string;
    status?: { type?: ESPNStatusType };
    notes?: ESPNNote[];
    headlines?: ESPNHeadline[];
    wasSuspended?: boolean;
    competitors: ESPNCompetitor[];
    details?: ESPNDetail[];
  }>;
};

export type ESPNPlay = {
  id?: string;
  type?: { text?: string };
  clock?: { displayValue?: string };
  athletesInvolved?: Array<{ displayName: string; team?: { id?: string; displayName?: string } }>;
  team?: { id?: string; displayName?: string };
  text?: string;
  homeScore?: number;
  awayScore?: number;
};

/**
 * Busca eventos da ESPN. SEM `date`, NÃO envia ?dates — a ESPN ancora cada jogo
 * pela data US-Eastern do apito, então pedir o dia UTC (new Date em UTC) fazia o
 * cron PERDER os jogos ao vivo entre ~00:00–04:00 UTC (noite no Brasil) e abortar
 * sem push. Sem ?dates a ESPN devolve o "dia" ET correto, já com os jogos ao vivo.
 * Passe `date` (YYYYMMDD) só quando precisar de um dia específico (ex.: artilheiros).
 */
export async function fetchScoreboard(date?: string): Promise<ESPNEvent[]> {
  const qs = date ? `?dates=${date}&limit=50` : `?limit=50`;
  try {
    const res = await fetch(`${SCOREBOARD}${qs}`, {
      headers: { 'User-Agent': 'Copa2026App/1.0', 'Cache-Control': 'no-cache' },
    });
    if (!res.ok) return [];
    const json = await res.json() as { events?: ESPNEvent[] };
    return json.events ?? [];
  } catch {
    return [];
  }
}

/** Busca os lances de um jogo específico. Retorna [] em erro. */
export async function fetchPlays(eventId: string): Promise<ESPNPlay[]> {
  try {
    const res = await fetch(`${SUMMARY}?event=${eventId}`, {
      headers: { 'User-Agent': 'Copa2026App/1.0', 'Cache-Control': 'no-cache' },
    });
    if (!res.ok) return [];
    const json = await res.json() as { plays?: ESPNPlay[] };
    return json.plays ?? [];
  } catch {
    return [];
  }
}

/**
 * Autores dos gols de um jogo, via `keyEvents` do summary (o campo `plays` NÃO
 * existe nesta liga). O nome do artilheiro fica em `participants[0].athlete`
 * (não em `athletesInvolved`, que vem vazio aqui). Gol contra é excluído da
 * artilharia individual.
 */
export async function fetchGoalScorers(eventId: string): Promise<{ player: string; teamName: string }[]> {
  try {
    const res = await fetch(`${SUMMARY}?event=${eventId}`, {
      headers: { 'User-Agent': 'Copa2026App/1.0', 'Cache-Control': 'no-cache' },
    });
    if (!res.ok) return [];
    const json = (await res.json()) as { keyEvents?: Array<Record<string, unknown>> };
    const out: { player: string; teamName: string }[] = [];
    for (const k of json.keyEvents ?? []) {
      if (!(k as { scoringPlay?: boolean }).scoringPlay) continue; // só lances de gol
      const txt = String((k as { text?: string }).text ?? '');
      if (/own goal/i.test(txt)) continue; // gol contra não conta pro artilheiro
      const participants = (k as { participants?: Array<{ athlete?: { displayName?: string } }> }).participants;
      const player = participants?.[0]?.athlete?.displayName;
      if (!player) continue;
      const teamName = (k as { team?: { displayName?: string } }).team?.displayName ?? '';
      out.push({ player, teamName });
    }
    return out;
  } catch {
    return [];
  }
}

/** Extrai placar atual (home, away) de um evento. */
export function extractScore(event: ESPNEvent): { home: number; away: number; homeTeam: string; awayTeam: string } {
  const comp = event.competitions[0];
  const home = comp?.competitors.find((c) => c.homeAway === 'home');
  const away = comp?.competitors.find((c) => c.homeAway === 'away');
  return {
    home: parseInt(home?.score ?? '0', 10) || 0,
    away: parseInt(away?.score ?? '0', 10) || 0,
    homeTeam: home?.team.displayName ?? '?',
    awayTeam: away?.team.displayName ?? '?',
  };
}
