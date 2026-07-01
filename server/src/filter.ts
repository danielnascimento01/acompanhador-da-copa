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
export type NotifyMode = 'all' | 'mine' | 'off';

export type SubscriberPrefs = {
  mode: NotifyMode;
  teams: string[];
  matches: [string, string][];
  /** Aviso de FIM DE JOGO. Opcional: apps antigos não mandam → default 'off'
   * (opt-in; não muda o comportamento de quem ainda não atualizou). */
  fullTime?: NotifyMode;
};

/** O jogo homeTeam x awayTeam envolve uma das minhas seleções/jogos seguidos? */
function involvesMine(prefs: SubscriberPrefs, homeTeam: string, awayTeam: string): boolean {
  // uma das minhas seleções está em campo?
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

/** Aplica um modo (all/mine/off) ao jogo. 'mine' usa as seleções/jogos seguidos. */
function wantsByMode(mode: NotifyMode, prefs: SubscriberPrefs, homeTeam: string, awayTeam: string): boolean {
  if (mode === 'off') return false;
  if (mode === 'all') return true;
  return involvesMine(prefs, homeTeam, awayTeam);
}

/** Este assinante quer ser avisado de um GOL no jogo homeTeam x awayTeam? */
export function wantsGoal(prefs: SubscriberPrefs, homeTeam: string, awayTeam: string): boolean {
  return wantsByMode(prefs.mode, prefs, homeTeam, awayTeam);
}

/** Este assinante quer ser avisado do FIM DE JOGO de homeTeam x awayTeam? */
export function wantsFullTime(prefs: SubscriberPrefs, homeTeam: string, awayTeam: string): boolean {
  return wantsByMode(prefs.fullTime ?? 'off', prefs, homeTeam, awayTeam);
}

/**
 * Alertas operacionais (adiamento, suspensão, mudança de horário) são enviados
 * só para quem acompanha uma seleção/jogo envolvido e tem algum push remoto ativo.
 * Não usa 'all' como global aqui para evitar alertas massivos em usuários legados.
 */
export function wantsMatchAlert(prefs: SubscriberPrefs, homeTeam: string, awayTeam: string): boolean {
  if (prefs.mode === 'off' && (prefs.fullTime ?? 'off') === 'off') return false;
  return involvesMine(prefs, homeTeam, awayTeam);
}
