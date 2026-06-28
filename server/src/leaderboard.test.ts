/**
 * Teste do ranking global (leaderboard.ts).
 * Roda com: npx tsx server/src/leaderboard.test.ts
 */
import { upsertScore, submitScore, type LBEntry } from './leaderboard';

let pass = 0, fail = 0;
function check(label: string, cond: boolean) {
  if (cond) { pass++; console.log(`✅ ${label}`); } else { fail++; console.log(`❌ ${label}`); }
}

// ── upsertScore: dedup por APELIDO, mantém o maior, ordena desc ──
{
  let list: LBEntry[] = [];
  list = upsertScore(list, { id: 'a', nick: 'Ana', score: 10, ts: 1 });
  list = upsertScore(list, { id: 'b', nick: 'Bia', score: 30, ts: 2 });
  list = upsertScore(list, { id: 'a', nick: 'Ana', score: 25, ts: 3 }); // sobe
  list = upsertScore(list, { id: 'a', nick: 'Ana', score: 5, ts: 4 });  // menor, ignora

  check('dedup: 2 jogadores únicos', list.length === 2);
  check('mantém o MAIOR de "Ana" (25)', list.find((e) => e.nick === 'Ana')?.score === 25);
  check('ordenado desc (Bia 30 no topo)', list[0].nick === 'Bia' && list[1].nick === 'Ana');
}

// ── REINSTALAÇÃO: mesmo apelido, ids DIFERENTES → colapsa em 1 (corrige o dup do print) ──
{
  let list: LBEntry[] = [];
  list = upsertScore(list, { id: 'old', nick: 'Daniel N', score: 326, ts: 1 });
  list = upsertScore(list, { id: 'new', nick: 'daniel n', score: 157, ts: 2 }); // reinstalou (case-insensitive)
  check('reinstalação: 1 entrada só por apelido', list.length === 1);
  check('reinstalação: mantém o MAIOR (326)', list[0].score === 326);
}

// ── Anônimos NÃO colapsam por apelido (cada aparelho conta separado) ──
{
  let list: LBEntry[] = [];
  list = upsertScore(list, { id: 'p1', nick: 'Anônimo', score: 40, ts: 1 });
  list = upsertScore(list, { id: 'p2', nick: 'Anônimo', score: 60, ts: 2 });
  check('anônimos contam por aparelho (2 entradas)', list.length === 2);
}

// ── empate: quem chegou antes (ts menor) fica na frente ──
{
  let list: LBEntry[] = [];
  list = upsertScore(list, { id: 'x', nick: 'X', score: 50, ts: 100 });
  list = upsertScore(list, { id: 'y', nick: 'Y', score: 50, ts: 50 });
  check('empate: ts menor primeiro (Y antes de X)', list[0].id === 'y');
}

// ── submitScore: validação via fake KV ──
async function main() {
  const store = new Map<string, string>();
  const kv = {
    get: async (k: string) => store.get(k) ?? null,
    put: async (k: string, v: string) => { store.set(k, v); },
  };

  const ok = await submitScore(kv, { game: 'embaixadinhas', id: 'd1', nick: 'Craque', score: 42 }, 1000);
  check('submit válido → ok', ok.ok === true && ok.ok && ok.top[0].score === 42);

  const badGame = await submitScore(kv, { game: 'xadrez', id: 'd1', nick: 'x', score: 1 }, 1001);
  check('jogo fora da allowlist → erro', badGame.ok === false);

  const badScore = await submitScore(kv, { game: 'embaixadinhas', id: 'd1', nick: 'x', score: -5 }, 1002);
  check('score negativo → erro', badScore.ok === false);

  const noId = await submitScore(kv, { game: 'embaixadinhas', id: '', nick: 'x', score: 5 }, 1003);
  check('id vazio → erro', noId.ok === false);

  const blankNick = await submitScore(kv, { game: 'embaixadinhas', id: 'd2', nick: '   ', score: 7 }, 1004);
  check('apelido só-espaços → "Anônimo"', blankNick.ok === true && blankNick.ok && blankNick.top.some((e) => e.nick === 'Anônimo'));

  console.log(`\n${fail === 0 ? '✅' : '❌'} Leaderboard: ${pass} ok, ${fail} falhas`);
  if (fail > 0) throw new Error(`${fail} falhas no leaderboard`);
}

main();
