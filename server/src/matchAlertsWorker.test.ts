/**
 * Teste de integração do envio de alertas operacionais de partida.
 * Rodar: npx tsx src/matchAlertsWorker.test.ts
 */
import { processMatchAlerts } from './index';
import type { ESPNEvent } from './espn';
import type { SubscriberPrefs } from './filter';

let pass = 0;
let fail = 0;

function check(label: string, got: unknown, want: unknown) {
  if (JSON.stringify(got) === JSON.stringify(want)) {
    pass++;
    console.log(`✅ ${label}`);
  } else {
    fail++;
    console.log(`❌ ${label} — esperava ${JSON.stringify(want)}, veio ${JSON.stringify(got)}`);
  }
}

function fakeKV(initial: Record<string, string> = {}) {
  const store = new Map(Object.entries(initial));
  return {
    async get(key: string) {
      return store.get(key) ?? null;
    },
    async put(key: string, value: string) {
      store.set(key, value);
    },
    dump() {
      return Object.fromEntries(store.entries());
    },
  };
}

function ev(): ESPNEvent {
  return {
    id: 'm1',
    name: 'Mexico vs Ecuador',
    date: '2026-07-01T01:00Z',
    status: { type: { state: 'pre', name: 'STATUS_DELAYED', detail: 'Weather Delay' } },
    competitions: [
      {
        startDate: '2026-07-01T01:00Z',
        competitors: [
          { homeAway: 'home', score: '0', team: { id: 'mex', displayName: 'Mexico', abbreviation: 'MEX' } },
          { homeAway: 'away', score: '0', team: { id: 'ecu', displayName: 'Ecuador', abbreviation: 'ECU' } },
        ],
      },
    ],
  };
}

const subs: Record<string, SubscriberPrefs> = {
  followsMexico: { mode: 'mine', teams: ['Mexico'], matches: [], fullTime: 'off' },
  followsOther: { mode: 'mine', teams: ['Brazil'], matches: [], fullTime: 'off' },
  legacyAll: { mode: 'all', teams: [], matches: [], fullTime: 'off' },
  allOff: { mode: 'off', teams: ['Mexico'], matches: [], fullTime: 'off' },
};

async function main() {
  const kv = fakeKV();
  const sent: string[][] = [];
  const first = await processMatchAlerts([ev()], subs, kv, async (tokens) => {
    sent.push(tokens);
    return { invalidTokens: [] };
  });
  check('alerta envia só para quem acompanha seleção envolvida', sent, [['followsMexico']]);
  check('contador soma destinatários enviados', first.sent, 1);

  const second = await processMatchAlerts([ev()], subs, kv, async (tokens) => {
    sent.push(tokens);
    return { invalidTokens: [] };
  });
  check('mesma assinatura não reenvia', second.sent, 0);
  check('KV guarda assinatura do alerta', typeof JSON.parse(kv.dump()['matchAlert:m1']).signature, 'string');

  console.log(`\n${pass} passaram, ${fail} falharam`);
  if (fail > 0) throw new Error(`${fail} teste(s) de envio de alertas falharam`);
}

void main();
