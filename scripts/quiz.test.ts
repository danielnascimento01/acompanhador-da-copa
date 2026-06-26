/**
 * Teste de integridade do banco do QUIZ (src/data/quiz.ts).
 * Roda com: npx tsx scripts/quiz.test.ts
 *
 * Mesmo princípio do "zero bug de dados": uma pergunta malformada que chegue por
 * OTA não pode quebrar a tela nem mostrar alternativa inválida. Invariantes:
 *  - cada modo tem PELO MENOS QUESTIONS_PER_ROUND perguntas (toda rodada cheia,
 *    e o denominador /10 do menu nunca diverge do resultado);
 *  - toda pergunta tem exatamente 4 opções, sem opção duplicada;
 *  - answer é um índice válido (0..3);
 *  - enunciado e opções não vêm vazios.
 */
import { QUIZ, QUIZ_MODES, QUESTIONS_PER_ROUND, type QuizMode } from '../src/data/quiz';

let pass = 0, fail = 0;
function check(label: string, cond: boolean) {
  if (cond) { pass++; console.log(`✅ ${label}`); } else { fail++; console.log(`❌ ${label}`); }
}

console.log('— Integridade do banco do Quiz —');

for (const { key, label } of QUIZ_MODES) {
  const mode = key as QuizMode;
  const bank = QUIZ[mode];

  check(`${label}: tem >= ${QUESTIONS_PER_ROUND} perguntas (tem ${bank.length})`, bank.length >= QUESTIONS_PER_ROUND);

  bank.forEach((q, i) => {
    const tag = `${label} #${i + 1}`;
    if (!q.q || !q.q.trim()) check(`${tag}: enunciado não vazio`, false);
    if (q.options.length !== 4) check(`${tag}: tem 4 opções (tem ${q.options.length}) — "${q.q.slice(0, 40)}"`, false);
    if (q.options.some((o) => !o || !o.trim())) check(`${tag}: nenhuma opção vazia — "${q.q.slice(0, 40)}"`, false);
    const uniq = new Set(q.options.map((o) => o.trim().toLowerCase()));
    if (uniq.size !== q.options.length) check(`${tag}: sem opção duplicada — "${q.q.slice(0, 40)}"`, false);
    if (!Number.isInteger(q.answer) || q.answer < 0 || q.answer > 3) {
      check(`${tag}: answer válido (0-3) — "${q.q.slice(0, 40)}"`, false);
    }
  });
}

const total = QUIZ_MODES.reduce((s, m) => s + QUIZ[m.key as QuizMode].length, 0);
check(`Total de perguntas no banco: ${total}`, total > 0);

console.log(`\n${fail === 0 ? '✅' : '❌'} Quiz: ${pass} ok, ${fail} falhas`);
if (fail > 0) process.exit(1);
