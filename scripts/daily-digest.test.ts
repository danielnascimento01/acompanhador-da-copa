/**
 * Regressão do "X jogos hoje" (planAll / planDailyDigests).
 * Roda com: npx tsx scripts/daily-digest.test.ts
 *
 * Comportamento: resumo diário e avisos de "começando" são das seleções marcadas.
 * Sem nenhuma seleção marcada, o resumo cai pra todos os jogos do dia.
 */
import type { Match } from '../src/data/fixtures';
import type { Settings } from '../src/lib/storage';
import { planAll, planDailyDigests } from '../src/lib/notificationPlan';

let pass = 0, fail = 0;
function check(label: string, cond: boolean) {
  if (cond) { pass++; console.log(`✅ ${label}`); } else { fail++; console.log(`❌ ${label}`); }
}

let _id = 0;
function gm(home: string, away: string, utc: string): Match {
  _id++;
  return {
    id: `m${_id}`, utc, round: 1, home, away,
    homeBadge: null, awayBadge: null, venue: null,
    homeScore: null, awayScore: null, status: 'NS',
  } as Match;
}

// 4 jogos no mesmo dia (17/07). Marquei só FRA e ESP (2 seleções).
const D = '2026-07-17';
const matches: Match[] = [
  gm('NOR', 'FRA', `${D}T19:00:00Z`), // 16:00 BRT
  gm('SEN', 'IRQ', `${D}T19:00:00Z`), // 16:00 BRT
  gm('CPV', 'KSA', `${D}T23:00:00Z`), // noite
  gm('URU', 'ESP', `${D}T23:30:00Z`),
];
const teamIds = ['FRA', 'ESP'];

const settings = {
  dailyDigest: true,
  dailyDigestHour: 9,
  matchStart: true,
  matchStartLeadMinutes: 30,
} as unknown as Settings;

// "Agora" às 08:00 BRT do dia → resumo das 09:00 ainda no futuro.
const now = new Date(`${D}T11:00:00Z`);

// planDailyDigests lista exatamente o que recebe (aqui os 4).
const digests = planDailyDigests(matches, settings, now);
check('há um resumo diário', digests.length === 1);
check('lista o que recebe (4 jogos)', digests[0]?.body.split('\n').length === 4);

// planAll com 2 seleções marcadas → resumo só dos 2 jogos delas; começando = 2.
const planned = planAll(matches, teamIds, settings, now, 16, 60);
const digest = planned.find((p) => p.data.type === 'daily-digest');
const starts = planned.filter((p) => p.data.type === 'match-start');
check('resumo só das seleções marcadas (2 jogos)', !!digest && digest.title.includes('2 jogos'));
check('avisos de "começando" só das 2 seleções', starts.length === 2);

// planAll SEM seleção marcada → resumo cai pra todos os 4 jogos do dia.
const plannedAll = planAll(matches, [], settings, now, 16, 60);
const digestAll = plannedAll.find((p) => p.data.type === 'daily-digest');
const startsAll = plannedAll.filter((p) => p.data.type === 'match-start');
check('sem seleção marcada → resumo com todos (4 jogos)', !!digestAll && digestAll.title.includes('4 jogos'));
check('sem seleção marcada → nenhum aviso de "começando"', startsAll.length === 0);

console.log(`\n${fail === 0 ? '✅' : '❌'} Resumo diário: ${pass} ok, ${fail} falhas`);
if (fail > 0) process.exit(1);
