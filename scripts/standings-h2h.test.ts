/**
 * Teste do desempate por CONFRONTO DIRETO na classificação (standings.ts).
 * Roda com: npx tsx scripts/standings-h2h.test.ts
 *
 * Mandato ("zero bug de dados"): quando dois times empatam em pontos, saldo e
 * gols pró, quem decide é o confronto direto (regra FIFA) — NUNCA o nome do país
 * (que era o desempate antigo e pintava um de classificado e outro não por acaso).
 */
import type { Match } from '../src/data/fixtures';
import { TEAMS, GROUPS, teamName } from '../src/data/teams';
import { computeStandings } from '../src/data/standings';

let _id = 0;
function gm(home: string, away: string, hs: number, as: number): Match {
  _id++;
  return {
    id: `t${_id}`,
    utc: '2026-06-20T18:00:00Z',
    round: 1,
    home,
    away,
    homeBadge: null,
    awayBadge: null,
    venue: null,
    homeScore: hs,
    awayScore: as,
    status: 'FT',
  };
}

const teamsOf = (group: string): string[] => TEAMS.filter((t) => t.group === group).map((t) => t.id);

let failures = 0;
function check(cond: boolean, msg: string) {
  if (cond) {
    console.log(`  ✓ ${msg}`);
  } else {
    console.log(`  ✗ ${msg}`);
    failures++;
  }
}

console.log('Confronto direto na classificação:');

// Grupo de teste. a = vencedor do confronto direto E alfabeticamente POSTERIOR a b
// (assim o desempate alfabético antigo o colocaria, ERRADO, atrás de b).
const [t0, t1, t2, t3] = teamsOf(GROUPS[0]);
const [a, b] = teamName(t0).localeCompare(teamName(t1)) > 0 ? [t0, t1] : [t1, t0];
const c = t2;
const d = t3;

// Resultados desenhados para a e b EMPATAREM em pts(6) / saldo(+2) / gols(3),
// com a vencendo o confronto direto 1x0. c e d ficam abaixo e não-empatados.
const matches = [
  gm(a, b, 1, 0), // a vence o confronto direto
  gm(c, a, 1, 0), // a perde para c
  gm(a, d, 2, 0),
  gm(b, c, 1, 0), // b ganha de c
  gm(b, d, 2, 0),
  gm(d, c, 1, 0),
];

const table = computeStandings(matches)[GROUPS[0]];
const order = table.map((s) => s.teamId);
const posA = order.indexOf(a);
const posB = order.indexOf(b);
const sa = table[posA];
const sb = table[posB];

check(
  sa.points === sb.points && sa.gd === sb.gd && sa.gf === sb.gf,
  `a e b empatados nos critérios objetivos (pts ${sa.points}, saldo ${sa.gd}, gp ${sa.gf})`,
);
check(
  teamName(a).localeCompare(teamName(b)) > 0,
  `"${teamName(a)}" vem DEPOIS de "${teamName(b)}" no alfabeto (o desempate antigo erraria)`,
);
check(posA < posB, `"${teamName(a)}" (venceu o confronto direto) fica À FRENTE de "${teamName(b)}"`);

if (failures > 0) {
  console.log(`\n❌ ${failures} falha(s) no desempate por confronto direto.`);
  process.exit(1);
}
console.log('\n✅ Confronto direto OK — classificação não decide mais pelo nome do país.');
