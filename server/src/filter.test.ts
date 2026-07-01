/**
 * Testes da decisão de push de gol (wantsGoal). Rodar: npx tsx src/filter.test.ts
 * Cobre os casos críticos: modos, casamento por seleção, jogos seguidos e
 * aliases ESPN↔id (United States→usa, Korea Republic→southkorea, etc.).
 */
import { wantsGoal, wantsFullTime, wantsMatchAlert, type SubscriberPrefs } from './filter';

let pass = 0;
let fail = 0;
function check(label: string, got: boolean, want: boolean) {
  if (got === want) {
    pass++;
    console.log(`✅ ${label}`);
  } else {
    fail++;
    console.log(`❌ ${label} — esperava ${want}, veio ${got}`);
  }
}

const mine = (teams: string[], matches: [string, string][] = []): SubscriberPrefs => ({
  mode: 'mine',
  teams,
  matches,
});

// ── mode 'all' / 'off' ──────────────────────────────────────────────────────
check("'all' recebe qualquer jogo", wantsGoal({ mode: 'all', teams: [], matches: [] }, 'Brazil', 'Croatia'), true);
check("'off' nunca recebe", wantsGoal({ mode: 'off', teams: ['Brazil'], matches: [] }, 'Brazil', 'Croatia'), false);

// ── mode 'mine' por seleção ─────────────────────────────────────────────────
check('minha seleção é a mandante', wantsGoal(mine(['Brazil']), 'Brazil', 'Croatia'), true);
check('minha seleção é a visitante', wantsGoal(mine(['Brazil']), 'Croatia', 'Brazil'), true);
check('jogo sem a minha seleção → não', wantsGoal(mine(['Brazil']), 'France', 'Spain'), false);
check('sem seleções e sem jogos → não', wantsGoal(mine([]), 'France', 'Spain'), false);

// ── aliases ESPN ↔ id interno ───────────────────────────────────────────────
check('United States (ESPN) casa com usa', wantsGoal(mine(['USA']), 'United States', 'Wales'), true);
check('Korea Republic (ESPN) casa com South Korea', wantsGoal(mine(['South Korea']), 'Korea Republic', 'Ghana'), true);
check('Czechia (ESPN) casa com Czech Republic', wantsGoal(mine(['Czech Republic']), 'Czechia', 'Turkey'), true);

// ── jogos seguidos (par de times) ───────────────────────────────────────────
check('sigo o jogo France x Spain (ordem direta)', wantsGoal(mine([], [['France', 'Spain']]), 'France', 'Spain'), true);
check('sigo o jogo France x Spain (ordem invertida)', wantsGoal(mine([], [['France', 'Spain']]), 'Spain', 'France'), true);
check('jogo seguido não vaza p/ outro jogo do mesmo time', wantsGoal(mine([], [['France', 'Spain']]), 'France', 'Germany'), false);

// ── FIM DE JOGO (wantsFullTime) ─────────────────────────────────────────────
// Independente do push de gol: usa o próprio modo `fullTime` (default 'off').
check('fullTime ausente → não avisa fim de jogo (opt-in)', wantsFullTime({ mode: 'all', teams: [], matches: [] }, 'Brazil', 'Croatia'), false);
check("fullTime 'off' explícito → não", wantsFullTime({ mode: 'all', teams: [], matches: [], fullTime: 'off' }, 'Brazil', 'Croatia'), false);
check("fullTime 'all' → qualquer fim de jogo", wantsFullTime({ mode: 'off', teams: [], matches: [], fullTime: 'all' }, 'France', 'Spain'), true);
check("fullTime 'mine' casa com a seleção seguida", wantsFullTime({ mode: 'off', teams: ['Brazil'], matches: [], fullTime: 'mine' }, 'Croatia', 'Brazil'), true);
check("fullTime 'mine' sem a seleção → não", wantsFullTime({ mode: 'all', teams: ['Brazil'], matches: [], fullTime: 'mine' }, 'France', 'Spain'), false);
check('fullTime independe do modo de gol (gol off, fim de jogo all)', wantsFullTime({ mode: 'off', teams: [], matches: [], fullTime: 'all' }, 'Brazil', 'Croatia'), true);

// ── ALERTAS OPERACIONAIS ────────────────────────────────────────────────────
check('match alert exige seleção acompanhada', wantsMatchAlert({ mode: 'all', teams: [], matches: [] }, 'Brazil', 'Croatia'), false);
check('match alert casa com seleção acompanhada e push de gol ativo', wantsMatchAlert({ mode: 'mine', teams: ['Brazil'], matches: [], fullTime: 'off' }, 'Brazil', 'Croatia'), true);
check('match alert casa com jogo seguido e fim de jogo ativo', wantsMatchAlert({ mode: 'off', teams: [], matches: [['Brazil', 'Croatia']], fullTime: 'mine' }, 'Croatia', 'Brazil'), true);
check('match alert não envia se todos os pushes remotos estão off', wantsMatchAlert({ mode: 'off', teams: ['Brazil'], matches: [], fullTime: 'off' }, 'Brazil', 'Croatia'), false);

console.log(`\n${pass} passaram, ${fail} falharam`);
if (fail > 0) throw new Error(`${fail} teste(s) de filtragem falharam`);
