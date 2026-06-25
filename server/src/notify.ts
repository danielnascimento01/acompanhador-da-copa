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
import type { ESPNPlay } from './espn';

/**
 * Artilheiro do gol que produziu o placar ATUAL — casamento EXATO por placar.
 * Retorna o nome só se existir um lance de gol cujo placar resultante é
 * exatamente o atual (ou seja, FOI esse gol). Senão null → push SEM nome.
 *
 * Por quê tão rígido: melhor nenhum nome do que o ERRADO. Pegar "o último gol"
 * podia atribuir o jogador de outro gol/time (foi o risco que o Daniel apontou).
 */
export function pickScorer(plays: ESPNPlay[], home: number, away: number): string | null {
  const goal = plays.find(
    (p) =>
      (p.type?.text ?? '').toLowerCase().includes('goal') &&
      p.homeScore === home &&
      p.awayScore === away,
  );
  return goal?.athletesInvolved?.[0]?.displayName ?? null;
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
