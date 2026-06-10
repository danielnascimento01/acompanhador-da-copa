import Constants from 'expo-constants';

import { ALL_MATCHES, Match } from '../data/fixtures';

const extra = (Constants.expoConfig?.extra ?? {}) as Record<string, string>;
const LEAGUE_ID = extra.thesportsdbLeagueId ?? '4429';
const SEASON = extra.thesportsdbSeason ?? '2026';

// Rodadas a buscar: 1-3 = fase de grupos. Quando os mata-matas saírem,
// é só incluir mais rodadas aqui (as vazias são ignoradas).
const ROUNDS = [1, 2, 3];
const BASE = 'https://www.thesportsdb.com/api/v1/json/3';

type ApiEvent = {
  idEvent: string;
  strTimestamp?: string;
  dateEvent?: string;
  strTime?: string;
  intRound?: string;
  strHomeTeam: string;
  strAwayTeam: string;
  strHomeTeamBadge?: string;
  strAwayTeamBadge?: string;
  strVenue?: string;
  intHomeScore?: string | null;
  intAwayScore?: string | null;
  strStatus?: string;
};

function normalize(e: ApiEvent): Match {
  const utc = e.strTimestamp
    ? e.strTimestamp.endsWith('Z')
      ? e.strTimestamp
      : `${e.strTimestamp}Z`
    : `${e.dateEvent}T${e.strTime || '00:00:00'}Z`;
  return {
    id: e.idEvent,
    utc,
    round: Number(e.intRound),
    home: e.strHomeTeam,
    away: e.strAwayTeam,
    homeBadge: e.strHomeTeamBadge || null,
    awayBadge: e.strAwayTeamBadge || null,
    venue: e.strVenue || null,
    homeScore: e.intHomeScore != null ? Number(e.intHomeScore) : null,
    awayScore: e.intAwayScore != null ? Number(e.intAwayScore) : null,
    status: e.strStatus || 'NS',
  };
}

/**
 * Busca os jogos atualizados (placar/status) na API e mescla por id com o
 * dataset embutido. Se a rede falhar, devolve o que já tínhamos.
 */
async function fetchRound(round: number, timeoutMs = 8000): Promise<ApiEvent[]> {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), timeoutMs);
  try {
    const res = await fetch(`${BASE}/eventsround.php?id=${LEAGUE_ID}&r=${round}&s=${SEASON}`, {
      signal: ctrl.signal,
    });
    const json = await res.json();
    return Array.isArray(json?.events) ? json.events : [];
  } catch {
    return [];
  } finally {
    clearTimeout(timer);
  }
}

export async function fetchLatestMatches(): Promise<Match[]> {
  const byId = new Map<string, Match>(ALL_MATCHES.map((m) => [m.id, m]));
  const rounds = await Promise.all(ROUNDS.map((r) => fetchRound(r)));
  for (const events of rounds) {
    for (const e of events) {
      const m = normalize(e);
      if (m.id) byId.set(m.id, m);
    }
  }
  return [...byId.values()].sort((a, b) => a.utc.localeCompare(b.utc));
}
