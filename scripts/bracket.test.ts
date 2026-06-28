/**
 * Testes da resolução do mata-mata (bracket.ts) — cenários verificados à mão.
 * Roda com: npx tsx scripts/bracket.test.ts
 * Garante que só preenchemos 1º/2º quando é INEQUÍVOCO (zero chute).
 */
import type { Match } from '../src/data/fixtures';
import { BRACKET, Slot, groupPositions, bracketAsMatches, knockoutResults } from '../src/data/bracket';

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

// ===== Sanidade estrutural da chave (pega erro de transcrição) =====
console.log('— Estrutura do bracket —');
{
  const ids = new Set<string>();
  let dup = false;
  for (const m of BRACKET) {
    if (ids.has(m.id)) dup = true;
    ids.add(m.id);
  }
  const refsOf = (s: Slot): string[] => (s.kind === 'winnerOf' || s.kind === 'loserOf' ? [s.ref] : []);
  let badRef = false;
  for (const m of BRACKET) for (const r of [...refsOf(m.a), ...refsOf(m.b)]) if (!ids.has(r)) badRef = true;
  check('ids únicos', dup, false);
  check('refs de vencedor/perdedor válidos', badRef, false);
  check('32 jogos no mata-mata', BRACKET.length, 32);

  const r32 = BRACKET.filter((m) => m.stage === 'r32');
  const winners: Record<string, number> = {};
  const runners: Record<string, number> = {};
  // Os 8 melhores 3ºs já estão CONFIRMADOS oficialmente (Copa em andamento) → os
  // slots viraram 'fixed' (time real) em vez de 'third' (rótulo de candidatos).
  // Antes da definição oficial seriam 'third'; aqui contamos os dois como "vaga de 3º".
  let thirdSlots = 0;
  for (const m of r32)
    for (const s of [m.a, m.b]) {
      if (s.kind === 'winner') winners[s.group] = (winners[s.group] ?? 0) + 1;
      if (s.kind === 'runner') runners[s.group] = (runners[s.group] ?? 0) + 1;
      if (s.kind === 'third' || s.kind === 'fixed') thirdSlots++;
    }
  const groups = 'ABCDEFGHIJKL'.split('');
  check('cada grupo aparece 1x como vencedor', groups.every((g) => winners[g] === 1), true);
  check('cada grupo aparece 1x como 2º', groups.every((g) => runners[g] === 1), true);
  check('8 vagas de melhor 3º (third|fixed)', thirdSlots, 8);
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

// ===== Auto-advance: o vencedor preenche a próxima fase (só com CERTEZA) =====
console.log('\n— Auto-advance do mata-mata —');
{
  const SUI = 'Switzerland';
  const CAN = 'Canada';
  const BIH = 'Bosnia-Herzegovina';
  // Grupos A e B encerrados → A: Mexico 1º, South Africa 2º; B: Switzerland 1º, Canada 2º.
  const groups: Match[] = [
    gm(MEX, SK, 3, 0), gm(MEX, SA, 2, 0), gm(SA, SK, 2, 0),
    gm(SUI, CAN, 2, 0), gm(SUI, BIH, 2, 0), gm(CAN, BIH, 2, 0),
  ];
  // r32-1 = R(A) × R(B) = South Africa × Canada.
  const koGame = (hs: number, as: number, adv?: 'home' | 'away'): Match => ({
    id: 'r32-1', utc: '2026-06-28T19:00:00Z', round: 4, home: SA, away: CAN,
    homeBadge: null, awayBadge: null, venue: null, homeScore: hs, awayScore: as,
    status: 'FT', advance: adv, stageLabel: '16-avos de final',
  });

  // (A) Decidido no tempo normal: Canadá 0×1 → avança (= away do r16-1, que é Wof r32-1).
  const a = [...groups, koGame(0, 1, 'away')];
  check('A) r32-1 winner = Canadá', knockoutResults(a)['r32-1']?.winner, CAN);
  check('A) r16-1 away preenchido com Canadá', bracketAsMatches(a).find((m) => m.id === 'r16-1')!.away, CAN);

  // (B) Empate SEM flag de vencedor (pênaltis sem dado) → NÃO chuta: slot fica rótulo.
  const b = [...groups, koGame(1, 1)];
  check('B) empate s/ flag = vencedor indefinido', knockoutResults(b)['r32-1'] ?? null, null);
  check('B) r16-1 away continua a definir', bracketAsMatches(b).find((m) => m.id === 'r16-1')!.away, '');

  // (C) Empate decidido nos PÊNALTIS (flag=home) → vencedor pelo flag, não pelo placar.
  const c = [...groups, koGame(1, 1, 'home')];
  check('C) pênaltis: vencedor = South Africa (flag, não placar)', knockoutResults(c)['r32-1']?.winner, SA);
}

console.log('');
if (fails) {
  console.log(`❌ ${fails} teste(s) do bracket falharam.\n`);
  process.exit(1);
}
console.log('✅ Todos os testes do bracket passaram.\n');
