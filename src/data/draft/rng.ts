/**
 * RNG determinístico por seed (string) — mesma seed reproduz exatamente os mesmos
 * sorteios e a mesma simulação (permite compartilhar e desafiar com o mesmo time).
 * Algoritmos públicos (xmur3 p/ hash, mulberry32 p/ PRNG), implementados do zero.
 */

/** Hash de string → função que gera sementes 32-bit. */
function xmur3(str: string): () => number {
  let h = 1779033703 ^ str.length;
  for (let i = 0; i < str.length; i++) {
    h = Math.imul(h ^ str.charCodeAt(i), 3432918353);
    h = (h << 13) | (h >>> 19);
  }
  return () => {
    h = Math.imul(h ^ (h >>> 16), 2246822507);
    h = Math.imul(h ^ (h >>> 13), 3266489909);
    h ^= h >>> 16;
    return h >>> 0;
  };
}

/** PRNG mulberry32 → números em [0, 1). */
function mulberry32(a: number): () => number {
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export type Rng = () => number;

/** Cria um RNG a partir de uma seed string. */
export function makeRng(seed: string): Rng {
  return mulberry32(xmur3(seed)());
}

/** Escolha ponderada de um item (pesos não-negativos). */
export function pickWeighted<T>(rng: Rng, items: T[], weights: number[]): T {
  const total = weights.reduce((a, b) => a + b, 0);
  let r = rng() * total;
  for (let i = 0; i < items.length; i++) {
    if ((r -= weights[i]) <= 0) return items[i];
  }
  return items[items.length - 1];
}

/** Inteiro em [0, n). */
export function randInt(rng: Rng, n: number): number {
  return Math.floor(rng() * n);
}
