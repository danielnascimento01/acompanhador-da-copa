#!/usr/bin/env node
/**
 * Atualiza assets/data/fixtures.json a partir da TheSportsDB.
 * Uso: npm run update-fixtures
 *
 * Rodadas 1-3 = fase de grupos (72 jogos). Quando os mata-matas forem
 * definidos, a API passa a popular as rodadas seguintes — basta aumentar
 * MAX_ROUND e rodar de novo.
 */
import { writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const LEAGUE_ID = '4429'; // FIFA World Cup
const SEASON = '2026';
const MAX_ROUND = 14; // tenta até as finais; rodadas vazias são ignoradas
const API = (round) =>
  `https://www.thesportsdb.com/api/v1/json/3/eventsround.php?id=${LEAGUE_ID}&r=${round}&s=${SEASON}`;

const __dirname = dirname(fileURLToPath(import.meta.url));
const OUT = join(__dirname, '..', 'assets', 'data', 'fixtures.json');

function normalize(e) {
  const utc = e.strTimestamp
    ? e.strTimestamp.endsWith('Z')
      ? e.strTimestamp
      : `${e.strTimestamp}Z`
    : `${e.dateEvent}T${e.strTime || '00:00:00'}Z`;
  return {
    id: e.idEvent,
    utc,
    round: Number(e.intRound),
    home: e.strHomeTeam,
    away: e.strAwayTeam,
    homeBadge: e.strHomeTeamBadge || null,
    awayBadge: e.strAwayTeamBadge || null,
    venue: e.strVenue || null,
    homeScore: e.intHomeScore != null ? Number(e.intHomeScore) : null,
    awayScore: e.intAwayScore != null ? Number(e.intAwayScore) : null,
    status: e.strStatus || 'NS',
  };
}

const all = [];
for (let r = 1; r <= MAX_ROUND; r++) {
  const res = await fetch(API(r));
  const json = await res.json();
  const events = json.events || [];
  for (const e of events) all.push(normalize(e));
  if (events.length) console.log(`Rodada ${r}: ${events.length} jogos`);
}

all.sort((a, b) => a.utc.localeCompare(b.utc));
await writeFile(OUT, JSON.stringify(all, null, 2));
console.log(`\n✅ ${all.length} jogos salvos em ${OUT}`);
