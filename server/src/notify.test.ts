/**
 * Testes do texto do push de gol. Rodar: npx tsx src/notify.test.ts
 * PROVA: título nomeia quem marcou com o artigo certo (do/da/de/dos), corpo com
 * placar PT, autor só quando há, aliases ESPN, e degradação elegante.
 */
import { buildGoalNotification, pickScorerFromDetails } from './notify';
import type { ESPNDetail } from './espn';

let pass = 0;
let fail = 0;
function eq(label: string, got: string, want: string) {
  if (got === want) {
    pass++;
    console.log(`✅ ${label}`);
  } else {
    fail++;
    console.log(`❌ ${label}\n   esperado: ${JSON.stringify(want)}\n   veio:     ${JSON.stringify(got)}`);
  }
}

// ── Caso principal pedido pelo Daniel: gol do mandante com artilheiro ─────────
{
  const n = buildGoalNotification({
    homeTeam: 'Brazil', awayTeam: 'Scotland', home: 1, away: 0, newHome: 1, newAway: 0, scorer: 'Raphinha',
  });
  eq('Brasil título', n.title, '⚽ Gol do Brasil');
  eq('Brasil corpo', n.body, 'Raphinha foi o autor do gol!\nBrasil 1 x 0 Escócia');
}

// ── Gol do visitante, SEM artilheiro (ESPN sem lance) ────────────────────────
{
  const n = buildGoalNotification({
    homeTeam: 'Brazil', awayTeam: 'Scotland', home: 1, away: 1, newHome: 0, newAway: 1, scorer: null,
  });
  eq('Escócia título (visitante)', n.title, '⚽ Gol da Escócia');
  eq('Escócia corpo sem autor', n.body, 'Brasil 1 x 1 Escócia');
}

// ── Conectores corretos (do/da/de/dos) ───────────────────────────────────────
const art = (home: string, name: string) =>
  buildGoalNotification({ homeTeam: home, awayTeam: 'Brazil', home: 1, away: 0, newHome: 1, newAway: 0 }).title;
eq('França → da', art('France', ''), '⚽ Gol da França');
eq('Portugal → de', art('Portugal', ''), '⚽ Gol de Portugal');
eq('Estados Unidos → dos', art('USA', ''), '⚽ Gol dos Estados Unidos');
eq('Argentina → da', art('Argentina', ''), '⚽ Gol da Argentina');
eq('Catar → do', art('Qatar', ''), '⚽ Gol do Catar');
eq('Alemanha → da', art('Germany', ''), '⚽ Gol da Alemanha');

// ── Aliases ESPN (nomes que diferem do id interno) ───────────────────────────
eq('Korea Republic → Coreia do Sul', art('Korea Republic', ''), '⚽ Gol da Coreia do Sul');
eq('Czechia → República Tcheca', art('Czechia', ''), '⚽ Gol da República Tcheca');
eq('IR Iran → Irã', art('IR Iran', ''), '⚽ Gol do Irã');
eq('Türkiye → Turquia', art('Türkiye', ''), '⚽ Gol da Turquia');
eq("Côte d'Ivoire → Costa do Marfim", art("Côte d'Ivoire", ''), '⚽ Gol da Costa do Marfim');
eq('Cabo Verde (alias novo) → de Cabo Verde', art('Cabo Verde', ''), '⚽ Gol de Cabo Verde');
eq('United States → dos Estados Unidos', art('United States', ''), '⚽ Gol dos Estados Unidos');
eq('Bosnia-Herzegovina → da Bósnia', art('Bosnia-Herzegovina', ''), '⚽ Gol da Bósnia e Herzegovina');

// ── Placar usa nomes PT dos DOIS times ────────────────────────────────────────
{
  const n = buildGoalNotification({
    homeTeam: 'Qatar', awayTeam: 'Bosnia-Herzegovina', home: 1, away: 3, newHome: 0, newAway: 1, scorer: 'Džeko',
  });
  eq('placar PT dos dois', n.body, 'Džeko foi o autor do gol!\nCatar 1 x 3 Bósnia e Herzegovina');
}

// ── Degradação: 2 gols de lados diferentes no mesmo ciclo → título neutro ─────
{
  const n = buildGoalNotification({
    homeTeam: 'Brazil', awayTeam: 'Scotland', home: 1, away: 1, newHome: 1, newAway: 1, scorer: null,
  });
  eq('2 lados no mesmo ciclo → neutro', n.title, '⚽ Gol!');
}

// ── 2 gols do MESMO time num ciclo → nomeia o time, sem autor singular ────────
{
  const n = buildGoalNotification({
    homeTeam: 'Brazil', awayTeam: 'Scotland', home: 2, away: 0, newHome: 2, newAway: 0, scorer: null,
  });
  eq('2 gols do mandante → Gol do Brasil', n.title, '⚽ Gol do Brasil');
  eq('2 gols → corpo só placar', n.body, 'Brasil 2 x 0 Escócia');
}

// ── Time desconhecido → título neutro + nome cru no corpo (nunca quebra) ──────
{
  const n = buildGoalNotification({
    homeTeam: 'Atlantis', awayTeam: 'Brazil', home: 1, away: 0, newHome: 1, newAway: 0, scorer: null,
  });
  eq('desconhecido → neutro', n.title, '⚽ Gol!');
  eq('desconhecido → corpo cru', n.body, 'Atlantis 1 x 0 Brasil');
}

// ── pickScorerFromDetails: artilheiro dos details do scoreboard (fonte real) ──
const det = (text: string, teamId: string, clock: number, name: string, opts: Partial<ESPNDetail> = {}): ESPNDetail =>
  ({ type: { text }, scoringPlay: true, team: { id: teamId }, clock: { value: clock }, athletesInvolved: [{ displayName: name }], ...opts }) as ESPNDetail;

// Brasil (id 205) marcou 3 gols normais; o mais recente é Matheus Cunha (60').
const normais: ESPNDetail[] = [
  det('Goal', '205', 1500, 'Vinícius Júnior'),        // 25'
  { type: { text: 'Yellow Card' }, team: { id: '580' } } as ESPNDetail,
  det('Goal', '205', 2400, 'Rodrygo'),                // 40'
  det('Goal - Volley', '205', 3595, 'Matheus Cunha'), // 60' (mais recente)
];
eqScorer('gol normal mais recente do time = Matheus Cunha', pickScorerFromDetails(normais, '205'), 'Matheus Cunha');
eqScorer('time sem gol → null', pickScorerFromDetails(normais, '999'), null);
eqScorer('details vazio → null', pickScorerFromDetails([], '205'), null);

// F4: o gol MAIS RECENTE do Brasil é GOL CONTRA (clock 5000, autor adversário).
// Mesmo havendo um gol normal antes, NÃO pode nomear o autor antigo → null.
const comGolContra: ESPNDetail[] = [
  det('Goal', '205', 3595, 'Matheus Cunha'),                 // gol normal antigo
  det('Own Goal', '205', 5000, 'McTominay', { ownGoal: true }), // gol contra (beneficia 205) — mais recente
];
eqScorer('F4: último é gol contra → null (não pega o normal antigo)', pickScorerFromDetails(comGolContra, '205'), null);

function eqScorer(label: string, got: string | null, want: string | null) {
  if (got === want) { pass++; console.log(`✅ ${label}`); }
  else { fail++; console.log(`❌ ${label}\n   esperado: ${JSON.stringify(want)}\n   veio: ${JSON.stringify(got)}`); }
}

console.log(`\n${pass} passaram, ${fail} falharam`);
if (fail > 0) throw new Error(`${fail} teste(s) de notificação falharam`);
