/**
 * Testes da calculadora dos 8 melhores terceiros (bestThirds.ts).
 * Roda com: npx tsx scripts/best-thirds.test.ts
 * Garante o mandato: só afirma quem avança quando é matematicamente certo;
 * empate na fronteira 8º/9º vira 'tie' (nunca um chute).
 */
import type { Match } from '../src/data/fixtures';
import { TEAMS, GROUPS } from '../src/data/teams';
import { bestThirds } from '../src/data/bestThirds';

let _id = 0;
function gm(home: string, away: string, hs: number | null, as: number | null): Match {
  _id++;
  return {
    id: `t${_id}`,
    utc: '2026-06-20T18:00:00Z',
    round: 1,
    home,
    away,
    homeBadge: null,
    awayBadge: null,
    venue: null,
    homeScore: hs,
    awayScore: as,
    status: hs == null ? 'NS' : 'FT',
  };
}

const teamsOf = (group: string): string[] => TEAMS.filter((t) => t.group === group).map((t) => t.id);

/**
 * Encerra um grupo em cascata (a>b>c>d, cada um ganha do de baixo por 1x0),
 * exceto o 3º (c) que bate o 4º (d) por `thirdMargin` gols — assim controlo o
 * saldo/gols do 3º para ordenar os terceiros entre os grupos.
 *  c termina sempre com 3 pts, saldo (thirdMargin-2), gols (thirdMargin).
 */
function finishGroup(group: string, thirdMargin: number): Match[] {
  const [a, b, c, d] = teamsOf(group);
  return [
    gm(a, b, 1, 0),
    gm(a, c, 1, 0),
    gm(a, d, 1, 0),
    gm(b, c, 1, 0),
    gm(b, d, 1, 0),
    gm(c, d, thirdMargin, 0),
  ];
}

let fails = 0;
function check(label: string, got: unknown, want: unknown) {
  const ok = JSON.stringify(got) === JSON.stringify(want);
  console.log(`${ok ? '✅' : '❌'} ${label}${ok ? '' : `  → got ${JSON.stringify(got)}, want ${JSON.stringify(want)}`}`);
  if (!ok) fails++;
}

// ===== Caso 1: 12 grupos encerrados, ordem LIMPA → resultado definitivo =====
// Margem do 3º por grupo (A maior → L menor): garante ordenação total por saldo.
console.log('— Caso 1: definido (corte limpo 8/9) —');
{
  const margins: Record<string, number> = { A: 12, B: 11, C: 10, D: 9, E: 8, F: 7, G: 6, H: 5, I: 4, J: 3, K: 2, L: 1 };
  const matches = GROUPS.flatMap((g) => finishGroup(g, margins[g]));
  const r = bestThirds(matches);
  check('todos os grupos terminaram', r.allGroupsFinished, true);
  check('fronteira 8/9 decidida', r.boundaryClear, true);
  check('resultado definitivo', r.definitive, true);
  check('12 linhas', r.rows.length, 12);
  check('1º colocado entre 3ºs = grupo A', r.rows[0].group, 'A');
  check('8º (último que avança) = grupo H', r.rows[7].group, 'H');
  check('8º avança (in)', r.rows[7].qualifies, 'in');
  check('9º fora (out)', r.rows[8].qualifies, 'out');
  check('9º = grupo I', r.rows[8].group, 'I');
  check('último = grupo L', r.rows[11].group, 'L');
  check('todos os 3ºs travados', r.rows.every((x) => x.locked), true);
  check('nota = definido', r.note.startsWith('Definido'), true);
}

// ===== Caso 2: empate EXATO na fronteira 8/9 → não afirma quem entra =====
console.log('\n— Caso 2: empate na fronteira 8/9 (fair-play/sorteio) —');
{
  // H e I com a MESMA margem (5) → mesmo pts+saldo+gols na fronteira.
  const margins: Record<string, number> = { A: 12, B: 11, C: 10, D: 9, E: 8, F: 7, G: 6, H: 5, I: 5, J: 3, K: 2, L: 1 };
  const matches = GROUPS.flatMap((g) => finishGroup(g, margins[g]));
  const r = bestThirds(matches);
  check('fronteira NÃO decidida', r.boundaryClear, false);
  check('NÃO é definitivo', r.definitive, false);
  // os dois empatados na fronteira devem estar como 'tie'
  const tie = r.rows.filter((x) => x.qualifies === 'tie').map((x) => x.group).sort();
  check('grupos empatados na fronteira', tie, ['H', 'I']);
  check('A..G entram (in)', r.rows.slice(0, 7).every((x) => x.qualifies === 'in'), true);
  check('J,K,L fora (out)', r.rows.slice(9).every((x) => x.qualifies === 'out'), true);
  check('nota cita desempate', r.note.includes('fair-play/sorteio'), true);
}

// ===== Caso 3: parcial (faltam grupos) → marcado como provisório =====
console.log('\n— Caso 3: parcial (em andamento) —');
{
  const matches = finishGroup('A', 3); // só o grupo A encerrado
  const r = bestThirds(matches);
  check('NÃO terminou tudo', r.allGroupsFinished, false);
  check('NÃO é definitivo', r.definitive, false);
  check('nota é parcial', r.note.startsWith('Parcial'), true);
  check('3º do grupo A está travado', r.rows.find((x) => x.group === 'A')?.locked, true);
}

console.log('');
if (fails) {
  console.log(`❌ ${fails} teste(s) dos melhores terceiros falharam.\n`);
  process.exit(1);
}
console.log('✅ Todos os testes dos melhores terceiros passaram.\n');
