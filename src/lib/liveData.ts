import Constants from 'expo-constants';

import { ALL_MATCHES, Match } from '../data/fixtures';
import { fetchEspnDay, teamMatches, espnDatesFor, type EspnMatch } from './liveEvents';

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

// Janela ao redor do "agora" em que o status do TheSportsDB pode estar errado
// (jogo ao vivo ou recém-encerrado que a API deixou "preso") e vale cruzar com
// a ESPN: começou nas últimas 6h ou começa nas próximas 3h.
const ESPN_PAST_MS = 6 * 60 * 60 * 1000;
const ESPN_FUTURE_MS = 3 * 60 * 60 * 1000;

/** ESPN → nosso código de status. A ESPN é a fonte confiável de ao vivo/fim. */
function espnStatusCode(e: EspnMatch): string {
  if (e.state === 'post') return 'FT';
  if (e.state === 'in') return e.halftime ? 'HT' : 'LIVE';
  return 'NS';
}

/**
 * Cruza os jogos "da janela" com o scoreboard da ESPN e corrige status/placar.
 * Faz UM request por dia (não por jogo) e só para os jogos perto do agora —
 * jogos antigos (FT estável) e distantes (NS) não precisam. Se a ESPN falhar,
 * devolve os jogos como estavam (nada quebra).
 */
async function reconcileWithEspn(matches: Match[]): Promise<Match[]> {
  const now = Date.now();
  // Só as DATAS dos jogos perto do agora precisam de fetch (1 request por dia).
  // espnDatesFor inclui a data UTC + a anterior (cobre o fuso ET da ESPN); o
  // Set deduplica os dias que se repetem entre jogos.
  const dates = new Set<string>();
  for (const m of matches) {
    const delta = new Date(m.utc).getTime() - now; // >0 futuro, <0 passado
    if (delta <= ESPN_FUTURE_MS && delta >= -ESPN_PAST_MS) {
      for (const d of espnDatesFor(m.utc)) dates.add(d);
    }
  }
  if (dates.size === 0) return matches;

  const days = await Promise.all([...dates].map((d) => fetchEspnDay(d)));
  const espn = days.flat();
  if (espn.length === 0) return matches;

  return matches.map((m) => {
    const e = espn.find(
      (x) =>
        (teamMatches(x.homeName, m.home) && teamMatches(x.awayName, m.away)) ||
        (teamMatches(x.homeName, m.away) && teamMatches(x.awayName, m.home)),
    );
    if (!e) return m;
    const homeIsOurHome = teamMatches(e.homeName, m.home);
    const hs = homeIsOurHome ? e.homeScore : e.awayScore;
    const as = homeIsOurHome ? e.awayScore : e.homeScore;
    return {
      ...m,
      status: espnStatusCode(e),
      homeScore: hs ?? m.homeScore,
      awayScore: as ?? m.awayScore,
    };
  });
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
  const merged = [...byId.values()].sort((a, b) => a.utc.localeCompare(b.utc));
  return reconcileWithEspn(merged);
}
