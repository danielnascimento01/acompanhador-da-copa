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

/** Datas (YYYYMMDD) da ESPN que vale consultar: jogos na janela do torneio (ao
 *  vivo, prestes a começar, ou já iniciados no backfill). Inclui a data UTC + a
 *  anterior (cobre o fuso ET da ESPN). UM request por dia, não por jogo. */
function espnDatesToFetch(matches: Match[]): Set<string> {
  const now = Date.now();
  const dates = new Set<string>();
  for (const m of matches) {
    const delta = new Date(m.utc).getTime() - now; // >0 futuro, <0 passado
    const inLiveWindow = delta <= ESPN_FUTURE_MS && delta >= -ESPN_PAST_MS;
    const startedInWindow = delta < 0 && delta >= -ESPN_BACKFILL_MS;
    if (inLiveWindow || startedInWindow) for (const d of espnDatesFor(m.utc)) dates.add(d);
  }
  return dates;
}

/**
 * Aplica os eventos da ESPN (placar/status/vencedor) sobre os jogos. PURO (sem
 * rede) — a ESPN é a fonte primária e prevalece em todo jogo iniciado. Jogos sem
 * time real (rótulo do mata-mata) não casam e ficam como estão. O flag `winner`
 * da ESPN vira `advance` (lado que passou, cobre pênaltis) para alimentar a chave.
 */
function applyEspn(matches: Match[], espn: EspnMatch[]): Match[] {
  if (espn.length === 0) return matches;
  return matches.map((m) => {
    if (!m.home || !m.away) return m; // confronto a definir — não tem o que casar
    const e = espn.find(
      (x) =>
        (teamMatches(x.homeName, m.home) && teamMatches(x.awayName, m.away)) ||
        (teamMatches(x.homeName, m.away) && teamMatches(x.awayName, m.home)),
    );
    if (!e) return m;
    const homeIsOurHome = teamMatches(e.homeName, m.home);
    const hs = homeIsOurHome ? e.homeScore : e.awayScore;
    const as = homeIsOurHome ? e.awayScore : e.homeScore;
    // 'pre': sem placar. 'in': fallback no placar anterior se vier null momentâneo.
    // 'post': ESPN é autoritativa — null vira null (melhor que dado errado).
    const itsIn = e.state === 'in';
    const itsPost = e.state === 'post';
    // Vencedor oficial → lado que avança no NOSSO mando (cobre pênaltis).
    const advance: 'home' | 'away' | undefined =
      itsPost && e.winner ? ((e.winner === 'home') === homeIsOurHome ? 'home' : 'away') : undefined;
    return {
      ...m,
      status: espnStatusCode(e),
      homeScore: itsIn ? (hs ?? m.homeScore) : itsPost ? hs : null,
      awayScore: itsIn ? (as ?? m.awayScore) : itsPost ? as : null,
      advance,
    };
  });
}

export type FetchResult = {
  matches: Match[];
  /** Algum request de rede teve sucesso? false = provavelmente offline. */
  ok: boolean;
};

// Nº de fases do mata-mata (16-avos→final) = teto de iterações da cascata.
const BRACKET_ROUNDS = 6;

export async function fetchLatestMatches(): Promise<FetchResult> {
  const byId = new Map<string, Match>(ALL_MATCHES.map((m) => [m.id, m]));
  const rounds = await Promise.all(ROUNDS.map((r) => fetchRound(r)));
  const tsdbOk = rounds.some((r) => r !== null); // TheSportsDB respondeu
  for (const events of rounds) {
    for (const e of events ?? []) {
      const m = normalize(e);
      if (m.id) byId.set(m.id, m);
    }
  }
  const merged = [...byId.values()].sort((a, b) => a.utc.localeCompare(b.utc));

  // UMA rodada de fetch da ESPN: cobre as datas dos jogos de grupo E de todo o
  // mata-mata (datas fixas da chave), na janela do torneio. Depois resolvemos
  // tudo em memória, sem novos requests.
  const koFixtures = bracketAsMatches(merged);
  const dates = new Set<string>([...espnDatesToFetch(merged), ...espnDatesToFetch(koFixtures)]);
  const espn = dates.size ? (await Promise.all([...dates].map((d) => fetchEspnDay(d)))).flat() : [];

  // Grupos: aplica ESPN → fixa as classificações que definem o mata-mata.
  const groups = applyEspn(merged, espn);

  // Mata-mata em CASCATA: o vencedor de uma fase (flag oficial da ESPN) preenche
  // o slot da próxima. bracketAsMatches resolve do que já se sabe e CARREGA o
  // placar de `known`; applyEspn fixa placar/status/vencedor de cada confronto
  // já com times reais. Itera até estabilizar — cada passe pode desbloquear a
  // fase seguinte. `espn` já está em mãos, então as iterações não fazem rede.
  let known: Match[] = groups;
  let sig = '';
  for (let i = 0; i < BRACKET_ROUNDS; i++) {
    const ko = applyEspn(bracketAsMatches(known), espn).filter(
      (k) =>
        // dedup defensivo contra a fonte secundária (hoje vazia p/ mata-mata).
        !groups.some(
          (m) =>
            m.home === k.home &&
            m.away === k.away &&
            k.home !== '' &&
            Math.abs(new Date(m.utc).getTime() - new Date(k.utc).getTime()) < 90 * 60 * 1000,
        ),
    );
    known = [...groups, ...ko];
    const next = ko
      .map((m) => `${m.id}:${m.home}>${m.away}:${m.homeScore}-${m.awayScore}:${m.status}`)
      .join('|');
    if (next === sig) break; // estabilizou (nada novo resolveu)
    sig = next;
  }

  const all = known.sort((a, b) => a.utc.localeCompare(b.utc));
  return { matches: sanitizeFutureScores(all), ok: tsdbOk || espn.length > 0 };
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
