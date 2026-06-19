/**
 * Estrutura OFICIAL do mata-mata da Copa 2026 (48 seleções).
 *
 * Fonte: regulamento FIFA / "2026 FIFA World Cup knockout stage" (Wikipedia),
 * jogos 73–104. Os cruzamentos por COLOCAÇÃO de grupo são fixos; o adversário
 * "melhor 3º" de cada slot depende de quais 8 terceiros se classificam (Anexo C,
 * 495 combinações) — por isso esses slots listam os grupos candidatos e só são
 * preenchidos com o time real quando a definição oficial sair (não inventamos).
 *
 * Os vencedores/2º de cada grupo são preenchidos quando o grupo TERMINA e a
 * posição é inequívoca (pontos+saldo+gols) — senão fica "a definir" (zero chute).
 */
import { Match, isFinished } from './fixtures';
import { computeStandings } from './standings';

export type Slot =
  | { kind: 'winner'; group: string }
  | { kind: 'runner'; group: string }
  | { kind: 'third'; groups: string[] }
  | { kind: 'winnerOf'; match: number }
  | { kind: 'loserOf'; match: number };

export type StageKey = 'r32' | 'r16' | 'qf' | 'sf' | 'third' | 'final';

export type BracketMatch = { n: number; stage: StageKey; date: string; a: Slot; b: Slot };

export const STAGE_META: { key: StageKey; name: string }[] = [
  { key: 'r32', name: '32 avos de final' },
  { key: 'r16', name: 'Oitavas de final' },
  { key: 'qf', name: 'Quartas de final' },
  { key: 'sf', name: 'Semifinais' },
  { key: 'third', name: 'Disputa de 3º lugar' },
  { key: 'final', name: 'Final' },
];

const W = (group: string): Slot => ({ kind: 'winner', group });
const R = (group: string): Slot => ({ kind: 'runner', group });
const T = (groups: string): Slot => ({ kind: 'third', groups: groups.split('') });
const Wm = (match: number): Slot => ({ kind: 'winnerOf', match });
const Lm = (match: number): Slot => ({ kind: 'loserOf', match });

export const BRACKET: BracketMatch[] = [
  // 32 avos (73–88)
  { n: 73, stage: 'r32', date: '28/06', a: R('A'), b: R('B') },
  { n: 74, stage: 'r32', date: '29/06', a: W('E'), b: T('ABCDF') },
  { n: 75, stage: 'r32', date: '29/06', a: W('F'), b: R('C') },
  { n: 76, stage: 'r32', date: '29/06', a: W('C'), b: R('F') },
  { n: 77, stage: 'r32', date: '30/06', a: W('I'), b: T('CDFGH') },
  { n: 78, stage: 'r32', date: '30/06', a: R('E'), b: R('I') },
  { n: 79, stage: 'r32', date: '30/06', a: W('A'), b: T('CEFHI') },
  { n: 80, stage: 'r32', date: '01/07', a: W('L'), b: T('EHIJK') },
  { n: 81, stage: 'r32', date: '01/07', a: W('D'), b: T('BEFIJ') },
  { n: 82, stage: 'r32', date: '01/07', a: W('G'), b: T('AEHIJ') },
  { n: 83, stage: 'r32', date: '02/07', a: R('K'), b: R('L') },
  { n: 84, stage: 'r32', date: '02/07', a: W('H'), b: R('J') },
  { n: 85, stage: 'r32', date: '02/07', a: W('B'), b: T('EFGIJ') },
  { n: 86, stage: 'r32', date: '03/07', a: W('J'), b: R('H') },
  { n: 87, stage: 'r32', date: '03/07', a: W('K'), b: T('DEIJL') },
  { n: 88, stage: 'r32', date: '03/07', a: R('D'), b: R('G') },
  // Oitavas (89–96)
  { n: 89, stage: 'r16', date: '04/07', a: Wm(74), b: Wm(77) },
  { n: 90, stage: 'r16', date: '04/07', a: Wm(73), b: Wm(75) },
  { n: 91, stage: 'r16', date: '05/07', a: Wm(76), b: Wm(78) },
  { n: 92, stage: 'r16', date: '05/07', a: Wm(79), b: Wm(80) },
  { n: 93, stage: 'r16', date: '06/07', a: Wm(83), b: Wm(84) },
  { n: 94, stage: 'r16', date: '06/07', a: Wm(81), b: Wm(82) },
  { n: 95, stage: 'r16', date: '07/07', a: Wm(86), b: Wm(88) },
  { n: 96, stage: 'r16', date: '07/07', a: Wm(85), b: Wm(87) },
  // Quartas (97–100)
  { n: 97, stage: 'qf', date: '09/07', a: Wm(89), b: Wm(90) },
  { n: 98, stage: 'qf', date: '10/07', a: Wm(93), b: Wm(94) },
  { n: 99, stage: 'qf', date: '11/07', a: Wm(91), b: Wm(92) },
  { n: 100, stage: 'qf', date: '11/07', a: Wm(95), b: Wm(96) },
  // Semis (101–102)
  { n: 101, stage: 'sf', date: '14/07', a: Wm(97), b: Wm(98) },
  { n: 102, stage: 'sf', date: '15/07', a: Wm(99), b: Wm(100) },
  // 3º lugar (103) e Final (104)
  { n: 103, stage: 'third', date: '18/07', a: Lm(101), b: Lm(102) },
  { n: 104, stage: 'final', date: '19/07', a: Wm(101), b: Wm(102) },
];

/** a está estritamente à frente de b por pontos+saldo+gols (sem desempate fino). */
function strictlyAhead(
  a: { points: number; gd: number; gf: number },
  b: { points: number; gd: number; gf: number },
): boolean {
  if (a.points !== b.points) return a.points > b.points;
  if (a.gd !== b.gd) return a.gd > b.gd;
  return a.gf > b.gf; // empate total aqui = depende de confronto direto → NÃO resolvemos
}

/**
 * 1º e 2º de cada grupo — SÓ quando o grupo terminou e a posição é inequívoca
 * por pontos+saldo+gols. Empate total na fronteira (precisaria de confronto
 * direto, que não computamos) → fica indefinido. Garante zero erro.
 */
export function groupPositions(matches: Match[]): Record<string, { first?: string; second?: string }> {
  const byGroup = computeStandings(matches);
  const out: Record<string, { first?: string; second?: string }> = {};
  for (const [group, table] of Object.entries(byGroup)) {
    out[group] = {};
    if (table.length < 3) continue;
    const groupMatches = matches.filter((m) => {
      // jogo é desse grupo se ambos os times pertencem a ele (todos da tabela)
      const ids = new Set(table.map((s) => s.teamId));
      return ids.has(m.home) && ids.has(m.away);
    });
    const finished = groupMatches.length > 0 && groupMatches.every(isFinished);
    if (!finished) continue;
    // 1º só é certo se está à frente do 2º. O 2º só é certo se o 1º JÁ está
    // resolvido (senão não dá pra saber quem é 1º e quem é 2º entre os empatados)
    // E o 2º está à frente do 3º.
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
      return `Vencedor do jogo ${slot.match}`;
    case 'loserOf':
      return `Perdedor do jogo ${slot.match}`;
  }
}

/** Resolve um slot para um teamId, se já for conhecido com certeza (senão null). */
export function resolveSlot(
  slot: Slot,
  positions: Record<string, { first?: string; second?: string }>,
): string | null {
  if (slot.kind === 'winner') return positions[slot.group]?.first ?? null;
  if (slot.kind === 'runner') return positions[slot.group]?.second ?? null;
  return null; // terceiros e fases seguintes vêm da fonte oficial depois
}
