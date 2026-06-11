/**
 * Artilheiros da Copa 2026. Sem API confiável de gols no plano grátis do TheSportsDB,
 * mantemos data-driven aqui e atualizamos via OTA conforme a Copa rola.
 * No início (Copa recém-começada) a lista fica vazia → empty state amigável.
 */
import { teamFlag, teamName } from './teams';

export type Scorer = {
  player: string;
  teamId: string; // id da seleção (igual a teams.ts) — pra bandeira/nome PT
  goals: number;
  assists?: number;
};

/** Data da última atualização da artilharia (mostrada na tela). */
export const SCORERS_UPDATED = '11/06/2026';

/** Lista de artilheiros (vazia no começo; preencher e publicar via OTA). */
export const SCORERS: Scorer[] = [];

export type RankedScorer = Scorer & { rank: number; flag: string; teamName: string };

/** Ordena por gols (desc), depois assistências, e resolve a bandeira/nome da seleção. */
export function topScorers(list: Scorer[] = SCORERS): RankedScorer[] {
  const sorted = [...list].sort((a, b) => b.goals - a.goals || (b.assists ?? 0) - (a.assists ?? 0));
  return sorted.map((s, i) => ({
    ...s,
    rank: i + 1,
    flag: teamFlag(s.teamId),
    teamName: teamName(s.teamId),
  }));
}
