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
export const SCORERS_UPDATED = '23/06/2026';

/**
 * Gols do Messi em todas as Copas ANTES de 2026 (2006+2010+2014+2018+2022 = 13).
 * Usado em worldCupHistory.ts para computar o recorde de carreira dinamicamente:
 * basta atualizar os gols do Messi abaixo e o recorde histórico acompanha.
 */
export const MESSI_GOALS_PRE_2026 = 13;

/** Lista de artilheiros (preencher e publicar via OTA conforme os gols saem). */
export const SCORERS: Scorer[] = [
  { player: 'Lionel Messi',         teamId: 'Argentina',    goals: 5 },
  { player: 'Kylian Mbappé',        teamId: 'France',       goals: 4 },
  { player: 'Erling Haaland',       teamId: 'Norway',       goals: 4 },
  { player: 'Denis Undav',          teamId: 'Germany',      goals: 3 },
  { player: 'Jonathan David',       teamId: 'Canada',       goals: 3 },
  { player: 'Harry Kane',           teamId: 'England',      goals: 2 },
  { player: 'Cody Gakpo',           teamId: 'Netherlands',  goals: 2 },
  { player: 'Crysencio Summerville',teamId: 'Netherlands',  goals: 2 },
  { player: 'Brian Brobbey',        teamId: 'Netherlands',  goals: 2 },
  { player: 'Daichi Kamada',        teamId: 'Japan',        goals: 2 },
  { player: 'Ayase Ueda',           teamId: 'Japan',        goals: 2 },
  { player: 'Matheus Cunha',        teamId: 'Brazil',       goals: 2 },
  { player: 'Vinícius Júnior',      teamId: 'Brazil',       goals: 2 },
  { player: 'Cyle Larin',           teamId: 'Canada',       goals: 2 },
  { player: 'Kai Havertz',          teamId: 'Germany',      goals: 2 },
  { player: 'Ismael Saibari',       teamId: 'Morocco',      goals: 2 },
  { player: 'Folarin Balogun',      teamId: 'USA',          goals: 2 },
  { player: 'Yasin Ayari',          teamId: 'Sweden',       goals: 2 },
  { player: 'Cristiano Ronaldo',    teamId: 'Portugal',     goals: 2 },
];

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
