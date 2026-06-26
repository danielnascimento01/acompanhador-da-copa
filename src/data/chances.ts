/**
 * CHANCE DE CLASSIFICAÇÃO (%) — simulação de Monte Carlo HONESTA.
 *
 * Princípio (ver qualidade-zero-bugs-dados): o número é uma ESTIMATIVA de chance,
 * claramente rotulada como tal — nunca um dado oficial. Cada jogo restante é
 * sorteado por um modelo de gols ponderado pela FORÇA das seleções (Elo, ver
 * teamStrength.ts): o favorito vence mais cenários, como na vida real. Os já
 * matematicamente classificados/eliminados saem em ~100%/~0% (independe do modelo).
 *
 * Para cada simulação: sorteia placares dos jogos não encerrados, monta a
 * classificação dos 12 grupos (pontos → saldo → gols), pega 1º+2º de cada grupo
 * e os 8 melhores 3ºs — exatamente o formato de 48 seleções. Conta quantas vezes
 * cada time avança. Invariante: em TODA simulação avançam exatamente 32 times
 * (24 + 8), logo a soma das probabilidades é sempre 3200%.
 *
 * Jogos JÁ ENCERRADOS são fixos; os demais (incluindo ao vivo) entram na
 * simulação. Times matematicamente garantidos saem em ~100%; eliminados em ~0%.
 */
import { GROUPS, TEAMS } from './teams';
import { Match, isFinished } from './fixtures';
import { teamElo } from './teamStrength';

export type TeamChance = { teamId: string; group: string; pct: number };
export type GroupChance = { group: string; teams: TeamChance[] };

// Modelo de gols por FORÇA: a média de gols de cada time num jogo restante depende
// da diferença de Elo. Favorito marca mais → ganha mais cenários (realista). Time
// igual (Elo igual) → 1,3 x 1,3 (neutro). λ limitado a [0,2 ; 4].
const BASE_GOALS = 1.3;
const ELO_K = 0.0018; // ~400 de Elo de vantagem ≈ dobro de gols esperados
function lambdas(eloHome: number, eloAway: number): [number, number] {
  const d = (eloHome - eloAway) * ELO_K;
  const clamp = (x: number) => Math.min(4, Math.max(0.2, x));
  return [clamp(BASE_GOALS * Math.exp(d)), clamp(BASE_GOALS * Math.exp(-d))];
}

/** Sorteia gols de UM time (Poisson, algoritmo de Knuth). */
function poisson(L: number): number {
  let k = 0;
  let p = 1;
  do {
    k++;
    p *= Math.random();
  } while (p > L);
  return k - 1;
}

/**
 * Roda a simulação e devolve, por grupo, a chance (%) de cada seleção avançar
 * (1º/2º do grupo OU entre os 8 melhores terceiros). `runs` = nº de cenários.
 */
export function simulateChances(matches: Match[], runs = 5000): GroupChance[] {
  // Índices estáveis para arrays rápidos.
  const ids = TEAMS.map((t) => t.id);
  const N = ids.length;
  const idx: Record<string, number> = {};
  const groupOf: string[] = new Array(N);
  ids.forEach((id, i) => (idx[id] = i));
  TEAMS.forEach((t) => (groupOf[idx[t.id]] = t.group));

  // Times por grupo (em índices).
  const groupTeams: Record<string, number[]> = {};
  for (const g of GROUPS) groupTeams[g] = [];
  TEAMS.forEach((t) => groupTeams[t.group].push(idx[t.id]));

  // Estatística-base dos jogos ENCERRADOS (fixa); pares restantes p/ simular.
  const basePts = new Float64Array(N);
  const baseGf = new Float64Array(N);
  const baseGa = new Float64Array(N);
  // Jogos restantes com o L=exp(-λ) de cada lado JÁ pré-calculado pela força
  // (Elo é fixo → calcula uma vez só, fora do laço de simulações).
  const remaining: Array<[number, number, number, number]> = [];

  for (const m of matches) {
    const gh = groupOf[idx[m.home]];
    const ga = groupOf[idx[m.away]];
    if (gh === undefined || gh !== ga) continue; // só fase de grupos (mesmo grupo)
    const h = idx[m.home];
    const a = idx[m.away];
    if (isFinished(m) && m.homeScore != null && m.awayScore != null) {
      baseGf[h] += m.homeScore; baseGa[h] += m.awayScore;
      baseGf[a] += m.awayScore; baseGa[a] += m.homeScore;
      if (m.homeScore > m.awayScore) basePts[h] += 3;
      else if (m.homeScore < m.awayScore) basePts[a] += 3;
      else { basePts[h] += 1; basePts[a] += 1; }
    } else {
      const [lh, la] = lambdas(teamElo(m.home), teamElo(m.away));
      remaining.push([h, a, Math.exp(-lh), Math.exp(-la)]);
    }
  }

  const pts = new Float64Array(N);
  const gf = new Float64Array(N);
  const ga = new Float64Array(N);
  const advanced = new Float64Array(N);

  // Comparador: pontos → saldo → gols pró (desc). Empate além disso: arbitrário
  // DENTRO de uma simulação (não afeta a contagem agregada de forma enviesada).
  const better = (x: number, y: number): number => {
    if (pts[y] !== pts[x]) return pts[y] - pts[x];
    const gdx = gf[x] - ga[x];
    const gdy = gf[y] - ga[y];
    if (gdy !== gdx) return gdy - gdx;
    return gf[y] - gf[x];
  };

  const thirds: number[] = [];

  for (let r = 0; r < runs; r++) {
    pts.set(basePts); gf.set(baseGf); ga.set(baseGa);

    for (let i = 0; i < remaining.length; i++) {
      const h = remaining[i][0];
      const a = remaining[i][1];
      const gh = poisson(remaining[i][2]); // gols do mandante (média pela força)
      const gaway = poisson(remaining[i][3]); // gols do visitante
      gf[h] += gh; ga[h] += gaway;
      gf[a] += gaway; ga[a] += gh;
      if (gh > gaway) pts[h] += 3;
      else if (gh < gaway) pts[a] += 3;
      else { pts[h] += 1; pts[a] += 1; }
    }

    thirds.length = 0;
    for (const g of GROUPS) {
      const t = groupTeams[g].slice().sort(better); // 4 times ordenados
      advanced[t[0]] += 1; // 1º avança
      advanced[t[1]] += 1; // 2º avança
      thirds.push(t[2]); // 3º entra na disputa dos melhores terceiros
    }
    thirds.sort(better);
    for (let i = 0; i < 8 && i < thirds.length; i++) advanced[thirds[i]] += 1;
  }

  // Monta o resultado por grupo, ordenado por chance desc.
  const result: GroupChance[] = GROUPS.map((g) => {
    const teams = groupTeams[g]
      .map((i) => ({ teamId: ids[i], group: g, pct: (advanced[i] / runs) * 100 }))
      .sort((x, y) => y.pct - x.pct);
    return { group: g, teams };
  });
  return result;
}
