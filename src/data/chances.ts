/**
 * CHANCE DE CLASSIFICAÇÃO (%) — simulação de Monte Carlo HONESTA.
 *
 * Princípio (ver qualidade-zero-bugs-dados): não chutamos quem é melhor. Cada
 * jogo restante é simulado de forma NEUTRA — os dois times com o MESMO modelo de
 * gols (Poisson simétrico), então nenhuma seleção é favorecida. O número é uma
 * "chance nos cenários possíveis", não uma previsão de força.
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

export type TeamChance = { teamId: string; group: string; pct: number };
export type GroupChance = { group: string; teams: TeamChance[] };

const LAMBDA = 1.3; // média de gols por time num jogo (simétrico → neutro)

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
  const remaining: Array<[number, number]> = [];

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
      remaining.push([h, a]);
    }
  }

  const L = Math.exp(-LAMBDA);
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
      const gh = poisson(L);
      const gaway = poisson(L);
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
