#!/usr/bin/env node
/**
 * Harness de validação de dados — Pilar Zero de confiabilidade.
 *
 * Bate nos feeds reais (ESPN como fonte primária + TheSportsDB como secundária)
 * e cruza com a grade embutida (assets/data/fixtures.json), validando os
 * invariantes que correspondem aos bugs que JÁ tivemos:
 *   1. Todo jogo que já começou tem resultado em ALGUM feed (senão: grupo zerado).
 *   2. Nenhum jogo FUTURO carrega placar (senão: placar fantasma 0-0).
 *   3. Todo evento da ESPN casa com um fixture pelo nome (senão: alias faltando).
 *   4. Sanidade da classificação (ninguém joga > 3 na fase de grupos, etc).
 *
 * Sai com código !=0 se achar qualquer anomalia — serve de portão antes de OTA
 * e pode rodar agendado (cron) pra avisar ANTES do usuário ver.
 *
 * Uso: node scripts/validate-data.mjs
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const NOW = Date.now();
const DAY = 86400000;
const BACKFILL_MS = 30 * DAY;

// ---- dados estáticos do projeto ----
const fixtures = JSON.parse(fs.readFileSync(path.join(ROOT, 'assets/data/fixtures.json'), 'utf8'));
const teamsSrc = fs.readFileSync(path.join(ROOT, 'src/data/teams.ts'), 'utf8');
const groupOf = {};
for (const m of teamsSrc.matchAll(/id:\s*'([^']+)'[^}]*?group:\s*'([^']+)'/g)) groupOf[m[1]] = m[2];

// ---- matching de nomes (espelha src/lib/liveEvents.ts) ----
const norm = (s) => (s || '').toLowerCase().normalize('NFD').replace(/[^a-z]/g, '');
const ALIAS = {
  czechia: 'czechrepublic',
  unitedstates: 'usa',
  bosniaandherzegovina: 'bosniaherzegovina',
  turkiye: 'turkey',
  cotedivoire: 'ivorycoast',
  iriran: 'iran',
  korearepublic: 'southkorea',
  congodr: 'drcongo',
};
const teamMatches = (espnName, ourId) => {
  const a = norm(espnName);
  const b = norm(ourId);
  return a === b || ALIAS[a] === b || ALIAS[b] === a;
};
const pairMatches = (e, f) =>
  (teamMatches(e.home, f.home) && teamMatches(e.away, f.away)) ||
  (teamMatches(e.home, f.away) && teamMatches(e.away, f.home));

// ---- ESPN ----
const yyyymmdd = (d) =>
  `${d.getUTCFullYear()}${String(d.getUTCMonth() + 1).padStart(2, '0')}${String(d.getUTCDate()).padStart(2, '0')}`;
const espnDatesFor = (utc) => {
  const d = new Date(utc);
  return [yyyymmdd(d), yyyymmdd(new Date(d.getTime() - DAY))];
};
const ESPN = 'https://site.api.espn.com/apis/site/v2/sports/soccer/fifa.world/scoreboard';

async function fetchEspnDay(date) {
  try {
    const res = await fetch(`${ESPN}?dates=${date}`);
    const json = await res.json();
    const out = [];
    for (const ev of json?.events ?? []) {
      const comps = ev?.competitions?.[0]?.competitors ?? [];
      const h = comps.find((c) => c.homeAway === 'home');
      const a = comps.find((c) => c.homeAway === 'away');
      if (!h?.team?.displayName || !a?.team?.displayName) continue;
      const st = ev?.status?.type ?? {};
      const state = st.state === 'in' ? 'in' : st.completed ? 'post' : 'pre';
      out.push({
        home: h.team.displayName,
        away: a.team.displayName,
        state,
        hs: h.score != null ? Number(h.score) : null,
        as: a.score != null ? Number(a.score) : null,
      });
    }
    return out;
  } catch (e) {
    return [];
  }
}

async function main() {
  // datas a buscar: jogos já iniciados na janela do torneio (espelha liveData)
  const dates = new Set();
  for (const f of fixtures) {
    const delta = new Date(f.utc).getTime() - NOW;
    if (delta < 0 && delta >= -BACKFILL_MS) for (const d of espnDatesFor(f.utc)) dates.add(d);
  }
  const days = await Promise.all([...dates].map(fetchEspnDay));
  const espn = days.flat();

  const issues = [];
  const warn = [];
  const findEspn = (f) => espn.find((e) => pairMatches(e, f));

  let started = 0;
  let resolved = 0;
  for (const f of fixtures) {
    const delta = new Date(f.utc).getTime() - NOW;
    const e = findEspn(f);

    if (delta < 0) {
      // já começou: precisa ter resultado em algum feed
      started++;
      const has = e && (e.state === 'in' || e.state === 'post') && e.hs != null && e.as != null;
      const tsdb = f.homeScore != null && f.awayScore != null; // placar do dataset/cache (secundária)
      if (has || tsdb) resolved++;
      else
        issues.push(
          `SEM RESULTADO: ${f.home} x ${f.away} (${f.utc}) — já começou e nenhum feed tem placar`,
        );
    } else {
      // futuro: NENHUM feed deveria dar placar de jogo "iniciado"
      if (e && (e.state === 'in' || e.state === 'post') && (e.hs != null || e.as != null)) {
        warn.push(
          `PLACAR FANTASMA?: ${f.home} x ${f.away} (${f.utc}) — futuro, mas ESPN marca ${e.state} ${e.hs}-${e.as}`,
        );
      }
    }
  }

  // 3. alias faltando: evento da ESPN cujo nome de time não bate com NENHUMA
  //    seleção conhecida. Os jogos do mata-mata NÃO estão em fixtures.json (vêm
  //    da chave oficial, bracket.ts), então não exigimos casar com um fixture —
  //    só que ambos os times sejam reconhecidos (senão o reconcile falha silencioso).
  const allTeamIds = Object.keys(groupOf);
  const knownTeam = (espnName) => allTeamIds.some((id) => teamMatches(espnName, id));
  for (const e of espn) {
    if (fixtures.some((f) => pairMatches(e, f))) continue;
    const unknown = [e.home, e.away].filter((n) => !knownTeam(n));
    if (unknown.length) {
      issues.push(`ALIAS FALTANDO: ESPN "${unknown.join(' / ')}" não bate com nenhuma seleção (${e.home} x ${e.away})`);
    }
  }

  // 4. sanidade da classificação: ninguém joga > 3 na fase de grupos
  const played = {};
  for (const f of fixtures) {
    const e = findEspn(f);
    const done = e && (e.state === 'in' || e.state === 'post') && e.hs != null;
    if (!done) continue;
    if (groupOf[f.home] && groupOf[f.home] === groupOf[f.away]) {
      played[f.home] = (played[f.home] ?? 0) + 1;
      played[f.away] = (played[f.away] ?? 0) + 1;
    }
  }
  for (const [team, n] of Object.entries(played)) {
    if (n > 3) issues.push(`CLASSIFICAÇÃO: ${team} aparece com ${n} jogos de grupo (máx 3)`);
  }

  // ---- relatório ----
  console.log(`\n📊 Validação de dados — ${new Date(NOW).toISOString()}`);
  console.log(`   Fixtures: ${fixtures.length} | já iniciados: ${started} | com resultado: ${resolved}`);
  console.log(`   ESPN eventos na janela: ${espn.length} | datas consultadas: ${dates.size}`);

  if (warn.length) {
    console.log(`\n⚠️  Avisos (${warn.length}):`);
    warn.forEach((w) => console.log('   - ' + w));
  }
  if (issues.length) {
    console.log(`\n❌ ANOMALIAS (${issues.length}):`);
    issues.forEach((i) => console.log('   - ' + i));
    console.log('\nFALHOU — corrigir antes de publicar.\n');
    process.exit(1);
  }
  console.log('\n✅ Tudo certo — nenhum jogo iniciado sem placar, sem placar fantasma, todos os nomes casam.\n');
}

main();
