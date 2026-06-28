/**
 * Fallback ESTÁTICO de artilheiros — usado SÓ se o servidor (Worker /api/scorers)
 * estiver fora do ar. Mantido VAZIO de propósito: na falha, é melhor um empty state
 * honesto do que dados inventados/desatualizados numa tabela que se diz "da Copa 2026".
 * A artilharia REAL vem do servidor, que soma a Copa inteira (ver server/src/scorers.ts).
 */
import { teamFlag, teamName } from './teams';

export type Scorer = {
  player: string;
  teamId: string; // id da seleção (igual a teams.ts) — pra bandeira/nome PT
  goals: number;
  assists?: number;
};

/** Fallback vazio — sem dados falsos. A artilharia real vem do servidor. */
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
