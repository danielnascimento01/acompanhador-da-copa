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

/**
 * Janela máxima de "ao vivo" depois do apito inicial. Um jogo com prorrogação +
 * pênaltis dura ~150min de tempo real (90 + intervalos + 30 de prorrog. + disputa).
 * 170min dá folga sem nunca cortar jogo de verdade. Serve de trava contra status
 * "preso" (a API às vezes deixa o jogo em 2H/LIVE e nunca vira FT).
 */
const MAX_LIVE_MS = 170 * 60 * 1000;

export function isLive(match: Match, now: Date = new Date()): boolean {
  if (!LIVE_STATUSES.has(match.status)) return false;
  // Status diz ao vivo, mas só vale dentro de uma janela realista após o início.
  // Fora dela, o status está defasado (a API não atualizou pra FT) → não é ao vivo.
  const elapsed = now.getTime() - kickoff(match).getTime();
  return elapsed >= 0 && elapsed <= MAX_LIVE_MS;
}

export function isFinished(match: Match): boolean {
  return FINISHED_STATUSES.has(match.status);
}

/**
 * O status indica que a partida já COMEÇOU (ao vivo) ou terminou? Usado pela
 * camada de dados para nunca carregar placar de jogo que ainda não rolou — a
 * API às vezes manda "0"/"0" antes do apito, o que poluía a classificação.
 */
export function isStartedStatus(status: string): boolean {
  return LIVE_STATUSES.has(status) || FINISHED_STATUSES.has(status);
}

/**
 * O jogo aceita palpite? Regra única usada pelo editor, pela simulação e
 * pelos contadores (evita gates divergentes): sem nenhum placar real, não
 * ao vivo, não encerrado e ainda ANTES do apito inicial (sem janela de
 * trapaça quando a API demora a atualizar o status).
 */
export function isPredictable(match: Match, now: Date = new Date()): boolean {
  return (
    match.homeScore == null &&
    match.awayScore == null &&
    !isLive(match, now) &&
    !isFinished(match) &&
    kickoff(match).getTime() > now.getTime()
  );
}

/** O próximo jogo que ainda não terminou (ao vivo tem prioridade), ou null. */
export function nextRelevantMatch(matches: Match[], now: Date = new Date()): Match | null {
  const live = matches.find((m) => isLive(m, now));
  if (live) return live;
  const upcoming = matches.find((m) => !isFinished(m) && kickoff(m).getTime() > now.getTime());
  return upcoming ?? null;
}

/**
 * Próximo jogo "relevante" priorizando a SELEÇÃO PRINCIPAL do usuário (modo "minha
 * seleção"). Prioridade: 1) meu time ao vivo, 2) qualquer jogo ao vivo (a emoção
 * do momento não some), 3) próximo jogo do meu time, 4) próximo jogo geral da Copa.
 */
export function nextRelevantMatchFor(
  matches: Match[],
  primaryTeam: string | null,
  now: Date = new Date(),
): Match | null {
  const isMine = (m: Match) => !!primaryTeam && (m.home === primaryTeam || m.away === primaryTeam);
  if (primaryTeam) {
    const myLive = matches.find((m) => isMine(m) && isLive(m, now));
    if (myLive) return myLive;
  }
  const anyLive = matches.find((m) => isLive(m, now));
  if (anyLive) return anyLive;
  if (primaryTeam) {
    const myNext = matches
      .filter((m) => isMine(m) && !isFinished(m) && kickoff(m).getTime() > now.getTime())
      .sort((a, b) => a.utc.localeCompare(b.utc))[0];
    if (myNext) return myNext;
  }
  return nextRelevantMatch(matches, now);
}

/** O timestamp de início como objeto Date. */
export function kickoff(match: Match): Date {
  return new Date(match.utc);
}

/** Já começou? (com base no horário atual). */
export function hasStarted(match: Match, now: Date = new Date()): boolean {
  return kickoff(match).getTime() <= now.getTime();
}
