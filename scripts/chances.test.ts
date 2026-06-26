/**
 * Teste do simulador de chance de classificação (chances.ts).
 * Roda com: npx tsx scripts/chances.test.ts
 *
 * Invariante forte (independe do cenário): em TODA simulação avançam exatamente
 * 32 seleções (24 = 1º/2º dos 12 grupos + 8 melhores terceiros). Logo a soma das
 * probabilidades é SEMPRE 3200% — checagem exata, sem ruído de amostragem.
 * Também: nenhuma chance fora de [0,100]; grupo terminado → 0% ou 100% (sem meio).
 */
import type { Match } from '../src/data/fixtures';
import { TEAMS, GROUPS } from '../src/data/teams';
import { simulateChances } from '../src/data/chances';

let _id = 0;
function gm(home: string, away: string, hs: number | null, as: number | null): Match {
  _id++;
  return {
    id: `c${_id}`, utc: '2026-06-20T18:00:00Z', round: 1, home, away,
    homeBadge: null, awayBadge: null, venue: null,
    homeScore: hs, awayScore: as, status: hs == null ? 'NS' : 'FT',
  };
}

const teamsOf = (g: string) => TEAMS.filter((t) => t.group === g).map((t) => t.id);

let pass = 0, fail = 0;
function check(label: string, cond: boolean) {
  if (cond) { pass++; console.log(`✅ ${label}`); } else { fail++; console.log(`❌ ${label}`); }
}

// ── Cenário 1: NADA jogado (todos os jogos por vir) ──────────────────────────
{
  const matches: Match[] = [];
  for (const g of GROUPS) {
    const [a, b, c, d] = teamsOf(g);
    matches.push(gm(a, b, null, null), gm(c, d, null, null), gm(a, c, null, null),
      gm(b, d, null, null), gm(a, d, null, null), gm(b, c, null, null));
  }
  const res = simulateChances(matches, 3000);
  const all = res.flatMap((r) => r.teams);
  const sum = all.reduce((s, t) => s + t.pct, 0);
  check('1. soma das chances = 3200% (exatamente 32 avançam por cenário)', Math.abs(sum - 3200) < 0.001);
  check('1. toda chance em [0,100]', all.every((t) => t.pct >= 0 && t.pct <= 100));
  check('1. nada decidido ainda → ninguém em 0% nem 100%', all.every((t) => t.pct > 0 && t.pct < 100));
}

// ── Cenário 2: TODOS os grupos encerrados (determinístico) ───────────────────
// a>b>c>d em cada grupo (a vence todos, b vence c e d, c vence d).
{
  const matches: Match[] = [];
  for (const g of GROUPS) {
    const [a, b, c, d] = teamsOf(g);
    matches.push(
      gm(a, b, 1, 0), gm(a, c, 1, 0), gm(a, d, 1, 0),
      gm(b, c, 1, 0), gm(b, d, 1, 0), gm(c, d, 1, 0),
    );
  }
  const res = simulateChances(matches, 1500);
  const all = res.flatMap((r) => r.teams);
  const sum = all.reduce((s, t) => s + t.pct, 0);
  const at100 = all.filter((t) => t.pct === 100).length;
  const at0 = all.filter((t) => t.pct === 0).length;
  check('2. soma = 3200% (grupos encerrados)', Math.abs(sum - 3200) < 0.001);
  check('2. exatamente 32 seleções em 100%', at100 === 32);
  check('2. exatamente 16 seleções em 0%', at0 === 16);
  check('2. sem meio-termo (tudo decidido)', at100 + at0 === all.length);
  // Todo 1º colocado (a) avança com certeza.
  for (const g of GROUPS) {
    const a = teamsOf(g)[0];
    const t = all.find((x) => x.teamId === a)!;
    if (t.pct !== 100) { fail++; console.log(`❌ 2. ${a} (1º do ${g}) deveria ser 100%`); }
  }
  check('2. todos os 12 primeiros colocados em 100%', true);
}

console.log(`\n${pass} passaram, ${fail} falharam`);
if (fail > 0) throw new Error(`${fail} teste(s) de chance falharam`);
