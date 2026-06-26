/**
 * Regressão do "X jogos hoje" (planAll / planDailyDigests).
 * Roda com: npx tsx scripts/daily-digest.test.ts
 *
 * Bug que isto trava: o resumo diário vinha FILTRADO pelas seleções marcadas
 * (mostrou "2 jogos hoje" quando havia 4). O resumo tem que listar TODOS os jogos
 * do dia; só os avisos de "jogo começando" é que filtram pelas seleções.
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

// planDailyDigests recebendo TODOS → conta 4.
const digests = planDailyDigests(matches, settings, now);
check('há um resumo diário', digests.length === 1);
check('resumo conta os 4 jogos do dia (não 2)', digests[0]?.title.includes('4 jogos'));
check('corpo do resumo tem 4 linhas', (digests[0]?.body.split('\n').length) === 4);

// planAll: resumo continua com 4; avisos de "começando" só das 2 marcadas.
const planned = planAll(matches, teamIds, settings, now, 16, 60);
const digest = planned.find((p) => p.data.type === 'daily-digest');
const starts = planned.filter((p) => p.data.type === 'match-start');
check('planAll: resumo com os 4 jogos', !!digest && digest.title.includes('4 jogos'));
check('planAll: avisos de "começando" só das 2 seleções marcadas', starts.length === 2);

console.log(`\n${fail === 0 ? '✅' : '❌'} Resumo diário: ${pass} ok, ${fail} falhas`);
if (fail > 0) process.exit(1);
