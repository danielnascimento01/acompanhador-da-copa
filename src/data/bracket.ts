/**
 * Estrutura OFICIAL do mata-mata da Copa 2026 (48 seleções), derivada da API da
 * ESPN (fifa.world scoreboard), que traz cada confronto com data/hora (UTC) e a
 * árvore completa. ⚠️ Importante: a 1ª versão veio de um resumo do Wikipedia e a
 * ÁRVORE das oitavas em diante estava errada; a ESPN corrigiu (cruzamento por
 * assinatura de slot + referências de vencedor). As datas/horas saem em UTC e são
 * convertidas para o fuso do aparelho na tela.
 *
 * Slots de "melhor 3º" listam os grupos candidatos; o time real só entra com a
 * definição oficial (Anexo C, 495 combinações) — nunca inventamos.
 */
import { Match, isFinished } from './fixtures';
import { computeStandings } from './standings';

export type Slot =
  | { kind: 'winner'; group: string }
  | { kind: 'runner'; group: string }
  | { kind: 'third'; groups: string[] }
  | { kind: 'winnerOf'; ref: string }
  | { kind: 'loserOf'; ref: string };

export type StageKey = 'r32' | 'r16' | 'qf' | 'sf' | 'third' | 'final';

export type BracketMatch = { id: string; stage: StageKey; idx: number; utc: string; a: Slot; b: Slot };

export const STAGE_META: { key: StageKey; name: string; abbrev: string }[] = [
  { key: 'r32', name: '32 avos de final', abbrev: '32-avos' },
  { key: 'r16', name: 'Oitavas de final', abbrev: 'Oitavas' },
  { key: 'qf', name: 'Quartas de final', abbrev: 'Quartas' },
  { key: 'sf', name: 'Semifinais', abbrev: 'Semi' },
  { key: 'third', name: 'Disputa de 3º lugar', abbrev: '3º lugar' },
  { key: 'final', name: 'Final', abbrev: 'Final' },
];

const W = (group: string): Slot => ({ kind: 'winner', group });
const R = (group: string): Slot => ({ kind: 'runner', group });
const T = (groups: string): Slot => ({ kind: 'third', groups: groups.split('') });
const Wof = (ref: string): Slot => ({ kind: 'winnerOf', ref });
const Lof = (ref: string): Slot => ({ kind: 'loserOf', ref });

export const BRACKET: BracketMatch[] = [
  // 32 avos (ordem cronológica da ESPN)
  { id: 'r32-1', stage: 'r32', idx: 1, utc: '2026-06-28T19:00:00Z', a: R('A'), b: R('B') },
  { id: 'r32-2', stage: 'r32', idx: 2, utc: '2026-06-29T17:00:00Z', a: W('C'), b: R('F') },
  { id: 'r32-3', stage: 'r32', idx: 3, utc: '2026-06-29T20:30:00Z', a: W('E'), b: T('ABCDF') },
  { id: 'r32-4', stage: 'r32', idx: 4, utc: '2026-06-30T01:00:00Z', a: W('F'), b: R('C') },
  { id: 'r32-5', stage: 'r32', idx: 5, utc: '2026-06-30T17:00:00Z', a: R('E'), b: R('I') },
  { id: 'r32-6', stage: 'r32', idx: 6, utc: '2026-06-30T21:00:00Z', a: W('I'), b: T('CDFGH') },
  { id: 'r32-7', stage: 'r32', idx: 7, utc: '2026-07-01T01:00:00Z', a: W('A'), b: T('CEFHI') },
  { id: 'r32-8', stage: 'r32', idx: 8, utc: '2026-07-01T16:00:00Z', a: W('L'), b: T('EHIJK') },
  { id: 'r32-9', stage: 'r32', idx: 9, utc: '2026-07-01T20:00:00Z', a: W('G'), b: T('AEHIJ') },
  { id: 'r32-10', stage: 'r32', idx: 10, utc: '2026-07-02T00:00:00Z', a: W('D'), b: T('BEFIJ') },
  { id: 'r32-11', stage: 'r32', idx: 11, utc: '2026-07-02T19:00:00Z', a: W('H'), b: R('J') },
  { id: 'r32-12', stage: 'r32', idx: 12, utc: '2026-07-02T23:00:00Z', a: R('K'), b: R('L') },
  { id: 'r32-13', stage: 'r32', idx: 13, utc: '2026-07-03T03:00:00Z', a: W('B'), b: T('EFGIJ') },
  { id: 'r32-14', stage: 'r32', idx: 14, utc: '2026-07-03T18:00:00Z', a: R('D'), b: R('G') },
  { id: 'r32-15', stage: 'r32', idx: 15, utc: '2026-07-03T22:00:00Z', a: W('J'), b: R('H') },
  { id: 'r32-16', stage: 'r32', idx: 16, utc: '2026-07-04T01:30:00Z', a: W('K'), b: T('DEIJL') },
  // Oitavas
  { id: 'r16-1', stage: 'r16', idx: 1, utc: '2026-07-04T17:00:00Z', a: Wof('r32-3'), b: Wof('r32-1') },
  { id: 'r16-2', stage: 'r16', idx: 2, utc: '2026-07-04T21:00:00Z', a: Wof('r32-5'), b: Wof('r32-2') },
  { id: 'r16-3', stage: 'r16', idx: 3, utc: '2026-07-05T20:00:00Z', a: Wof('r32-6'), b: Wof('r32-4') },
  { id: 'r16-4', stage: 'r16', idx: 4, utc: '2026-07-06T00:00:00Z', a: Wof('r32-8'), b: Wof('r32-7') },
  { id: 'r16-5', stage: 'r16', idx: 5, utc: '2026-07-06T19:00:00Z', a: Wof('r32-12'), b: Wof('r32-11') },
  { id: 'r16-6', stage: 'r16', idx: 6, utc: '2026-07-07T00:00:00Z', a: Wof('r32-10'), b: Wof('r32-9') },
  { id: 'r16-7', stage: 'r16', idx: 7, utc: '2026-07-07T16:00:00Z', a: Wof('r32-16'), b: Wof('r32-14') },
  { id: 'r16-8', stage: 'r16', idx: 8, utc: '2026-07-07T20:00:00Z', a: Wof('r32-15'), b: Wof('r32-13') },
  // Quartas
  { id: 'qf-1', stage: 'qf', idx: 1, utc: '2026-07-09T20:00:00Z', a: Wof('r16-2'), b: Wof('r16-1') },
  { id: 'qf-2', stage: 'qf', idx: 2, utc: '2026-07-10T19:00:00Z', a: Wof('r16-6'), b: Wof('r16-5') },
  { id: 'qf-3', stage: 'qf', idx: 3, utc: '2026-07-11T21:00:00Z', a: Wof('r16-4'), b: Wof('r16-3') },
  { id: 'qf-4', stage: 'qf', idx: 4, utc: '2026-07-12T01:00:00Z', a: Wof('r16-8'), b: Wof('r16-7') },
  // Semis
  { id: 'sf-1', stage: 'sf', idx: 1, utc: '2026-07-14T19:00:00Z', a: Wof('qf-2'), b: Wof('qf-1') },
  { id: 'sf-2', stage: 'sf', idx: 2, utc: '2026-07-15T19:00:00Z', a: Wof('qf-4'), b: Wof('qf-3') },
  // 3º lugar e Final
  { id: 'third', stage: 'third', idx: 1, utc: '2026-07-18T21:00:00Z', a: Lof('sf-2'), b: Lof('sf-1') },
  { id: 'final', stage: 'final', idx: 1, utc: '2026-07-19T19:00:00Z', a: Wof('sf-2'), b: Wof('sf-1') },
];

const BY_ID = new Map(BRACKET.map((m) => [m.id, m]));
const abbrevOf = (stage: StageKey): string => STAGE_META.find((s) => s.key === stage)?.abbrev ?? '';

/** Etiqueta curta de um jogo para referência (ex.: "32-avos J3", "Oitavas J1"). */
function refTag(id: string): string {
  const m = BY_ID.get(id);
  if (!m) return '';
  if (m.stage === 'third' || m.stage === 'final') return abbrevOf(m.stage);
  return `${abbrevOf(m.stage)} J${m.idx}`;
}

/** a está estritamente à frente de b por pontos+saldo+gols (sem desempate fino). */
function strictlyAhead(
  a: { points: number; gd: number; gf: number },
  b: { points: number; gd: number; gf: number },
): boolean {
  if (a.points !== b.points) return a.points > b.points;
  if (a.gd !== b.gd) return a.gd > b.gd;
  return a.gf > b.gf;
}

/**
 * 1º e 2º de cada grupo — SÓ quando o grupo terminou e a posição é inequívoca por
 * pontos+saldo+gols (empate na fronteira precisaria de confronto direto, que não
 * computamos → fica indefinido). O 2º só sai se o 1º também já está resolvido.
 */
export function groupPositions(matches: Match[]): Record<string, { first?: string; second?: string }> {
  const byGroup = computeStandings(matches);
  const out: Record<string, { first?: string; second?: string }> = {};
  for (const [group, table] of Object.entries(byGroup)) {
    out[group] = {};
    if (table.length < 3) continue;
    const ids = new Set(table.map((s) => s.teamId));
    const groupMatches = matches.filter((m) => ids.has(m.home) && ids.has(m.away));
    const finished = groupMatches.length > 0 && groupMatches.every(isFinished);
    if (!finished) continue;
    const firstClear = strictlyAhead(table[0], table[1]);
    if (firstClear) out[group].first = table[0].teamId;
    if (firstClear && strictlyAhead(table[1], table[2])) out[group].second = table[1].teamId;
  }
  return out;
}

/** Rótulo fixo de um slot (quando o time real ainda não é conhecido). */
export function slotLabel(slot: Slot): string {
  switch (slot.kind) {
    case 'winner':
      return `Vencedor Grupo ${slot.group}`;
    case 'runner':
      return `2º Grupo ${slot.group}`;
    case 'third':
      return `3º (${slot.groups.join('/')})`;
    case 'winnerOf':
      return `Vencedor ${refTag(slot.ref)}`;
    case 'loserOf':
      return `Perdedor ${refTag(slot.ref)}`;
  }
}

/** Resolve um slot para um teamId, se já conhecido com certeza (senão null). */
export function resolveSlot(
  slot: Slot,
  positions: Record<string, { first?: string; second?: string }>,
): string | null {
  if (slot.kind === 'winner') return positions[slot.group]?.first ?? null;
  if (slot.kind === 'runner') return positions[slot.group]?.second ?? null;
  return null; // terceiros e fases seguintes vêm da fonte oficial depois
}
