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
import type { MatchAlertKind } from './matchAlerts';

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

/**
 * Texto do aviso de FIM DE JOGO. Simples e direto:
 *   título:  🏁 Fim de jogo
 *   corpo:   Brasil 1 x 0 Escócia
 */
export function buildFullTimeNotification(input: {
  homeTeam: string;
  awayTeam: string;
  home: number;
  away: number;
}): { title: string; body: string } {
  return {
    title: '🏁 Fim de jogo',
    body: scoreLine(input.homeTeam, input.awayTeam, input.home, input.away),
  };
}

export function buildMatchAlertNotification(input: {
  kind: MatchAlertKind;
  homeTeam: string;
  awayTeam: string;
  detail?: string;
  currentStart?: string;
}): { title: string; body: string } {
  const match = `${displayTeam(input.homeTeam)} x ${displayTeam(input.awayTeam)}`;
  const time = input.currentStart ? formatBrazilTime(input.currentStart) : null;
  const detail = sanitizeDetail(input.detail);

  if (input.kind === 'time_changed') {
    return {
      title: `⚠️ ${match} mudou de horário`,
      body: time ? joinSentences(`Agora previsto para ${time}.`, detail) : detail ?? 'A ESPN sinalizou mudança no horário da partida.',
    };
  }

  if (input.kind === 'started') {
    return {
      title: `▶️ ${match} começou`,
      body: detail ?? 'A bola já está rolando.',
    };
  }

  if (input.kind === 'postponed') {
    return {
      title: `⚠️ ${match} adiado`,
      body: detail ?? 'A ESPN sinalizou adiamento da partida. Avisaremos se houver nova atualização.',
    };
  }

  if (input.kind === 'suspended') {
    return {
      title: `⚠️ ${match} suspenso`,
      body: detail ?? 'A ESPN sinalizou suspensão da partida. Avisaremos se houver nova atualização.',
    };
  }

  return {
    title: `⚠️ ${match} atrasado`,
    body: time
      ? joinSentences(`Partida atrasada. Novo horário previsto: ${time}.`, detail)
      : detail ?? 'A ESPN sinalizou atraso na partida. Avisaremos se houver nova atualização.',
  };
}

/**
 * Linha de placar com emoji de bandeira ao lado de cada país:
 *   "🇧🇷 Brasil 1 x 0 🏴 Escócia"
 * Time desconhecido (sem info) cai pro nome ESPN sem emoji.
 */
function scoreLine(homeTeam: string, awayTeam: string, home: number, away: number): string {
  const h = teamInfo(homeTeam);
  const a = teamInfo(awayTeam);
  const hName = h?.name ?? homeTeam;
  const aName = a?.name ?? awayTeam;
  const hE = h?.emoji ? `${h.emoji} ` : '';
  const aE = a?.emoji ? `${a.emoji} ` : '';
  return `${hE}${hName} ${home} x ${away} ${aE}${aName}`;
}

function displayTeam(team: string): string {
  return teamInfo(team)?.name ?? team;
}

function formatBrazilTime(iso: string): string | null {
  const ms = Date.parse(iso);
  if (!Number.isFinite(ms)) return null;
  return new Intl.DateTimeFormat('pt-BR', {
    timeZone: 'America/Sao_Paulo',
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(ms));
}

function sanitizeDetail(detail?: string): string | undefined {
  const clean = detail?.replace(/\s+/g, ' ').trim();
  if (!clean || clean === 'STATUS_DELAYED' || clean === 'STATUS_POSTPONED' || clean === 'STATUS_SUSPENDED') {
    return undefined;
  }
  return clean.length > 180 ? `${clean.slice(0, 177)}...` : clean;
}

function joinSentences(first: string, second?: string): string {
  return second ? `${first} ${second}` : first;
}

export function buildGoalNotification(input: GoalNotifyInput): { title: string; body: string } {
  const { homeTeam, awayTeam, home, away, newHome, newAway, scorer } = input;

  const homeInfo = teamInfo(homeTeam);
  const awayInfo = teamInfo(awayTeam);

  // Quem marcou? Só nomeia se foi um lado só E o time é conhecido.
  let title = '⚽ Gol!';
  if (newHome > 0 && newAway <= 0 && homeInfo) {
    title = `⚽ Gol ${homeInfo.art} ${homeInfo.name}`;
  } else if (newAway > 0 && newHome <= 0 && awayInfo) {
    title = `⚽ Gol ${awayInfo.art} ${awayInfo.name}`;
  }

  const line = scoreLine(homeTeam, awayTeam, home, away);
  const body = scorer ? `${scorer} foi o autor do gol!\n${line}` : line;

  return { title, body };
}
