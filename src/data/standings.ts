import { GROUPS, TEAMS, teamName } from './teams';
import { Match, isKnockoutPredictable, isPredictable, isFinished, isLive } from './fixtures';
import type { PredictionMap } from '../lib/storage';

export type Standing = {
  teamId: string;
  group: string;
  played: number;
  win: number;
  draw: number;
  loss: number;
  gf: number; // gols pró
  ga: number; // gols contra
  gd: number; // saldo
  points: number;
};

function emptyStanding(teamId: string, group: string): Standing {
  return { teamId, group, played: 0, win: 0, draw: 0, loss: 0, gf: 0, ga: 0, gd: 0, points: 0 };
}

/** Critério objetivo do regulamento: pontos → saldo → gols pró. 0 = empatados. */
function compareObjective(a: Standing, b: Standing): number {
  if (b.points !== a.points) return b.points - a.points;
  if (b.gd !== a.gd) return b.gd - a.gd;
  if (b.gf !== a.gf) return b.gf - a.gf;
  return 0;
}

/** Chave dos critérios objetivos (para agrupar empatados). */
function objKey(s: Standing): string {
  return `${s.points}|${s.gd}|${s.gf}`;
}

/**
 * Confronto direto (FIFA): mini-tabela contada SÓ com os jogos disputados ENTRE
 * os times empatados. Mesmos critérios (pontos → saldo → gols pró) restritos a
 * esses confrontos. É o desempate real antes de fair-play/sorteio.
 */
function headToHead(tied: Standing[], matches: Match[]): Map<string, Standing> {
  const ids = new Set(tied.map((t) => t.teamId));
  const mini = new Map<string, Standing>();
  for (const t of tied) mini.set(t.teamId, emptyStanding(t.teamId, t.group));
  for (const m of matches) {
    if (m.homeScore == null || m.awayScore == null) continue;
    if (!isFinished(m) && !isLive(m)) continue;
    if (!ids.has(m.home) || !ids.has(m.away)) continue; // só jogos entre os empatados
    const H = mini.get(m.home)!;
    const A = mini.get(m.away)!;
    const hs = m.homeScore;
    const as = m.awayScore;
    H.gf += hs; H.ga += as; H.gd = H.gf - H.ga;
    A.gf += as; A.ga += hs; A.gd = A.gf - A.ga;
    if (hs > as) H.points += 3;
    else if (hs < as) A.points += 3;
    else { H.points++; A.points++; }
  }
  return mini;
}

/**
 * Ordena um grupo: critério objetivo e, dentro de cada bolha de empatados,
 * aplica confronto direto; só então o nome (apenas para ordem de EXIBIÇÃO
 * estável — não é critério oficial). Empate que persiste fica adjacente, mas a
 * ordem entre eles não é uma afirmação de classificação (iria a fair-play/sorteio).
 */
function sortGroup(list: Standing[], matches: Match[]): Standing[] {
  const sorted = [...list].sort(compareObjective);
  const result: Standing[] = [];
  let i = 0;
  while (i < sorted.length) {
    let j = i + 1;
    while (j < sorted.length && objKey(sorted[j]) === objKey(sorted[i])) j++;
    const bucket = sorted.slice(i, j);
    if (bucket.length > 1) {
      const mini = headToHead(bucket, matches);
      bucket.sort((a, b) => {
        const d = compareObjective(mini.get(a.teamId)!, mini.get(b.teamId)!);
        if (d !== 0) return d;
        return teamName(a.teamId).localeCompare(teamName(b.teamId));
      });
    }
    result.push(...bucket);
    i = j;
  }
  return result;
}

/**
 * Calcula a classificação de cada grupo a partir dos jogos com placar
 * (encerrados ou ao vivo). Vitória = 3, empate = 1.
 */
export function computeStandings(matches: Match[]): Record<string, Standing[]> {
  const table = new Map<string, Standing>();
  for (const t of TEAMS) table.set(t.id, emptyStanding(t.id, t.group));

  for (const m of matches) {
    if (m.homeScore == null || m.awayScore == null) continue;
    // Só conta placar CONFIRMADO: jogo encerrado, ou ao vivo genuíno (dentro da
    // janela). Placar preso num status "ao vivo" fora da janela (dado velho) NÃO
    // entra — senão vira ponto/posição errados na tabela.
    if (!isFinished(m) && !isLive(m)) continue;
    const h = table.get(m.home);
    const a = table.get(m.away);
    if (!h || !a || h.group !== a.group) continue; // só fase de grupos, mesmo grupo

    const hs = m.homeScore;
    const as = m.awayScore;
    h.played++;
    a.played++;
    h.gf += hs;
    h.ga += as;
    a.gf += as;
    a.ga += hs;
    h.gd = h.gf - h.ga;
    a.gd = a.gf - a.ga;
    if (hs > as) {
      h.win++;
      h.points += 3;
      a.loss++;
    } else if (hs < as) {
      a.win++;
      a.points += 3;
      h.loss++;
    } else {
      h.draw++;
      a.draw++;
      h.points++;
      a.points++;
    }
  }

  const byGroup: Record<string, Standing[]> = {};
  for (const g of GROUPS) byGroup[g] = [];
  for (const s of table.values()) byGroup[s.group]?.push(s);
  for (const g of GROUPS) byGroup[g] = sortGroup(byGroup[g], matches);
  return byGroup;
}

export function standingsForGroup(matches: Match[], group: string): Standing[] {
  return computeStandings(matches)[group] ?? [];
}

/**
 * Aplica os palpites do usuário sobre a lista de jogos, SOMENTE nos jogos
 * ainda palpitáveis (sem qualquer placar real, não iniciados). O placar
 * oficial — mesmo parcial — sempre prevalece sobre o palpite.
 */
export function applyPredictions(matches: Match[], predictions: PredictionMap): Match[] {
  return matches.map((m) => {
    if (!isPredictable(m)) return m; // placar real / jogo iniciado mandam
    const p = predictions[m.id];
    if (!p) return m;
    return { ...m, homeScore: p.home, awayScore: p.away };
  });
}

/** Quantos palpites do usuário ainda valem (mesmo critério da simulação). */
export function countActivePredictions(matches: Match[], predictions: PredictionMap): number {
  let n = 0;
  for (const m of matches) {
    if ((isPredictable(m) || isKnockoutPredictable(m)) && predictions[m.id]) n++;
  }
  return n;
}
