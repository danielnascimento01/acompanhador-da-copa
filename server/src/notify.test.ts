/**
 * Testes do texto do push de gol. Rodar: npx tsx src/notify.test.ts
 * PROVA: título nomeia quem marcou com o artigo certo (do/da/de/dos), corpo com
 * placar PT, autor só quando há, aliases ESPN, e degradação elegante.
 */
import { buildGoalNotification, pickScorer } from './notify';
import type { ESPNPlay } from './espn';

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

// ── pickScorer: SEMPRE o autor do gol certo, ou NENHUM (nunca o errado) ───────
const play = (text: string, h: number, a: number, name?: string): ESPNPlay =>
  ({ type: { text }, homeScore: h, awayScore: a, ...(name ? { athletesInvolved: [{ displayName: name }] } : {}) }) as ESPNPlay;

// Cenário: Brasil 2 x 1. Vários gols no array. O gol ATUAL (2-1) é do mandante.
const plays: ESPNPlay[] = [
  play('Goal', 1, 0, 'Vinícius Júnior'), // 1-0
  play('Goal', 1, 1, 'McTominay'),       // 1-1 (Escócia)
  play('Yellow Card', 1, 1),
  play('Goal', 2, 1, 'Rodrygo'),         // 2-1 (placar atual)
];
eqScorer('pega o autor do placar EXATO (2-1) = Rodrygo', pickScorer(plays, 2, 1), 'Rodrygo');
eqScorer('placar 1-1 → McTominay (não o último do array)', pickScorer(plays, 1, 1), 'McTominay');
eqScorer('placar sem lance correspondente (3-1) → null', pickScorer(plays, 3, 1), null);
eqScorer('array vazio (ESPN sem lance) → null', pickScorer([], 1, 0), null);
eqScorer('gol sem atleta → null (nunca nome errado)', pickScorer([play('Goal', 1, 0)], 1, 0), null);

function eqScorer(label: string, got: string | null, want: string | null) {
  if (got === want) { pass++; console.log(`✅ ${label}`); }
  else { fail++; console.log(`❌ ${label}\n   esperado: ${JSON.stringify(want)}\n   veio: ${JSON.stringify(got)}`); }
}

console.log(`\n${pass} passaram, ${fail} falharam`);
if (fail > 0) throw new Error(`${fail} teste(s) de notificação falharam`);
