/**
 * "Dado de Craque" — engine de simulação (pura, sem React/RN).
 * Determinística por seed. Toda a matemática é genérica (médias ponderadas +
 * modelo de gols de Poisson), construída do zero. A engine é agnóstica ao rating.
 */
import { makeRng, pickWeighted, type Rng } from './rng';
import type { CampaignResult, Forces, Goal, GroupRow, KnockoutGame, PenaltyShootout, Player, Position, Slot } from './types';

export type Lineup = { slots: Slot[]; players: (Player | null)[] };

// ── Pesos de ataque/defesa por posição (constantes de balanceamento) ───────────
export const PESO_ATAQUE: Record<Position, number> = {
  GOL: 0, LD: 0, ZAG: 0, LE: 0,
  MD: 0.5, ME: 0.5, VOL: 0.2, MC: 0.5, MEI: 0.8,
  PD: 1, CA: 1, PE: 1,
};
export const PESO_DEFESA: Record<Position, number> = {
  GOL: 1, LD: 1, ZAG: 1, LE: 1,
  MD: 0.5, ME: 0.5, VOL: 0.8, MC: 0.5, MEI: 0.2,
  PD: 0, CA: 0, PE: 0,
};

const MODELO = { baseLambda: 1.4, slope: 0.08, minLambda: 0.15, maxLambda: 5 };
const PENALTI = { base: 0.5, slope: 0.012, min: 0.1, max: 0.9 };
const ESMAGADOR_GD = 18;

// Rampa de dificuldade: overall do adversário por fase.
const GRUPO_OVERALLS = [68, 72, 76];
const KNOCKOUTS: { phase: KnockoutGame['phase']; label: string; overall: number }[] = [
  { phase: 'OITAVAS', label: 'Oitavas', overall: 79 },
  { phase: 'QUARTAS', label: 'Quartas', overall: 83 },
  { phase: 'SEMI', label: 'Semifinal', overall: 87 },
  { phase: 'FINAL', label: 'Final', overall: 91 },
];

function clamp(v: number, lo: number, hi: number): number {
  return Math.max(lo, Math.min(hi, v));
}

/** Força do time a partir dos 11 slots preenchidos (ataque/defesa/overall). */
export function calcForces(slots: Slot[], players: (Player | null)[]): Forces {
  let an = 0, ad = 0, dn = 0, dd = 0, soma = 0, n = 0;
  slots.forEach((slot, i) => {
    const p = players[i];
    const wa = PESO_ATAQUE[slot.pos];
    const wd = PESO_DEFESA[slot.pos];
    ad += wa; dd += wd;
    if (p) { an += p.rating * wa; dn += p.rating * wd; soma += p.rating; n++; }
  });
  return {
    attack: ad > 0 ? Math.round(an / ad) : 0,
    defense: dd > 0 ? Math.round(dn / dd) : 0,
    overall: n > 0 ? Math.round(soma / n) : 0,
  };
}

function lambda(atk: number, defAdv: number): number {
  const { baseLambda, slope, minLambda, maxLambda } = MODELO;
  return clamp(baseLambda + (atk - defAdv) * slope, minLambda, maxLambda);
}

/** Amostragem de Poisson (algoritmo de Knuth) usando o rng com seed. */
function poisson(rng: Rng, lam: number): number {
  if (lam <= 0) return 0;
  const L = Math.exp(-lam);
  let k = 0, p = 1;
  do { k++; p *= rng(); } while (p > L);
  return k - 1;
}

function probPenaltis(meuOverall: number, advOverall: number): number {
  const { base, slope, min, max } = PENALTI;
  return clamp(base + (meuOverall - advOverall) * slope, min, max);
}

type Team = { name: string; isMe: boolean; f: Forces };

/** Uma partida entre dois times (gols de cada lado), na perspectiva neutra. */
function matchBetween(rng: Rng, a: Team, b: Team): { ga: number; gb: number } {
  return {
    ga: poisson(rng, lambda(a.f.attack, b.f.defense)),
    gb: poisson(rng, lambda(b.f.attack, a.f.defense)),
  };
}

function opp(name: string, overall: number): Team {
  return { name, isMe: false, f: { attack: overall, defense: overall, overall } };
}

function outcomeOf(gf: number, ga: number): 'V' | 'E' | 'D' {
  return gf > ga ? 'V' : gf < ga ? 'D' : 'E';
}

/** Pool ofensivo (jogadores de pegada de ataque) para atribuir os autores dos gols. */
function offensivePool(lineup?: Lineup): { players: Player[]; weights: number[] } {
  const players: Player[] = [];
  const weights: number[] = [];
  if (lineup) {
    lineup.slots.forEach((s, i) => {
      const p = lineup.players[i];
      const w = PESO_ATAQUE[s.pos];
      if (p && w > 0) { players.push(p); weights.push(w * p.rating); }
    });
  }
  return { players, weights };
}

/** Gera minuto + autor de cada gol de uma partida (subseed próprio, não altera placares). */
function genGoals(seed: string, gi: number, gf: number, ga: number, pool: { players: Player[]; weights: number[] }): { myGoals: Goal[]; advGoals: Goal[] } {
  const rng = makeRng(`${seed}:copa:min:${gi}`);
  const used = new Set<number>();
  const minute = (): number => {
    let m = 1 + Math.floor(90 * Math.pow(rng(), 0.85));
    while (used.has(m)) m = (m % 90) + 1;
    used.add(m);
    return m;
  };
  const myGoals: Goal[] = [];
  for (let i = 0; i < gf; i++) {
    const scorer = pool.players.length ? pickWeighted(rng, pool.players, pool.weights).name : null;
    myGoals.push({ minute: minute(), scorer });
  }
  const advGoals: Goal[] = [];
  for (let i = 0; i < ga; i++) advGoals.push({ minute: minute(), scorer: null });
  myGoals.sort((a, b) => a.minute - b.minute);
  advGoals.sort((a, b) => a.minute - b.minute);
  return { myGoals, advGoals };
}

/** Encenação dos pênaltis coerente com o vencedor já decidido (meWin). */
function genShootout(seed: string, gi: number, meWin: boolean): PenaltyShootout {
  const rng = makeRng(`${seed}:copa:pen:${gi}`);
  const kick = (): boolean => rng() < 0.78;
  const me: boolean[] = [];
  const adv: boolean[] = [];
  for (let i = 0; i < 5; i++) { me.push(kick()); adv.push(kick()); }
  const count = (a: boolean[]) => a.filter(Boolean).length;
  while (count(me) === count(adv)) { me.push(kick()); adv.push(kick()); } // morte súbita
  let scoreMe = count(me), scoreAdv = count(adv);
  // Ajusta pro vencedor decidido pela probabilidade: troca os lados se divergir.
  if ((scoreMe > scoreAdv) !== meWin) {
    return { me: adv, adv: me, scoreMe: scoreAdv, scoreAdv: scoreMe };
  }
  return { me, adv, scoreMe, scoreAdv };
}

/** Simula a campanha inteira (7 jogos) a partir da força do time e da seed. */
export function simulateCampaign(forces: Forces, seed: string, lineup?: Lineup): CampaignResult {
  const rng = makeRng(`${seed}:copa`);
  const me: Team = { name: 'Seu time', isMe: true, f: forces };
  const pool = offensivePool(lineup);

  // ── Fase de grupos: round-robin de 4 (você + 3 adversários 68/72/76) ──
  const o1 = opp('Adv. 68', GRUPO_OVERALLS[0]);
  const o2 = opp('Adv. 72', GRUPO_OVERALLS[1]);
  const o3 = opp('Adv. 76', GRUPO_OVERALLS[2]);
  const teams = [me, o1, o2, o3];

  const table: GroupRow[] = teams.map((t) => ({
    name: t.name, isMe: t.isMe, P: 0, W: 0, D: 0, L: 0, GF: 0, GA: 0, GD: 0, Pts: 0,
  }));
  const idx = new Map(teams.map((t, i) => [t, i]));
  const apply = (t: Team, gf: number, ga: number) => {
    const r = table[idx.get(t)!];
    r.P++; r.GF += gf; r.GA += ga; r.GD = r.GF - r.GA;
    if (gf > ga) { r.W++; r.Pts += 3; } else if (gf < ga) { r.L++; } else { r.D++; r.Pts += 1; }
  };

  // Agenda: você joga o1, o2, o3 nas 3 rodadas; adversários se enfrentam no resto.
  const fixtures: [Team, Team][] = [
    [me, o1], [o2, o3],
    [me, o2], [o1, o3],
    [me, o3], [o1, o2],
  ];
  const groupGames: CampaignResult['group']['games'] = [];
  fixtures.forEach(([a, b]) => {
    const { ga, gb } = matchBetween(rng, a, b);
    apply(a, ga, gb);
    apply(b, gb, ga);
    if (a.isMe || b.isMe) {
      const myGf = a.isMe ? ga : gb;
      const myGa = a.isMe ? gb : ga;
      const advOverall = (a.isMe ? b : a).f.overall;
      const gi = groupGames.length;
      const goals = genGoals(seed, gi, myGf, myGa, pool);
      groupGames.push({ label: `Grupo · ${gi + 1}º jogo`, advOverall, gf: myGf, ga: myGa, outcome: outcomeOf(myGf, myGa), ...goals });
    }
  });

  // Classificação: pontos, saldo, gols feitos (depois: "eu" desempata melhor).
  const sorted = [...table].sort((p, q) => q.Pts - p.Pts || q.GD - p.GD || q.GF - p.GF || (p.isMe ? -1 : 1));
  const rank = sorted.findIndex((r) => r.isMe) + 1;
  const advanced = rank <= 2;

  let wins = 0, draws = 0, losses = 0, goalsFor = 0, goalsAgainst = 0;
  for (const g of groupGames) {
    goalsFor += g.gf; goalsAgainst += g.ga;
    if (g.outcome === 'V') wins++; else if (g.outcome === 'E') draws++; else losses++;
  }

  const knockouts: KnockoutGame[] = [];
  let eliminatedAt: string | null = advanced ? null : 'GRUPOS';
  let alive = advanced;

  for (const ko of KNOCKOUTS) {
    if (!alive) break;
    const adv = opp(ko.label, ko.overall);
    const { ga, gb } = matchBetween(rng, me, adv);
    const outcome = outcomeOf(ga, gb);
    goalsFor += ga; goalsAgainst += gb;
    if (outcome === 'V') wins++; else if (outcome === 'E') draws++; else losses++;

    const gi = 3 + knockouts.length; // grupos usaram 0,1,2
    const goals = genGoals(seed, gi, ga, gb, pool);

    let penalties: KnockoutGame['penalties'] = null;
    let advancedThis = outcome === 'V';
    if (outcome === 'E') {
      const prob = probPenaltis(me.f.overall, ko.overall);
      const meWin = rng() < prob;
      penalties = { meWin, prob, shootout: genShootout(seed, gi, meWin) };
      advancedThis = meWin;
    }
    knockouts.push({ phase: ko.phase, label: ko.label, advOverall: ko.overall, gf: ga, ga: gb, outcome, ...goals, penalties, advanced: advancedThis });
    if (!advancedThis) { alive = false; eliminatedAt = ko.phase; }
  }

  const champion = alive && advanced && knockouts.length === KNOCKOUTS.length && knockouts[knockouts.length - 1].advanced;
  const perfect = champion && draws === 0 && losses === 0; // o "Dado de Craque perfeito"
  const muralha = champion && goalsAgainst === 0;
  const gd = goalsFor - goalsAgainst;
  const badge: CampaignResult['badge'] =
    perfect && gd >= ESMAGADOR_GD ? 'ESMAGADOR' : muralha ? 'MURALHA' : perfect ? 'PERFEITO' : null;

  return {
    group: { games: groupGames, table: sorted, rank, advanced },
    knockouts,
    wins, draws, losses,
    goalsFor, goalsAgainst,
    champion, perfect, muralha, badge,
    record: `${wins}-${losses}`,
    eliminatedAt,
  };
}
