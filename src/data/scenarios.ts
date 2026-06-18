/**
 * Motor de CENÁRIOS DE CLASSIFICAÇÃO — precisa estar 100% correto sempre.
 *
 * Regra de ouro: só afirmamos o que é matematicamente PROVÁVEL. Para isso,
 * enumeramos exaustivamente todos os resultados (V/E/D) dos jogos que faltam no
 * grupo e só damos uma garantia se ela vale em TODOS os cenários.
 *
 * Empate de PONTOS é tratado como INCERTO: a posição passaria a depender de
 * saldo/gols/confronto direto, que dependem do placar exato (que não se prevê).
 * Por isso só prometemos "vaga direta (1º/2º)", que é auto-contida no grupo.
 * O "melhor terceiro" (8 entre 12 grupos) é cruzado entre grupos e NUNCA é
 * prometido — apenas descrito como possibilidade.
 */
import { Match, isFinished } from './fixtures';
import { getTeam, TEAMS, teamName } from './teams';
import { computeStandings } from './standings';

type Points = Record<string, number>;
type Cert = 'top2' | 'not' | 'ambig';
export type Outcome = 'win' | 'draw' | 'loss';
export type ScenarioResult = 'classified-direct' | 'eliminated-direct' | 'depends';

export type TeamOutlook = {
  group: string;
  rank: number; // posição atual (1-4) por pontos+saldo
  points: number;
  played: number; // jogos do grupo já encerrados
  remainingForTeam: number;
  done: boolean; // já jogou os 3 do grupo
  guaranteedTop2: boolean; // garantido em 1º/2º independente do resto
  eliminatedFromTop2: boolean; // sem chance de vaga direta
  canFinishThird: boolean; // ainda pode terminar em 3º (chance de melhor terceiro)
  next: { opponentId: string; win: ScenarioResult; draw: ScenarioResult; loss: ScenarioResult } | null;
  phraseShort: string;
  phraseLong: string;
};

const teamsOfGroup = (group: string): string[] => TEAMS.filter((t) => t.group === group).map((t) => t.id);

const sameGroupStageMatch = (m: Match, group: string): boolean => {
  const h = getTeam(m.home);
  const a = getTeam(m.away);
  return !!h && !!a && h.group === group && a.group === group;
};

/** Só jogo ENCERRADO conta como definitivo (ao vivo/futuro = ainda em aberto). */
const isSettled = (m: Match): boolean => isFinished(m) && m.homeScore != null && m.awayScore != null;

function basePoints(settled: Match[], teams: string[]): Points {
  const p: Points = {};
  for (const t of teams) p[t] = 0;
  for (const m of settled) {
    const hs = m.homeScore as number;
    const as = m.awayScore as number;
    if (hs > as) p[m.home] += 3;
    else if (hs < as) p[m.away] += 3;
    else {
      p[m.home] += 1;
      p[m.away] += 1;
    }
  }
  return p;
}

/** Enumera V/E/D de cada jogo restante, chamando cb com a pontuação final. */
function enumerate(base: Points, games: Match[], cb: (p: Points) => void): void {
  const rec = (i: number, p: Points): void => {
    if (i === games.length) {
      cb(p);
      return;
    }
    const g = games[i];
    rec(i + 1, { ...p, [g.home]: p[g.home] + 3 }); // mandante vence
    rec(i + 1, { ...p, [g.home]: p[g.home] + 1, [g.away]: p[g.away] + 1 }); // empate
    rec(i + 1, { ...p, [g.away]: p[g.away] + 3 }); // visitante vence
  };
  rec(0, { ...base });
}

/**
 * Certeza da posição do time numa pontuação final:
 * - 'top2'  : garantido em 1º/2º mesmo no pior desempate (acima+empatados <= 1)
 * - 'not'   : garantidamente fora do top-2 (2+ times com MAIS pontos)
 * - 'ambig' : depende de saldo/confronto (empate de pontos na fronteira)
 */
function certainty(p: Points, teams: string[], team: string): Cert {
  const pt = p[team];
  let above = 0;
  let equal = 0;
  for (const x of teams) {
    if (x === team) continue;
    if (p[x] > pt) above++;
    else if (p[x] === pt) equal++;
  }
  if (above >= 2) return 'not';
  if (above + equal <= 1) return 'top2';
  return 'ambig';
}

function applyOutcome(base: Points, g: Match, team: string, oc: Outcome): Points {
  if (oc === 'draw') return { ...base, [g.home]: base[g.home] + 1, [g.away]: base[g.away] + 1 };
  const teamIsHome = g.home === team;
  const winner = oc === 'win' ? team : teamIsHome ? g.away : g.home;
  return { ...base, [winner]: base[winner] + 3 };
}

/** Resultado garantido para o time se o PRÓXIMO jogo terminar em `oc`. */
function scenarioForNext(
  base: Points,
  remaining: Match[],
  next: Match,
  teams: string[],
  team: string,
  oc: Outcome,
): ScenarioResult {
  const afterNext = applyOutcome(base, next, team, oc);
  const rest = remaining.filter((g) => g.id !== next.id);
  let allTop2 = true;
  let allNot = true;
  enumerate(afterNext, rest, (p) => {
    const c = certainty(p, teams, team);
    if (c !== 'top2') allTop2 = false;
    if (c !== 'not') allNot = false;
  });
  if (allTop2) return 'classified-direct';
  if (allNot) return 'eliminated-direct';
  return 'depends';
}

const opponentName = (m: Match | null, team: string): string =>
  m ? teamName(m.home === team ? m.away : m.home) : '';

/**
 * Calcula a situação de classificação de um time, 100% baseada na matemática
 * dos jogos do seu grupo. `now` só decide o "próximo jogo" exibido.
 */
export function teamOutlook(matches: Match[], teamId: string, now: Date = new Date()): TeamOutlook | null {
  const team = getTeam(teamId);
  if (!team) return null;
  const group = team.group;
  const teams = teamsOfGroup(group);

  const groupMatches = matches.filter((m) => sameGroupStageMatch(m, group));
  const settled = groupMatches.filter(isSettled);
  const remaining = groupMatches.filter((m) => !isSettled(m)); // futuros + ao vivo = em aberto

  const base = basePoints(settled, teams);
  const played = settled.filter((m) => m.home === teamId || m.away === teamId).length;
  const remainingForTeam = remaining.filter((m) => m.home === teamId || m.away === teamId).length;
  const done = remainingForTeam === 0;

  // posição/pontos ATUAIS (inclui ao vivo) — só p/ exibir.
  const table = computeStandings(matches)[group] ?? [];
  const row = table.find((s) => s.teamId === teamId);
  const rank = row ? table.indexOf(row) + 1 : 0;
  const points = row?.points ?? base[teamId] ?? 0;

  // garantias considerando TODOS os jogos restantes do grupo
  let guaranteedTop2 = true;
  let eliminatedFromTop2 = true;
  let canFinishThird = false;
  enumerate(base, remaining, (p) => {
    const c = certainty(p, teams, teamId);
    if (c !== 'top2') guaranteedTop2 = false;
    if (c !== 'not') eliminatedFromTop2 = false;
    // pode terminar em 3º? (no máximo 2 times estritamente acima em algum cenário)
    let above = 0;
    for (const x of teams) if (x !== teamId && p[x] > p[teamId]) above++;
    if (above <= 2) canFinishThird = true;
  });

  // próximo jogo do time (mais cedo em aberto)
  const nextMatch =
    remaining
      .filter((m) => m.home === teamId || m.away === teamId)
      .sort((a, b) => a.utc.localeCompare(b.utc))[0] ?? null;

  let next: TeamOutlook['next'] = null;
  if (nextMatch) {
    next = {
      opponentId: nextMatch.home === teamId ? nextMatch.away : nextMatch.home,
      win: scenarioForNext(base, remaining, nextMatch, teams, teamId, 'win'),
      draw: scenarioForNext(base, remaining, nextMatch, teams, teamId, 'draw'),
      loss: scenarioForNext(base, remaining, nextMatch, teams, teamId, 'loss'),
    };
  }

  const { phraseShort, phraseLong } = buildPhrases({
    group,
    rank,
    points,
    done,
    guaranteedTop2,
    eliminatedFromTop2,
    canFinishThird,
    next,
    nextOpponent: opponentName(nextMatch, teamId),
  });

  return {
    group,
    rank,
    points,
    played,
    remainingForTeam,
    done,
    guaranteedTop2,
    eliminatedFromTop2,
    canFinishThird,
    next,
    phraseShort,
    phraseLong,
  };
}

const RESULT_WORD: Record<ScenarioResult, string> = {
  'classified-direct': 'garante a vaga direta (1º/2º)',
  'eliminated-direct': 'não garante vaga direta',
  depends: 'depende de outros jogos e do saldo',
};

function buildPhrases(o: {
  group: string;
  rank: number;
  points: number;
  done: boolean;
  guaranteedTop2: boolean;
  eliminatedFromTop2: boolean;
  canFinishThird: boolean;
  next: TeamOutlook['next'];
  nextOpponent: string;
}): { phraseShort: string; phraseLong: string } {
  const pos = `${o.rank}º no Grupo ${o.group} · ${o.points} pt${o.points === 1 ? '' : 's'}`;

  if (o.guaranteedTop2) {
    return {
      phraseShort: `✅ Classificado em vaga direta — ${pos}`,
      phraseLong: `Classificação garantida em 1º/2º do Grupo ${o.group}, independente dos próximos resultados.`,
    };
  }

  if (o.eliminatedFromTop2) {
    if (o.canFinishThird) {
      return {
        phraseShort: `Vaga direta fora de alcance — ${pos} · chance só como melhor terceiro`,
        phraseLong: `Não dá mais para terminar em 1º/2º do Grupo ${o.group}. A única chance de avançar é como um dos 8 melhores terceiros — o que depende dos outros grupos.`,
      };
    }
    return {
      phraseShort: `Eliminado — ${pos}`,
      phraseLong: `Sem chances de classificação no Grupo ${o.group}.`,
    };
  }

  if (o.done) {
    // jogou os 3, sem garantia nem eliminação: depende dos outros jogos do grupo
    return {
      phraseShort: `Disputa a vaga — ${pos} · aguarda os outros jogos do grupo`,
      phraseLong: `Encerrou os jogos no Grupo ${o.group}. A classificação direta ainda depende dos outros resultados e do saldo.`,
    };
  }

  // ainda tem jogo: monta a partir do próximo
  if (o.next) {
    const win = o.next.win;
    const draw = o.next.draw;
    const loss = o.next.loss;
    let short: string;
    if (draw === 'classified-direct') short = `Empatando o próximo, garante vaga direta`;
    else if (win === 'classified-direct') short = `Vencendo o próximo, garante vaga direta`;
    else if (win === 'eliminated-direct') short = `Não depende mais só de si para a vaga direta`;
    else short = `Disputa a vaga — decide nos próximos jogos`;

    const longParts = [
      `Vencendo ${o.nextOpponent}: ${RESULT_WORD[win]}.`,
      `Empatando: ${RESULT_WORD[draw]}.`,
      `Perdendo: ${RESULT_WORD[loss]}.`,
    ];
    let long = `${pos}. ${longParts.join(' ')}`;
    if (o.canFinishThird && (loss !== 'classified-direct'))
      long += ` Mesmo sem a vaga direta, ainda pode avançar como melhor terceiro (depende de outros grupos).`;

    return { phraseShort: `${short} — ${pos}`, phraseLong: long };
  }

  return {
    phraseShort: `Disputa a vaga — ${pos}`,
    phraseLong: `A classificação no Grupo ${o.group} ainda está em aberto.`,
  };
}
