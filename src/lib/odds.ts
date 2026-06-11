/**
 * Config e gating do módulo de cotações (afiliação de apostas).
 *
 * 🔒 KILL-SWITCH POR CANAL: as odds aparecem em preview/dev, mas ficam OFF em
 * PRODUÇÃO automaticamente — assim os OTAs de produção durante a Copa NÃO ligam
 * apostas sem querer. Pra ativar em produção (depois de ter links de afiliado +
 * rating 18+ na loja), trocar a regra abaixo (ou ler de uma remote config).
 */
import type { Settings } from './storage';
import { BOOKMAKERS, type Bookmaker } from '../data/bookmakers';
import type { Match } from '../data/fixtures';

function currentChannel(): string | null {
  try {
    // require preguiçoso: expo-updates pode não existir no Expo Go.
    const Updates = require('expo-updates');
    return Updates.channel ?? null;
  } catch {
    return null;
  }
}

/** ON em preview/dev, OFF em produção (até decidirmos ligar com tudo compliant). */
export const ODDS_ENABLED = currentChannel() !== 'production';

/** Pode mostrar cotações? Precisa do módulo ligado E do usuário confirmado 18+. */
export function isOddsAvailable(settings: Settings): boolean {
  return ODDS_ENABLED && settings.is18Plus === true;
}

/** Monta o link de afiliado com o sub-id de rastreio (placeholder até ter o real). */
export function buildAffiliateUrl(b: Bookmaker, match: Match): string {
  const subid = `acompanhador-${match.id}`;
  return b.affiliateUrlTemplate.replace('{subid}', encodeURIComponent(subid));
}

export { BOOKMAKERS };
