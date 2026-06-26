/**
 * "Dado de Craque" — carregamento dos dados (elencos + formações) e sorteio.
 * O JSON é carregado sob demanda (Metro inlineRequires) quando o jogo abre.
 */
import { makeRng, pickWeighted, type Rng } from './rng';
import type { FormationKey, Slot, Squad, Tactic } from './types';

import formationsJson from './formations.json';

// A base de elencos tem ~500KB — carregada SOB DEMANDA (só quando o jogo abre),
// pra não pesar no boot do app. As formações (pequenas) podem vir direto.
let _squads: Squad[] | null = null;
export function getSquads(): Squad[] {
  if (!_squads) _squads = require('./squads.json') as Squad[];
  return _squads;
}

export const FORMATIONS: FormationKey[] = ['4-3-3', '4-4-2', '4-2-3-1', '4-2-4', '3-5-2', '5-3-2', '4-5-1', '3-4-3'];
export const TACTICS: Tactic[] = ['defensivo', 'equilibrado', 'ofensivo'];

type FormTable = Record<string, Record<string, Slot[]>>;
const FORM = formationsJson as unknown as FormTable;

/** Os 11 slots (posição + x,y no campo) de uma formação+tática. */
export function slotsFor(formation: FormationKey, tactic: Tactic): Slot[] {
  return FORM[formation]?.[tactic] ?? [];
}

/** Contadores para a home ("X seleções · Y elencos · Z jogadores"). */
export function dataCounts(): { selecoes: number; elencos: number; jogadores: number } {
  const squads = getSquads();
  const sel = new Set(squads.map((s) => s.code));
  return {
    selecoes: sel.size,
    elencos: squads.length,
    jogadores: squads.reduce((n, s) => n + s.players.length, 0),
  };
}

/**
 * Sorteia um elenco (seleção + ano) de forma ponderada e determinística.
 * Peso leve para elencos com mais lendas (faz os times icônicos aparecerem um
 * pouco mais), mas todos têm chance. `excludeKey` evita repetir o último sorteio.
 */
export function rollSquad(seed: string, rollIndex: number, excludeKey?: string): Squad {
  const rng: Rng = makeRng(`${seed}:roll:${rollIndex}`);
  const all = getSquads();
  const pool = excludeKey ? all.filter((s) => `${s.code}-${s.year}` !== excludeKey) : all;
  const weights = pool.map((s) => 1 + s.players.filter((p) => p.legend).length * 0.15);
  return pickWeighted(rng, pool, weights);
}

export const squadKey = (s: Squad): string => `${s.code}-${s.year}`;
