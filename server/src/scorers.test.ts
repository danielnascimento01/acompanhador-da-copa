/**
 * Teste do `sameScorers` — o comparador que decide se o cron PULA a regravação
 * da artilharia no KV (otimização da cota de escrita). Rodar: npx tsx src/scorers.test.ts
 *
 * Risco que este teste blinda: se `sameScorers` retornasse `true` quando a
 * artilharia MUDOU, a lista de artilheiros congelaria no app. Então provamos:
 *  - listas iguais (mesmo só com `updatedAt` diferente) → true  (pula escrita)
 *  - QUALQUER mudança real (gol novo, jogador novo, gol a menos) → false (grava)
 */
import { sameScorers, type LiveScorer } from './scorers';

let pass = 0;
let fail = 0;
function check(label: string, cond: boolean) {
  if (cond) { pass++; console.log(`✅ ${label}`); }
  else { fail++; console.log(`❌ ${label}`); }
}

const s = (player: string, teamName: string, goals: number, updatedAt = '2026-06-26T00:00:00.000Z'): LiveScorer =>
  ({ player, teamName, goals, updatedAt });

const A = [s('Messi', 'Argentina', 3), s('Cunha', 'Brasil', 2)];

// 1. idênticas → pula escrita
check('1. listas idênticas → true', sameScorers(A, A));

// 2. só updatedAt diferente → ainda pula (é o caso de TODO ciclo)
check('2. só updatedAt difere → true (não regrava à toa)',
  sameScorers(A, [s('Messi', 'Argentina', 3, '2026-06-26T23:59:00.000Z'), s('Cunha', 'Brasil', 2, '2026-06-26T23:59:00.000Z')]));

// 3. ordem diferente, mesmo conteúdo → true (a assinatura é ordenada)
check('3. mesma artilharia em outra ordem → true',
  sameScorers(A, [s('Cunha', 'Brasil', 2), s('Messi', 'Argentina', 3)]));

// 4. GOL NOVO (goals +1) → muda → TEM que regravar
check('4. um gol a mais → regrava',
  !sameScorers(A, [s('Messi', 'Argentina', 4), s('Cunha', 'Brasil', 2)]));

// 5. ARTILHEIRO NOVO entra → regrava
check('5. jogador novo na lista → regrava',
  !sameScorers(A, [...A, s('Mbappé', 'França', 1)]));

// 6. um a menos (correção/VAR) → regrava
check('6. lista encolheu → regrava',
  !sameScorers(A, [s('Messi', 'Argentina', 3)]));

// 7. mesmo nome/gols, TIME diferente → regrava (correção de dados)
check('7. mudou o time do artilheiro → regrava',
  !sameScorers(A, [s('Messi', 'Uruguai', 3), s('Cunha', 'Brasil', 2)]));

// 8. lista vazia vs vazia → true
check('8. vazia vs vazia → true', sameScorers([], []));

console.log(`\n${pass} passaram, ${fail} falharam`);
if (fail > 0) throw new Error(`${fail} teste(s) de sameScorers falharam`);
