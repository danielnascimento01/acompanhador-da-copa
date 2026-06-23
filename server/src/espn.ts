/** ESPN API helpers — API pública não-oficial, sem autenticação. */

const SCOREBOARD = 'https://site.api.espn.com/apis/site/v2/sports/soccer/fifa.world/scoreboard';
const SUMMARY    = 'https://site.api.espn.com/apis/site/v2/sports/soccer/fifa.world/summary';

function yyyymmdd(d: Date): string {
  return `${d.getUTCFullYear()}${String(d.getUTCMonth() + 1).padStart(2, '0')}${String(d.getUTCDate()).padStart(2, '0')}`;
}

export type ESPNCompetitor = {
  homeAway: 'home' | 'away';
  score: string;
  team: { id: string; displayName: string; abbreviation: string };
};

export type ESPNEvent = {
  id: string;
  name: string;
  status: {
    type: { state: 'pre' | 'in' | 'post'; name: string };
    displayClock: string;
    period: number;
  };
  competitions: Array<{
    competitors: ESPNCompetitor[];
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

/** Busca eventos da ESPN para uma data (YYYYMMDD) ou hoje se omitida. */
export async function fetchScoreboard(date?: string): Promise<ESPNEvent[]> {
  const d = date ?? yyyymmdd(new Date());
  try {
    const res = await fetch(`${SCOREBOARD}?dates=${d}&limit=50`, {
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
