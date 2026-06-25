/**
 * Teste de integração do AVISO DE FIM DE JOGO (processFullTime).
 * Rodar: npx tsx src/fulltime.test.ts
 *
 * Prova, com KV e envio FALSOS (injetados), que o aviso:
 *  1. dispara UMA vez na transição ao-vivo('in')→encerrado('post')
 *  2. NÃO dispara retroativo (jogo já 'post' na 1ª vez que o worker o vê)
 *  3. NÃO reenvia no ciclo seguinte (estado já 'post')
 *  4. respeita o filtro (fullTime off / seleção não seguida → ninguém)
 *  5. o texto traz emoji + placar corretos ("🇧🇷 Brasil 1 x 0 🏴 Escócia")
 */
import { processFullTime } from './index';
import type { SubscriberPrefs } from './filter';
import type { ESPNEvent } from './espn';

let pass = 0;
let fail = 0;
function check(label: string, cond: boolean) {
  if (cond) { pass++; console.log(`✅ ${label}`); }
  else { fail++; console.log(`❌ ${label}`); }
}

// emoji da bandeira (mesma fonte do servidor) p/ montar o esperado exato
function emoji(code: string): string {
  if (code === 'gb-sct' || code === 'gb-eng') {
    const region = code.replace('-', '');
    return '\u{1F3F4}' + [...region].map((c) => String.fromCodePoint(0xe0000 + c.charCodeAt(0))).join('') + '\u{E007F}';
  }
  return [...code].map((c) => String.fromCodePoint(0x1f1e6 + c.charCodeAt(0) - 97)).join('');
}
const BR = emoji('br');
const SCT = emoji('gb-sct');

function ev(id: string, homeTeam: string, awayTeam: string, h: number, a: number, state: 'in' | 'post' = 'post'): ESPNEvent {
  return {
    id,
    name: `${homeTeam} vs ${awayTeam}`,
    status: { type: { state, name: state }, displayClock: "90'", period: 2 },
    competitions: [
      {
        competitors: [
          { homeAway: 'home', score: String(h), team: { id: `H${id}`, displayName: homeTeam, abbreviation: '' } },
          { homeAway: 'away', score: String(a), team: { id: `A${id}`, displayName: awayTeam, abbreviation: '' } },
        ],
      },
    ],
  };
}

function fakeKV(initial: Record<string, string> = {}) {
  const m = new Map<string, string>(Object.entries(initial));
  return {
    store: m,
    async get(k: string) { return m.has(k) ? m.get(k)! : null; },
    async put(k: string, v: string) { m.set(k, v); },
  };
}

type Sent = { tokens: string[]; msg: { title: string; body: string; data?: Record<string, unknown> } };
function fakeSend(invalid: string[] = []) {
  const sent: Sent[] = [];
  const send = async (tokens: string[], msg: Sent['msg']) => { sent.push({ tokens, msg }); return { invalidTokens: invalid }; };
  return { sent, send };
}

const sub = (fullTime: SubscriberPrefs['fullTime'], teams: string[] = []): SubscriberPrefs => ({ mode: 'off', teams, matches: [], fullTime });

async function main() {
  // ── 1. transição in→post dispara UMA vez, com texto correto ──────────────
  {
    const kv = fakeKV({ 'state:m1': 'in' });
    const { sent, send } = fakeSend();
    const subs = { 'ExponentPushToken[t1]': sub('all') };
    const r = await processFullTime([ev('m1', 'Brazil', 'Scotland', 1, 0)], subs, kv, send);
    check('1. enviou exatamente 1 push', sent.length === 1);
    check('1. título = 🏁 Fim de jogo', sent[0]?.msg.title === '🏁 Fim de jogo');
    check('1. corpo com emoji + placar', sent[0]?.msg.body === `${BR} Brasil 1 x 0 ${SCT} Escócia`);
    check('1. data.matchId + kind=fulltime', sent[0]?.msg.data?.matchId === 'm1' && sent[0]?.msg.data?.kind === 'fulltime');
    check('1. estado virou post', kv.store.get('state:m1') === 'post');
    check('1. retorno sent = 1', r.sent === 1);
  }

  // ── 2. jogo já 'post' na 1ª vez (sem estado prévio) → NÃO avisa ──────────
  {
    const kv = fakeKV(); // nenhum estado prévio
    const { sent, send } = fakeSend();
    const subs = { 'ExponentPushToken[t1]': sub('all') };
    await processFullTime([ev('m2', 'Brazil', 'Scotland', 2, 1)], subs, kv, send);
    check('2. NÃO avisou jogo já encerrado (sem retroativo)', sent.length === 0);
    check('2. mas registrou estado post', kv.store.get('state:m2') === 'post');
  }

  // ── 3. estado já 'post' → NÃO reenvia ────────────────────────────────────
  {
    const kv = fakeKV({ 'state:m3': 'post' });
    const { sent, send } = fakeSend();
    const subs = { 'ExponentPushToken[t1]': sub('all') };
    await processFullTime([ev('m3', 'Brazil', 'Scotland', 0, 0)], subs, kv, send);
    check('3. não reenviou (já era post)', sent.length === 0);
  }

  // ── 4. idempotência em 2 ciclos seguidos ─────────────────────────────────
  {
    const kv = fakeKV({ 'state:m4': 'in' });
    const { sent, send } = fakeSend();
    const subs = { 'ExponentPushToken[t1]': sub('all') };
    const fin = ev('m4', 'Brazil', 'Scotland', 3, 2);
    await processFullTime([fin], subs, kv, send); // ciclo 1: dispara
    await processFullTime([fin], subs, kv, send); // ciclo 2: não reenvia
    check('4. 2 ciclos → 1 push só', sent.length === 1);
  }

  // ── 5. filtro: fullTime 'off' e 'mine' sem a seleção → ninguém ───────────
  {
    const kv = fakeKV({ 'state:m5': 'in' });
    const { sent, send } = fakeSend();
    const subs = {
      'ExponentPushToken[off]': sub('off'),
      'ExponentPushToken[mineOther]': sub('mine', ['France']),
    };
    await processFullTime([ev('m5', 'Brazil', 'Scotland', 1, 1)], subs, kv, send);
    check("5. 'off' e 'mine' sem a seleção → 0 destinatários", sent.length === 0);
  }

  // ── 6. filtro 'mine' COM a seleção seguida → recebe ──────────────────────
  {
    const kv = fakeKV({ 'state:m6': 'in' });
    const { sent, send } = fakeSend();
    const subs = { 'ExponentPushToken[mine]': sub('mine', ['Brazil']) };
    await processFullTime([ev('m6', 'Brazil', 'Scotland', 2, 0)], subs, kv, send);
    check("6. 'mine' com a seleção → recebe", sent.length === 1 && sent[0].tokens[0] === 'ExponentPushToken[mine]');
  }

  // ── 7. token inválido é retornado p/ remoção ─────────────────────────────
  {
    const kv = fakeKV({ 'state:m7': 'in' });
    const { send } = fakeSend(['ExponentPushToken[dead]']);
    const subs = { 'ExponentPushToken[dead]': sub('all') };
    const r = await processFullTime([ev('m7', 'Brazil', 'Scotland', 0, 1)], subs, kv, send);
    check('7. token inválido retornado p/ remoção', r.removedTokens.includes('ExponentPushToken[dead]'));
  }

  console.log(`\n${pass} passaram, ${fail} falharam`);
  if (fail > 0) throw new Error(`${fail} teste(s) de fim de jogo falharam`);
}

main();
