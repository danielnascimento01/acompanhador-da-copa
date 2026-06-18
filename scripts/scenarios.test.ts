/**
 * Testes do motor de cenários (scenarios.ts) — cenários verificados à mão.
 * Roda com: npx tsx scripts/scenarios.test.ts
 * Falha (exit 1) se qualquer afirmação do motor divergir do esperado.
 */
import type { Match } from '../src/data/fixtures';
import { teamOutlook } from '../src/data/scenarios';

let id = 0;
/** placar null => jogo futuro (NS); com placar => encerrado (FT). */
function gm(home: string, away: string, hs: number | null, as: number | null): Match {
  id++;
  const future = hs == null;
  return {
    id: `t${id}`,
    utc: future ? `2026-06-25T${String(10 + (id % 12)).padStart(2, '0')}:00:00Z` : '2026-06-12T18:00:00Z',
    round: future ? 3 : 1,
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

const NOW = new Date('2026-06-18T00:00:00Z');
const MEX = 'Mexico';
const SA = 'South Africa';
const SK = 'South Korea';
const CZ = 'Czech Republic';

// ===== Caso 1: Grupo A após 2 rodadas =====
// Mexico 6 (venceu SA e SK), SK 3, SA 3, Czech 0. Faltam: Mex-Czech, SK-SA.
console.log('\n— Caso 1: após 2 rodadas —');
const c1: Match[] = [
  gm(MEX, SA, 1, 0),
  gm(SK, CZ, 1, 0),
  gm(MEX, SK, 1, 0),
  gm(SA, CZ, 1, 0),
  gm(MEX, CZ, null, null), // futuro
  gm(SK, SA, null, null), // futuro
];
const mex = teamOutlook(c1, MEX, NOW)!;
check('Mexico guaranteedTop2', mex.guaranteedTop2, true);
check('Mexico points', mex.points, 6);

const sa = teamOutlook(c1, SA, NOW)!;
check('SA guaranteedTop2', sa.guaranteedTop2, false);
check('SA eliminatedFromTop2', sa.eliminatedFromTop2, false);
check('SA next.win', sa.next?.win, 'classified-direct');
check('SA next.draw', sa.next?.draw, 'depends');
check('SA next.loss', sa.next?.loss, 'eliminated-direct');

const cz = teamOutlook(c1, CZ, NOW)!;
check('Czech eliminatedFromTop2', cz.eliminatedFromTop2, true);
check('Czech canFinishThird', cz.canFinishThird, true);

// ===== Caso 2: Grupo A encerrado =====
// Mexico 9, SK 6, Czech 3, SA 0.
console.log('\n— Caso 2: grupo encerrado —');
const c2: Match[] = [
  gm(MEX, SA, 2, 0),
  gm(MEX, SK, 1, 0),
  gm(MEX, CZ, 1, 0),
  gm(SK, CZ, 1, 0),
  gm(SK, SA, 1, 0),
  gm(CZ, SA, 1, 0),
];
const mex2 = teamOutlook(c2, MEX, NOW)!;
check('Mexico done', mex2.done, true);
check('Mexico guaranteedTop2', mex2.guaranteedTop2, true);

const sa2 = teamOutlook(c2, SA, NOW)!;
check('SA done', sa2.done, true);
check('SA eliminatedFromTop2', sa2.eliminatedFromTop2, true);
check('SA canFinishThird (4º)', sa2.canFinishThird, false);

const cz2 = teamOutlook(c2, CZ, NOW)!;
check('Czech eliminatedFromTop2', cz2.eliminatedFromTop2, true);
check('Czech canFinishThird (3º)', cz2.canFinishThird, true);

// ===== Caso 3: rodada 1, tudo em aberto (nada garantido/eliminado) =====
console.log('\n— Caso 3: após 1 rodada, tudo aberto —');
const c3: Match[] = [
  gm(MEX, SA, 1, 0),
  gm(SK, CZ, 1, 0),
  gm(MEX, SK, null, null),
  gm(SA, CZ, null, null),
  gm(MEX, CZ, null, null),
  gm(SK, SA, null, null),
];
const mex3 = teamOutlook(c3, MEX, NOW)!;
check('Mexico guaranteedTop2 (cedo)', mex3.guaranteedTop2, false);
check('Mexico eliminatedFromTop2 (cedo)', mex3.eliminatedFromTop2, false);
const sa3 = teamOutlook(c3, SA, NOW)!;
check('SA eliminatedFromTop2 (cedo)', sa3.eliminatedFromTop2, false);

console.log('');
if (fails) {
  console.log(`❌ ${fails} teste(s) falharam.\n`);
  process.exit(1);
}
console.log('✅ Todos os testes do motor de cenários passaram.\n');
console.log('Frase (Mexico, caso 1):', mex.phraseShort);
console.log('Frase (SA, caso 1):', sa.phraseLong);
console.log('Frase (Czech, caso 2):', cz2.phraseShort);
