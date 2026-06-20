/**
 * Testes de INTEGRIDADE DE DADOS (Pilar Zero) — travam a classe de bug do
 * "jogo encerrado virando 'Em andamento' com dado velho" pra sempre.
 * Roda com: npx tsx scripts/data-integrity.test.ts
 *
 * Mandato: o app só AFIRMA (ao vivo/encerrado/placar/classificação) o que foi
 * CONFIRMADO por fetch (isLive/isFinished + placar). Na dúvida → estado NEUTRO.
 * E o cache velho é detectado por IDADE (não por isLive do próprio cache).
 */
import type { Match } from '../src/data/fixtures';
import { matchDisplay, inPlayWindow } from '../src/data/fixtures';
import { isStale } from '../src/lib/freshness';
import { computeStandings } from '../src/data/standings';
import { TEAMS } from '../src/data/teams';

let fails = 0;
function ok(cond: boolean, msg: string) {
  console.log((cond ? '✅ ' : '❌ FALHOU: ') + msg);
  if (!cond) fails++;
}

let _id = 0;
function gm(home: string, away: string, hs: number | null, as: number | null, status: string, utc: string): Match {
  _id++;
  return { id: `t${_id}`, utc, round: 1, home, away, homeBadge: null, awayBadge: null, venue: null, homeScore: hs, awayScore: as, status };
}

// ---------- matchDisplay: estado de exibição só pelo CONFIRMADO ----------
console.log('\n— matchDisplay: nunca afirma estado/placar pelo relógio —');
const NOW = new Date('2026-06-20T12:00:00Z');
const at = (offsetMin: number) => new Date(NOW.getTime() + offsetMin * 60000).toISOString();

// O BUG REPORTADO: jogo de ontem (status nunca reconciliado) com o apito no passado.
const brasilOntem = matchDisplay(gm('Brazil', 'Haiti', null, null, 'NS', at(-900)), NOW); // 15h atrás
ok(brasilOntem.state === 'unconfirmed', "jogo passado com status 'NS' → 'unconfirmed' (nunca 'live')");
ok(brasilOntem.state !== 'live' && !brasilOntem.showScore, 'jogo passado não-reconciliado NUNCA mostra AO VIVO nem placar');

// Status PRESO (2H) fora da janela de 170min, com placar parcial defasado.
const preso = matchDisplay(gm('A', 'B', 3, 0, '2H', at(-300)), NOW); // 5h atrás
ok(preso.state === 'unconfirmed', "status preso fora da janela → 'unconfirmed'");
ok(!preso.showScore, 'placar parcial preso NÃO é exibido (placar-fantasma bloqueado)');

// Ao vivo genuíno (dentro da janela).
const vivo = matchDisplay(gm('A', 'B', 1, 0, '2H', at(-30)), NOW);
ok(vivo.state === 'live' && vivo.showScore, 'ao vivo genuíno → live + placar');

// Encerrado com placar.
const fim = matchDisplay(gm('A', 'B', 2, 1, 'FT', at(-200)), NOW);
ok(fim.state === 'finished' && fim.showScore, 'encerrado com placar → finished + placar');

// Encerrado SEM placar carregado → neutro, sem placar.
const fimSemPlacar = matchDisplay(gm('A', 'B', null, null, 'FT', at(-200)), NOW);
ok(fimSemPlacar.state === 'awaiting' && !fimSemPlacar.showScore, "encerrado sem placar → 'awaiting', sem placar");

// Futuro.
const futuro = matchDisplay(gm('A', 'B', null, null, 'NS', at(120)), NOW);
ok(futuro.state === 'upcoming' && !futuro.showScore, 'jogo futuro → upcoming');

// ---------- inPlayWindow: janela de relógio p/ polling ----------
console.log('\n— inPlayWindow: liga o poll perto do horário, não por isLive do cache —');
ok(inPlayWindow(gm('A', 'B', null, null, 'NS', at(-30)), NOW), '30min após o apito está na janela');
ok(inPlayWindow(gm('A', 'B', null, null, 'NS', at(120)), NOW), '2h antes do apito está na janela');
ok(!inPlayWindow(gm('A', 'B', null, null, 'NS', at(-300)), NOW), '5h após o apito está FORA da janela');

// ---------- isStale: frescura por IDADE, desacoplada de isLive ----------
console.log('\n— isStale: cache velho é detectado por idade (mata o deadlock das 39h) —');
const T = 1_700_000_000_000;
const min = (m: number) => m * 60_000;
const h = (n: number) => n * 60 * min(1);
ok(isStale(null, T, false, false), 'sem cache → stale');
ok(isStale(T - h(39), T, false, false), 'cache de 39h → stale');
ok(isStale(T - h(39), T, true, true), 'cache de 39h → stale MESMO em economia + janela (nunca "nunca")');
ok(!isStale(T - min(1), T, false, false), 'cache de 1min → fresco');
ok(isStale(T - min(3), T, true, false), 'na janela: 3min > TTL 2min → stale');
ok(!isStale(T - min(3), T, false, false), 'fora de janela: 3min < TTL 15min → fresco');
ok(!isStale(T - min(30), T, false, true), 'economia, fora de janela: 30min < TTL 1h → fresco');
ok(isStale(T - h(2), T, false, true), 'economia, fora de janela: 2h > TTL 1h → stale');

// ---------- computeStandings: só conta resultado CONFIRMADO ----------
console.log('\n— computeStandings: placar preso/velho não vira ponto na tabela —');
const A = TEAMS.filter((t) => t.group === 'A');
ok(A.length >= 4, 'grupo A tem ao menos 4 seleções para o teste');
const now = Date.now();
const rel = (m: number) => new Date(now + m * 60000).toISOString();
const ms = [
  gm(A[0].id, A[1].id, 2, 1, 'FT', rel(-200)), // encerrado: A0 +3, A1 +0
  gm(A[2].id, A[3].id, 3, 0, 'LIVE', rel(-300)), // PRESO (5h, status LIVE) → NÃO conta
  gm(A[0].id, A[2].id, 1, 1, '2H', rel(-30)), // ao vivo genuíno → conta (A0 +1, A2 +1)
];
const table = computeStandings(ms)['A'];
const pts = (id: string) => table.find((s) => s.teamId === id)!.points;
const played = (id: string) => table.find((s) => s.teamId === id)!.played;
ok(pts(A[0].id) === 4, 'A0 = 3 (encerrado) + 1 (ao vivo) = 4');
ok(pts(A[1].id) === 0, 'A1 perdeu o encerrado = 0');
ok(pts(A[2].id) === 1, 'A2: só o ao vivo conta (o preso não) = 1');
ok(pts(A[3].id) === 0 && played(A[3].id) === 0, 'A3: jogo PRESO não conta — 0 pontos, 0 jogos');

if (fails) {
  console.error(`\n❌ ${fails} teste(s) de integridade falharam.`);
  process.exit(1);
}
console.log('\n✅ Integridade de dados: todos os testes passaram.');
