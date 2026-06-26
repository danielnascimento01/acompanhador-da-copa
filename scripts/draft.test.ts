/**
 * Testes da engine do "Dado de Craque" (draft + simulação de Copa).
 * Roda com: npx tsx scripts/draft.test.ts
 *
 * Cobre: integridade dos dados, determinismo por seed, cálculo de força e
 * balanceamento (time forte vence muito mais que time fraco).
 */
import { getSquads, FORMATIONS, TACTICS, slotsFor, rollSquad, squadKey } from '../src/data/draft/data';
import { calcForces, simulateCampaign } from '../src/data/draft/engine';
import { POSITIONS, type Player, type Forces } from '../src/data/draft/types';

let pass = 0, fail = 0;
function check(label: string, cond: boolean) {
  if (cond) { pass++; console.log(`✅ ${label}`); } else { fail++; console.log(`❌ ${label}`); }
}

const SQUADS = getSquads();

// ── 1. Integridade dos dados ──────────────────────────────────────────────────
console.log('— Integridade dos dados —');
check('250 elencos', SQUADS.length === 250);
const posSet = new Set<string>(POSITIONS);
let shortSquads = 0, badRating = 0, badPos = 0, withLegend = 0;
for (const s of SQUADS) {
  if (s.players.length < 11) shortSquads++;
  if (s.players.some((p) => p.legend)) withLegend++;
  for (const p of s.players) {
    if (p.rating < 0 || p.rating > 99) badRating++;
    if (p.pos.length === 0 || p.pos.some((x) => !posSet.has(x))) badPos++;
  }
}
check('todo elenco tem >= 11 jogadores', shortSquads === 0);
check('todo rating entre 0 e 99', badRating === 0);
check('toda posição é válida (12 tipos)', badPos === 0);
// Lendas existem na grande maioria; alguns elencos fracos/antigos não têm — ok.
check('maioria dos elencos tem lenda (>= 200)', withLegend >= 200);

check('8 formações', FORMATIONS.length === 8);
let badForm = 0;
for (const f of FORMATIONS) for (const t of TACTICS) {
  const slots = slotsFor(f, t);
  if (slots.length !== 11) badForm++;
  if (slots.some((sl) => !posSet.has(sl.pos))) badForm++;
}
check('8×3 táticas com 11 slots de posição válida', badForm === 0);

// ── 2. Cálculo de força ───────────────────────────────────────────────────────
console.log('\n— Cálculo de força —');
function lineup(rating: number) {
  const slots = slotsFor('4-3-3', 'equilibrado');
  const players: Player[] = slots.map((sl, i) => ({ id: `t${i}`, name: `J${i}`, pos: [sl.pos], rating, num: i, legend: false }));
  return { slots, players };
}
{
  const { slots, players } = lineup(80);
  const f = calcForces(slots, players);
  check('11 jogadores rating 80 → attack/defense/overall = 80', f.attack === 80 && f.defense === 80 && f.overall === 80);
}
{
  const { slots, players } = lineup(50);
  const f = calcForces(slots, players);
  check('11 jogadores rating 50 → tudo 50', f.attack === 50 && f.defense === 50 && f.overall === 50);
}

// ── 3. Determinismo por seed ─────────────────────────────────────────────────
console.log('\n— Determinismo —');
const F: Forces = { attack: 84, defense: 80, overall: 82 };
{
  const a = JSON.stringify(simulateCampaign(F, 'seed-abc'));
  const b = JSON.stringify(simulateCampaign(F, 'seed-abc'));
  check('mesma seed → campanha idêntica', a === b);
  const c = JSON.stringify(simulateCampaign(F, 'seed-xyz'));
  check('seed diferente → campanha diferente', a !== c);
}
{
  const r1 = rollSquad('s', 0);
  const r2 = rollSquad('s', 0);
  check('rollSquad determinístico (mesma seed/índice)', squadKey(r1) === squadKey(r2));
  const r3 = rollSquad('s', 0, squadKey(r1));
  check('rollSquad respeita excludeKey', squadKey(r3) !== squadKey(r1));
}

// ── 4. Balanceamento (forte vence muito mais que fraco) ──────────────────────
console.log('\n— Balanceamento —');
function rates(f: Forces, n: number) {
  let champ = 0, perfect = 0, esmagador = 0, anyNeg = 0;
  for (let i = 0; i < n; i++) {
    const r = simulateCampaign(f, `bal-${i}`);
    if (r.champion) champ++;
    if (r.perfect) perfect++;
    if (r.badge === 'ESMAGADOR') esmagador++;
    if (r.goalsFor < 0 || r.goalsAgainst < 0) anyNeg++;
    for (const g of r.group.games) if (g.gf < 0 || g.ga < 0) anyNeg++;
  }
  return { champ: champ / n, perfect: perfect / n, esmagador, anyNeg };
}
const N = 400;
const strong = rates({ attack: 96, defense: 94, overall: 95 }, N);
const weak = rates({ attack: 64, defense: 62, overall: 63 }, N);
console.log(`   forte: campeão ${(strong.champ * 100).toFixed(0)}% · perfeito ${(strong.perfect * 100).toFixed(0)}% · esmagador ${strong.esmagador}`);
console.log(`   fraco: campeão ${(weak.champ * 100).toFixed(0)}% · perfeito ${(weak.perfect * 100).toFixed(0)}%`);
check('nunca há gols negativos', strong.anyNeg === 0 && weak.anyNeg === 0);
check('time forte é campeão muito mais que o fraco', strong.champ > weak.champ + 0.2);
check('time forte vira campeão com frequência (>25%)', strong.champ > 0.25);
check('time fraco raramente é campeão (<15%)', weak.champ < 0.15);
check('time forte consegue alguns "7 a 0" (perfeito)', strong.perfect > 0);

// ── 5. Invariantes do resultado ──────────────────────────────────────────────
console.log('\n— Invariantes —');
let badInv = 0;
for (let i = 0; i < 300; i++) {
  const r = simulateCampaign({ attack: 88, defense: 85, overall: 86 }, `inv-${i}`);
  if (r.perfect && !(r.champion && r.wins === 7 && r.draws === 0 && r.losses === 0)) badInv++;
  if (r.champion && r.eliminatedAt !== null) badInv++;
  if (!r.champion && r.eliminatedAt === null) badInv++;
  if (r.wins + r.draws + r.losses > 7) badInv++;
}
check('perfect ⇒ campeão com 7 vitórias e 0 tropeços', badInv === 0);

// ── 6. Artilheiros, minutos e pênaltis ───────────────────────────────────────
console.log('\n— Artilheiros / minutos / pênaltis —');
{
  const slots = slotsFor('4-3-3', 'equilibrado');
  const players: Player[] = slots.map((sl, i) => ({ id: `g${i}`, name: `Jogador ${i}`, pos: [sl.pos], rating: 80, num: i, legend: false }));
  const lineup = { slots, players };
  const forces = calcForces(slots, players);
  let badGoals = 0, badScorer = 0, badMinute = 0, badPen = 0, pens = 0;
  for (let i = 0; i < 200; i++) {
    const r = simulateCampaign(forces, `gols-${i}`, lineup);
    const games = [...r.group.games, ...r.knockouts];
    for (const g of games) {
      if (g.myGoals.length !== g.gf || g.advGoals.length !== g.ga) badGoals++;
      for (const go of g.myGoals) { if (!go.scorer) badScorer++; if (go.minute < 1 || go.minute > 90) badMinute++; }
    }
    for (const k of r.knockouts) {
      if (k.penalties) {
        pens++;
        const s = k.penalties.shootout;
        if ((s.scoreMe > s.scoreAdv) !== k.penalties.meWin) badPen++;
        if (s.scoreMe === s.scoreAdv) badPen++;
      }
    }
  }
  check('nº de gols por jogo bate com o placar', badGoals === 0);
  check('todo gol meu tem autor (pool ofensivo)', badScorer === 0);
  check('todo minuto entre 1 e 90', badMinute === 0);
  check(`pênaltis coerentes com o vencedor (${pens} disputas)`, badPen === 0 && pens > 0);
  // determinismo inclui gols/pênaltis
  const a = JSON.stringify(simulateCampaign(forces, 'det-pen', lineup));
  const b = JSON.stringify(simulateCampaign(forces, 'det-pen', lineup));
  check('determinismo com lineup (gols+pênaltis idênticos)', a === b);
}

console.log(`\n${fail === 0 ? '✅' : '❌'} Dado de Craque: ${pass} ok, ${fail} falhas`);
if (fail > 0) process.exit(1);
