/**
 * Compartilhamento por TEXTO (Share nativo do RN — sem dependência nova).
 *
 * Texto puro (0 KB) é o que o torcedor BR repassa no grupo do WhatsApp: roda em
 * qualquer aparelho e não gera asset visual que viralize fora do nosso controle
 * (importante para o 5.2.1). Cada compartilhamento leva o nome do app adiante.
 */
import { Share } from 'react-native';

import { Match, kickoff, isLive, isFinished } from '../data/fixtures';
import { teamFlag, teamName } from '../data/teams';
import { formatDayLong, formatTime } from './format';

const APP = 'Acompanhador da Copa 2026';
const LINK = 'https://danielnascimento01.github.io/acompanhador-da-copa/';
const SIG = `\n\nvia ${APP}\n${LINK}`;

/** Texto de UM jogo: placar (se já tem) ou data/hora do confronto. */
export function matchShareText(m: Match): string {
  const home = `${teamFlag(m.home)} ${teamName(m.home)}`;
  const away = `${teamName(m.away)} ${teamFlag(m.away)}`;
  const hasScore = m.homeScore != null && m.awayScore != null;
  if (hasScore) {
    const tag = isLive(m) ? ' ⚽ ao vivo' : isFinished(m) ? ' (encerrado)' : '';
    return `${home} ${m.homeScore}–${m.awayScore} ${away}${tag}${SIG}`;
  }
  const ko = kickoff(m);
  return `${home} x ${away}\n🗓️ ${formatDayLong(ko)} às ${formatTime(ko)}${SIG}`;
}

/** Lista de jogos (ex.: "o que tem hoje") já formatada pra colar no grupo. */
export function matchesShareText(title: string, matches: Match[]): string {
  const lines = matches.map((m) => {
    const hasScore = m.homeScore != null && m.awayScore != null;
    const score = hasScore ? `${m.homeScore}–${m.awayScore}` : formatTime(kickoff(m));
    return `${teamFlag(m.home)} ${teamName(m.home)} ${score} ${teamName(m.away)} ${teamFlag(m.away)}`;
  });
  return `${title}\n${lines.join('\n')}${SIG}`;
}

async function share(message: string): Promise<void> {
  try {
    await Share.share({ message });
  } catch {
    // usuário cancelou ou indisponível — silencioso, nada quebra.
  }
}

export const shareMatch = (m: Match) => share(matchShareText(m));
export const shareMatches = (title: string, matches: Match[]) => share(matchesShareText(title, matches));
