import Constants from 'expo-constants';

import { ALL_MATCHES, Match, isStartedStatus } from '../data/fixtures';
import { bracketAsMatches } from '../data/bracket';
import { fetchEspnDay, teamMatches, espnDatesFor, type EspnMatch } from './liveEvents';

const extra = (Constants.expoConfig?.extra ?? {}) as Record<string, string>;
const LEAGUE_ID = extra.thesportsdbLeagueId ?? '4429';
const SEASON = extra.thesportsdbSeason ?? '2026';

// 1-3 = fase de grupos; 4-8 = mata-matas (oitavas→final).
// Rodadas vazias retornam [] e são ignoradas — seguro buscar adiantado.
const ROUNDS = [1, 2, 3, 4, 5, 6, 7, 8];
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
  const status = e.strStatus || 'NS';
  // Jogo que ainda não começou NÃO carrega placar — a API às vezes manda "0"/"0"
  // antes do apito, e isso entrava na classificação como um empate fantasma.
  const started = isStartedStatus(status);
  return {
    id: e.idEvent,
    utc,
    round: Number(e.intRound),
    home: e.strHomeTeam,
    away: e.strAwayTeam,
    homeBadge: e.strHomeTeamBadge || null,
    awayBadge: e.strAwayTeamBadge || null,
    venue: e.strVenue || null,
    homeScore: started && e.intHomeScore != null ? Number(e.intHomeScore) : null,
    awayScore: started && e.intAwayScore != null ? Number(e.intAwayScore) : null,
    status,
  };
}

/**
 * Busca os jogos atualizados (placar/status) na API e mescla por id com o
 * dataset embutido. Se a rede falhar, devolve o que já tínhamos.
 */
async function fetchRound(round: number, timeoutMs = 8000): Promise<ApiEvent[] | null> {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), timeoutMs);
  try {
    const res = await fetch(`${BASE}/eventsround.php?id=${LEAGUE_ID}&r=${round}&s=${SEASON}`, {
      signal: ctrl.signal,
    });
    const json = await res.json();
    return Array.isArray(json?.events) ? json.events : [];
  } catch {
    return null; // null = falha de rede (distinto de [] = sucesso vazio) → detecta offline
  } finally {
    clearTimeout(timer);
  }
}

// Janela ao redor do "agora" em que o status do TheSportsDB pode estar errado
// (jogo ao vivo ou recém-encerrado que a API deixou "preso") e vale cruzar com
// a ESPN: começou nas últimas 6h ou começa nas próximas 3h.
const ESPN_PAST_MS = 6 * 60 * 60 * 1000;
const ESPN_FUTURE_MS = 3 * 60 * 60 * 1000;
// A fonte primária (TheSportsDB) às vezes NUNCA preenche o placar de jogos já
// realizados (cobre só parte do torneio). Para esses, buscamos o resultado na
// ESPN mesmo fora da janela de "ao vivo" — limitado aos últimos 30 dias (cobre
// o torneio inteiro) para não consultar datas antigas à toa.
const ESPN_BACKFILL_MS = 30 * 24 * 60 * 60 * 1000;

/** ESPN → nosso código de status. A ESPN é a fonte confiável de ao vivo/fim. */
function espnStatusCode(e: EspnMatch): string {
  if (e.state === 'post') return 'FT';
  if (e.state === 'in') return e.halftime ? 'HT' : 'LIVE';
  return 'NS';
}

/**
 * ESPN como fonte PRIMÁRIA de status/placar: cruza os jogos com o scoreboard da
 * ESPN (mais completo e confiável que a fonte secundária) e faz o resultado da
 * ESPN prevalecer em todo jogo já iniciado dentro da janela do torneio. Faz UM
 * request por dia (não por jogo); jogos futuros distantes não são consultados.
 * Se a ESPN falhar, devolve os jogos como estavam (nada quebra).
 */
async function reconcileWithEspn(matches: Match[]): Promise<{ matches: Match[]; ok: boolean }> {
  const now = Date.now();
  // Só as DATAS dos jogos relevantes precisam de fetch (1 request por dia).
  // espnDatesFor inclui a data UTC + a anterior (cobre o fuso ET da ESPN); o
  // Set deduplica os dias que se repetem entre jogos.
  const dates = new Set<string>();
  for (const m of matches) {
    const delta = new Date(m.utc).getTime() - now; // >0 futuro, <0 passado
    const inLiveWindow = delta <= ESPN_FUTURE_MS && delta >= -ESPN_PAST_MS;
    // ESPN é a fonte PRIMÁRIA: consultamos TODO jogo que já começou (dentro da
    // janela do torneio), não só os sem placar — assim a ESPN também corrige um
    // placar que a fonte secundária tenha trazido incompleto ou errado.
    const startedInWindow = delta < 0 && delta >= -ESPN_BACKFILL_MS;
    if (inLiveWindow || startedInWindow) {
      for (const d of espnDatesFor(m.utc)) dates.add(d);
    }
  }
  if (dates.size === 0) return { matches, ok: false };

  const days = await Promise.all([...dates].map((d) => fetchEspnDay(d)));
  const espn = days.flat();
  if (espn.length === 0) return { matches, ok: false };

  const reconciled = matches.map((m) => {
    const e = espn.find(
      (x) =>
        (teamMatches(x.homeName, m.home) && teamMatches(x.awayName, m.away)) ||
        (teamMatches(x.homeName, m.away) && teamMatches(x.awayName, m.home)),
    );
    if (!e) return m;
    const homeIsOurHome = teamMatches(e.homeName, m.home);
    const hs = homeIsOurHome ? e.homeScore : e.awayScore;
    const as = homeIsOurHome ? e.awayScore : e.homeScore;
    // 'pre': sem placar.
    // 'in': fallback no placar anterior se ESPN retornar null temporariamente.
    // 'post': ESPN é autoritativa — se mandou null, melhor mostrar null do que dado errado.
    const itsIn = e.state === 'in';
    const itsPost = e.state === 'post';
    return {
      ...m,
      status: espnStatusCode(e),
      homeScore: itsIn ? (hs ?? m.homeScore) : (itsPost ? hs : null),
      awayScore: itsIn ? (as ?? m.awayScore) : (itsPost ? as : null),
    };
  });
  return { matches: reconciled, ok: true };
}

export type FetchResult = {
  matches: Match[];
  /** Algum request de rede teve sucesso? false = provavelmente offline. */
  ok: boolean;
};

export async function fetchLatestMatches(): Promise<FetchResult> {
  const byId = new Map<string, Match>(ALL_MATCHES.map((m) => [m.id, m]));
  const rounds = await Promise.all(ROUNDS.map((r) => fetchRound(r)));
  const ok = rounds.some((r) => r !== null); // TheSportsDB respondeu
  for (const events of rounds) {
    for (const e of events ?? []) {
      const m = normalize(e);
      if (m.id) byId.set(m.id, m);
    }
  }
  const merged = [...byId.values()].sort((a, b) => a.utc.localeCompare(b.utc));

  // 1) Reconcilia a fase de grupos com a ESPN (placar/status final e ao vivo).
  //    Isso fixa as classificações que definem quem entra no mata-mata.
  const { matches: groups, ok: espnGroups } = await reconcileWithEspn(merged);

  // 2) Mata-mata: a grade embutida só tem os 72 jogos de grupos e o TheSportsDB
  //    NÃO devolve os jogos do mata-mata (round 4-8 vêm vazios). A chave OFICIAL
  //    (bracket.ts) é a fonte: gera os jogos já resolvendo os times conforme os
  //    grupos terminam (1º/2º com certeza + 8 melhores 3ºs fixados). Entram no
  //    MESMO pipeline → ganham placar/status ao vivo da ESPN (casa por nome).
  const knockout = bracketAsMatches(groups).filter((k) => {
    const kt = new Date(k.utc).getTime();
    // dedup defensivo: se um dia a fonte secundária trouxer o jogo (mesmos times,
    // horário próximo), não duplica — mantém o que já veio em `groups`.
    return !groups.some(
      (m) =>
        m.home === k.home &&
        m.away === k.away &&
        Math.abs(new Date(m.utc).getTime() - kt) < 90 * 60 * 1000,
    );
  });

  // 3) Reconcilia os jogos do mata-mata (placar/status ao vivo da ESPN). Jogos
  //    ainda sem time real (rótulo "Vencedor Grupo X") não casam e ficam como
  //    estão — aparecem como confronto a definir, nunca com placar inventado.
  const { matches: ko, ok: espnKo } = await reconcileWithEspn(knockout);

  const all = [...groups, ...ko].sort((a, b) => a.utc.localeCompare(b.utc));
  return { matches: sanitizeFutureScores(all), ok: ok || espnGroups || espnKo };
}

/**
 * Invariante "falhar honesto": um jogo que ainda NÃO começou NUNCA exibe placar.
 * Última linha de defesa contra placar fantasma (ex.: 0-0 que alguma fonte manda
 * antes do apito) — na dúvida, melhor campo vazio do que número errado.
 */
function sanitizeFutureScores(matches: Match[], now: number = Date.now()): Match[] {
  return matches.map((m) =>
    new Date(m.utc).getTime() > now && (m.homeScore != null || m.awayScore != null)
      ? { ...m, homeScore: null, awayScore: null }
      : m,
  );
}
