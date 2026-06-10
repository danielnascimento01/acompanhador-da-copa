import rawFixtures from '../../assets/data/fixtures.json';

/** Um jogo da Copa, no formato que o app usa internamente. */
export type Match = {
  id: string;
  /** Data/hora do início em UTC (ISO 8601, ex: "2026-06-11T19:00:00Z"). */
  utc: string;
  /** Rodada da fase de grupos (1, 2 ou 3). */
  round: number;
  /** id (nome em inglês) da seleção mandante — casa com TEAMS. */
  home: string;
  /** id (nome em inglês) da seleção visitante. */
  away: string;
  homeBadge: string | null;
  awayBadge: string | null;
  venue: string | null;
  homeScore: number | null;
  awayScore: number | null;
  /** Status vindo da API: "NS" (não começou), "1H", "HT", "2H", "FT", etc. */
  status: string;
};

export const ALL_MATCHES: Match[] = (rawFixtures as Match[])
  .slice()
  .sort((a, b) => a.utc.localeCompare(b.utc));

/** Filtra uma lista de jogos pelas seleções marcadas (ordem cronológica preservada). */
export function filterByTeams(matches: Match[], teamIds: Set<string> | string[]): Match[] {
  const set = teamIds instanceof Set ? teamIds : new Set(teamIds);
  if (set.size === 0) return [];
  return matches.filter((m) => set.has(m.home) || set.has(m.away));
}

/** Jogos (do dataset embutido) que envolvem QUALQUER uma das seleções marcadas. */
export function matchesForTeams(teamIds: Set<string> | string[]): Match[] {
  return filterByTeams(ALL_MATCHES, teamIds);
}

const LIVE_STATUSES = new Set(['1H', '2H', 'HT', 'ET', 'BT', 'P', 'LIVE']);
const FINISHED_STATUSES = new Set(['FT', 'AET', 'PEN', 'AP']);

export function isLive(match: Match): boolean {
  return LIVE_STATUSES.has(match.status);
}

export function isFinished(match: Match): boolean {
  return FINISHED_STATUSES.has(match.status);
}

/** O próximo jogo que ainda não terminou (ao vivo tem prioridade), ou null. */
export function nextRelevantMatch(matches: Match[], now: Date = new Date()): Match | null {
  const live = matches.find(isLive);
  if (live) return live;
  const upcoming = matches.find((m) => !isFinished(m) && kickoff(m).getTime() > now.getTime());
  return upcoming ?? null;
}

/** O timestamp de início como objeto Date. */
export function kickoff(match: Match): Date {
  return new Date(match.utc);
}

/** Já começou? (com base no horário atual). */
export function hasStarted(match: Match, now: Date = new Date()): boolean {
  return kickoff(match).getTime() <= now.getTime();
}
