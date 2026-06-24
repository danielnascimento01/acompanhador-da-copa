/**
 * Decisão PURA de "este aparelho quer ser avisado deste gol?".
 * Isolada do Worker para ser testável (filter.test.ts) — é o caminho do push
 * ao vivo, onde um erro manda gol errado (ou nenhum) ao usuário.
 */
import { teamMatches } from './teams';

/**
 * - mode 'all': todos os gols de todos os jogos
 * - mode 'mine': só gols das `teams` (seleções seguidas) OU dos `matches`
 *   (jogos específicos seguidos, como pares de ids internos [a, b])
 * - mode 'off': nenhum push de gol
 */
export type SubscriberPrefs = {
  mode: 'all' | 'mine' | 'off';
  teams: string[];
  matches: [string, string][];
};

/** Este assinante quer ser avisado de um gol no jogo homeTeam x awayTeam? */
export function wantsGoal(prefs: SubscriberPrefs, homeTeam: string, awayTeam: string): boolean {
  if (prefs.mode === 'off') return false;
  if (prefs.mode === 'all') return true;
  // mode 'mine': uma das minhas seleções está em campo?
  if (prefs.teams.some((id) => teamMatches(homeTeam, id) || teamMatches(awayTeam, id))) {
    return true;
  }
  // ...ou é um jogo específico que eu sigo (par de times, ordem indiferente)?
  return prefs.matches.some(
    ([a, b]) =>
      (teamMatches(homeTeam, a) && teamMatches(awayTeam, b)) ||
      (teamMatches(homeTeam, b) && teamMatches(awayTeam, a)),
  );
}
