/**
 * Cotações (odds) — MVP MOCKADO. Os números são gerados de forma DETERMINÍSTICA a
 * partir do id do jogo + casa, então parecem reais e não mudam a cada render.
 *
 * Quando plugar dados reais: trocar `oddsFor` por uma leitura de feed/API (ou do
 * widget da própria casa). O resto do app não muda.
 */
import type { Match } from './fixtures';

export type MatchOdds = { home: number; draw: number; away: number };

function hashStr(s: string): number {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

/** Cotações 1/X/2 mockadas e estáveis para um jogo numa casa específica. */
export function oddsFor(match: Match, bookmakerId: string): MatchOdds {
  const h = hashStr(`${match.id}:${bookmakerId}`);
  const home = 1.45 + (h % 130) / 50; // ~1.45–4.05
  const draw = 3.0 + ((h >> 5) % 70) / 60; // ~3.00–4.16
  const away = 1.6 + ((h >> 11) % 150) / 50; // ~1.60–4.60
  const r = (n: number) => Math.round(n * 100) / 100;
  return { home: r(home), draw: r(draw), away: r(away) };
}
