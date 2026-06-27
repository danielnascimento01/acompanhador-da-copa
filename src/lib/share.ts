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
// Links DIRETOS das lojas — cada compartilhamento vira um convite de download.
const PLAY = 'https://play.google.com/store/apps/details?id=com.danielnascimento.copa2026';
const APPSTORE = 'https://apps.apple.com/app/id6779020711';
const SIG = `\n\n— ${APP}\n📲 Baixe grátis:\n🤖 Android: ${PLAY}\n🍏 iPhone: ${APPSTORE}`;

/** Lado de um confronto: rótulo da chave (mata-mata sem time) ou bandeira+nome. */
const sideHome = (m: Match): string => (m.homeLabel ? m.homeLabel : `${teamFlag(m.home)} ${teamName(m.home)}`);
const sideAway = (m: Match): string => (m.awayLabel ? m.awayLabel : `${teamName(m.away)} ${teamFlag(m.away)}`);

/** Texto de UM jogo: placar (se já tem) ou data/hora do confronto. */
export function matchShareText(m: Match): string {
  const home = sideHome(m);
  const away = sideAway(m);
  // Só compartilha placar de estado CONFIRMADO (ao vivo/encerrado) — nunca de
  // status preso/dado velho (que cairia no ramo de data/hora, neutro).
  const confirmed = isLive(m) || isFinished(m);
  const hasScore = confirmed && m.homeScore != null && m.awayScore != null;
  if (hasScore) {
    const tag = isLive(m) ? ' ⚽ ao vivo' : ' (encerrado)';
    return `${home} ${m.homeScore}–${m.awayScore} ${away}${tag}${SIG}`;
  }
  const ko = kickoff(m);
  return `${home} x ${away}\n🗓️ ${formatDayLong(ko)} às ${formatTime(ko)}${SIG}`;
}

/** Lista de jogos (ex.: "o que tem hoje") já formatada pra colar no grupo. */
export function matchesShareText(title: string, matches: Match[]): string {
  const lines = matches.map((m) => {
    const confirmed = isLive(m) || isFinished(m);
    const hasScore = confirmed && m.homeScore != null && m.awayScore != null;
    const score = hasScore ? `${m.homeScore}–${m.awayScore}` : formatTime(kickoff(m));
    return `${sideHome(m)} ${score} ${sideAway(m)}`;
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
