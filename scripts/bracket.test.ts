/**
 * Testes da resolução do mata-mata (bracket.ts) — cenários verificados à mão.
 * Roda com: npx tsx scripts/bracket.test.ts
 * Garante que só preenchemos 1º/2º quando é INEQUÍVOCO (zero chute).
 */
import type { Match } from '../src/data/fixtures';
import { groupPositions } from '../src/data/bracket';

let id = 0;
function gm(home: string, away: string, hs: number | null, as: number | null): Match {
  id++;
  const future = hs == null;
  return {
    id: `t${id}`,
    utc: '2026-06-12T18:00:00Z',
    round: 1,
    home,
    away,
    homeBadge: null,
    awayBadge: null,
    venue: null,
    homeScore: hs,
    awayScore: as,
    status: future ? 'NS' : 'FT',
  };
}

let fails = 0;
function check(label: string, got: unknown, want: unknown) {
  const ok = JSON.stringify(got) === JSON.stringify(want);
  console.log(`${ok ? '✅' : '❌'} ${label}${ok ? '' : `  → got ${JSON.stringify(got)}, want ${JSON.stringify(want)}`}`);
  if (!ok) fails++;
}

const MEX = 'Mexico';
const SA = 'South Africa';
const SK = 'South Korea';
const CZ = 'Czech Republic';

// Caso 1: encerrado e claro → Mexico 9 (1º), SK 6 (2º), Czech 3, SA 0.
console.log('\n— Caso 1: 1º e 2º claros —');
const c1: Match[] = [
  gm(MEX, SA, 2, 0),
  gm(MEX, SK, 1, 0),
  gm(MEX, CZ, 1, 0),
  gm(SK, CZ, 1, 0),
  gm(SK, SA, 1, 0),
  gm(CZ, SA, 1, 0),
];
check('A.first', groupPositions(c1).A.first, MEX);
check('A.second', groupPositions(c1).A.second, SK);

// Caso 2: encerrado mas 1º/2º EMPATADOS (6/+1/2 cada; SK venceu Mexico) → indefinido.
console.log('\n— Caso 2: empate no topo (precisa de confronto direto) —');
const c2: Match[] = [
  gm(MEX, SA, 1, 0),
  gm(MEX, CZ, 1, 0),
  gm(SK, MEX, 1, 0),
  gm(SK, SA, 1, 0),
  gm(CZ, SK, 1, 0),
  gm(SA, CZ, 1, 0),
];
check('A.first (empate topo)', groupPositions(c2).A.first, undefined);
check('A.second (empate topo)', groupPositions(c2).A.second, undefined);

// Caso 3: 1º claro, mas 2º/3º empatados → first definido, second indefinido.
console.log('\n— Caso 3: 1º claro, 2º/3º empatados —');
const c3: Match[] = [
  gm(MEX, SA, 2, 0),
  gm(MEX, SK, 1, 0),
  gm(MEX, CZ, 1, 0),
  gm(SK, CZ, 0, 0),
  gm(SK, SA, 1, 0),
  gm(CZ, SA, 1, 0),
];
check('A.first (2/3 empate)', groupPositions(c3).A.first, MEX);
check('A.second (2/3 empate)', groupPositions(c3).A.second, undefined);

// Caso 4: grupo NÃO terminou → nada resolvido.
console.log('\n— Caso 4: grupo em andamento —');
const c4: Match[] = [
  gm(MEX, SA, 2, 0),
  gm(MEX, SK, 1, 0),
  gm(MEX, CZ, null, null), // futuro
  gm(SK, CZ, 1, 0),
  gm(SK, SA, 1, 0),
  gm(CZ, SA, 1, 0),
];
check('A.first (em andamento)', groupPositions(c4).A.first, undefined);
check('A.second (em andamento)', groupPositions(c4).A.second, undefined);

console.log('');
if (fails) {
  console.log(`❌ ${fails} teste(s) do bracket falharam.\n`);
  process.exit(1);
}
console.log('✅ Todos os testes do bracket passaram.\n');
