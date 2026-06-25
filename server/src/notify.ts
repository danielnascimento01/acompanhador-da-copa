/**
 * Monta o TEXTO do push de gol — função PURA e testável (notify.test.ts).
 * Formato:
 *   título:  ⚽ Gol do Brasil          (nomeia quem marcou, em PT, com artigo)
 *   corpo:   Raphinha foi o autor do gol!    (linha só quando há artilheiro)
 *            Brasil 1 x 0 Escócia
 *
 * Degrada com elegância: sem artilheiro → só o placar; time desconhecido ou
 * 2 gols de lados diferentes no mesmo ciclo → título neutro "⚽ Gol!".
 */
import { teamInfo } from './teams';
import type { ESPNDetail } from './espn';

/**
 * Artilheiro a partir dos `details` do SCOREBOARD (fonte que de fato traz o nome
 * na Copa). Considera TODOS os gols do time que marcou (normais E gols contra —
 * o gol contra também é creditado a esse time, com team.id do beneficiado) e pega
 * o MAIS RECENTE por clock. Se o mais recente for GOL CONTRA, retorna null → push
 * sem nome (o autor é do adversário; nomear seria ERRADO). null se nada casar.
 *
 * Por que incluir o gol contra no ranqueamento: se filtrássemos ownGoal e o gol
 * que ACABOU de sair foi contra, pegaríamos um gol normal ANTIGO do time e
 * mostraríamos o autor errado (bug F4 da auditoria).
 */
export function pickScorerFromDetails(details: ESPNDetail[], scoringTeamId: string): string | null {
  const goals = details
    .filter(
      (d) =>
        (d.scoringPlay === true || (d.type?.text ?? '').toLowerCase().includes('goal')) &&
        d.team?.id === scoringTeamId,
    )
    .sort((a, b) => (b.clock?.value ?? 0) - (a.clock?.value ?? 0));
  const latest = goals[0];
  if (!latest || latest.ownGoal) return null; // gol contra (ou nada) → sem nome
  return latest.athletesInvolved?.[0]?.displayName ?? null;
}

export type GoalNotifyInput = {
  homeTeam: string; // nome ESPN
  awayTeam: string; // nome ESPN
  home: number; // placar atual mandante
  away: number; // placar atual visitante
  newHome: number; // gols novos do mandante neste ciclo
  newAway: number; // gols novos do visitante neste ciclo
  scorer?: string | null; // artilheiro, se a ESPN forneceu
};

export function buildGoalNotification(input: GoalNotifyInput): { title: string; body: string } {
  const { homeTeam, awayTeam, home, away, newHome, newAway, scorer } = input;

  const homeInfo = teamInfo(homeTeam);
  const awayInfo = teamInfo(awayTeam);
  const homeName = homeInfo?.name ?? homeTeam;
  const awayName = awayInfo?.name ?? awayTeam;

  // Quem marcou? Só nomeia se foi um lado só E o time é conhecido.
  let title = '⚽ Gol!';
  if (newHome > 0 && newAway <= 0 && homeInfo) {
    title = `⚽ Gol ${homeInfo.art} ${homeInfo.name}`;
  } else if (newAway > 0 && newHome <= 0 && awayInfo) {
    title = `⚽ Gol ${awayInfo.art} ${awayInfo.name}`;
  }

  const scoreLine = `${homeName} ${home} x ${away} ${awayName}`;
  const body = scorer ? `${scorer} foi o autor do gol!\n${scoreLine}` : scoreLine;

  return { title, body };
}
