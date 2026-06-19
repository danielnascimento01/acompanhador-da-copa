/**
 * CALCULADORA DOS 8 MELHORES TERCEIROS — formato de 48 seleções (12 grupos).
 *
 * Avançam: 1º e 2º de cada grupo (24) + os 8 MELHORES 3ºs colocados entre os 12
 * grupos. Esta é a parte que "ninguém mostra direito".
 *
 * Mandato de exatidão (ver qualidade-zero-bugs-dados): NUNCA afirmamos quem está
 * dentro/fora quando a informação não é matematicamente certa. Por isso:
 *  - O 3º de um grupo só é "definitivo" quando o grupo TERMINOU e a 3ª posição é
 *    inequívoca por pontos+saldo+gols (sem precisar de critério fino).
 *  - A fronteira 8º/9º só é "decidida" quando o 8º está ESTRITAMENTE à frente do
 *    9º. Empate em pontos+saldo+gols na fronteira = indefinido (fair-play/sorteio).
 *  - Enquanto faltam grupos, a tabela é PROVISÓRIA e marcada como tal.
 *
 * O critério oficial de ordenação dos 3ºs: 1) pontos, 2) saldo de gols, 3) gols
 * marcados, e então 4) fair-play e 5) sorteio (estes dois últimos NÃO são
 * computáveis aqui → quando a ordem depender deles, dizemos que está indefinido).
 */
import { GROUPS } from './teams';
import { Match, isFinished } from './fixtures';
import { computeStandings, Standing } from './standings';

export type ThirdQualify = 'in' | 'out' | 'tie';

export type ThirdRow = {
  group: string;
  teamId: string;
  played: number;
  points: number;
  gd: number;
  gf: number;
  /** O grupo desse 3º já terminou E a 3ª posição é inequívoca? Senão é provisório. */
  locked: boolean;
  /** Posição provisória no ranking dos 12 (1..12). */
  rank: number;
  /** 'in' = top-8 (avança), 'out' = 9º-12º, 'tie' = empatado na fronteira 8/9. */
  qualifies: ThirdQualify;
};

export type BestThirdsResult = {
  rows: ThirdRow[];
  allGroupsFinished: boolean;
  /** 8º estritamente à frente do 9º por pontos+saldo+gols. */
  boundaryClear: boolean;
  /** Resultado final e inequívoco (todos os 3ºs travados + fronteira decidida). */
  definitive: boolean;
  /** Frase honesta de status para exibir no topo. */
  note: string;
};

/** a estritamente à frente de b por pontos → saldo → gols (sem desempate fino). */
function strictlyAhead(a: Pick<Standing, 'points' | 'gd' | 'gf'>, b: Pick<Standing, 'points' | 'gd' | 'gf'>): boolean {
  if (a.points !== b.points) return a.points > b.points;
  if (a.gd !== b.gd) return a.gd > b.gd;
  return a.gf > b.gf;
}

/** Empate exato em pontos+saldo+gols (fronteira que depende de critério fino). */
function tiedHard(a: Pick<Standing, 'points' | 'gd' | 'gf'>, b: Pick<Standing, 'points' | 'gd' | 'gf'>): boolean {
  return a.points === b.points && a.gd === b.gd && a.gf === b.gf;
}

/** Todos os 6 jogos do grupo já encerrados? */
function groupFinished(matches: Match[], table: Standing[]): boolean {
  const ids = new Set(table.map((s) => s.teamId));
  const gm = matches.filter((m) => ids.has(m.home) && ids.has(m.away));
  return gm.length > 0 && gm.every(isFinished);
}

/**
 * Monta o ranking dos 8 melhores terceiros a partir dos jogos atuais.
 * Sempre devolve as 12 linhas (uma por grupo), ordenadas; a honestidade vem nas
 * flags `locked`/`boundaryClear`/`definitive` e em `qualifies`.
 */
export function bestThirds(matches: Match[]): BestThirdsResult {
  const byGroup = computeStandings(matches);

  const thirds: ThirdRow[] = [];
  let allGroupsFinished = true;

  for (const g of GROUPS) {
    const table = byGroup[g] ?? [];
    if (table.length < 3) {
      allGroupsFinished = false;
      continue;
    }
    const finished = groupFinished(matches, table);
    if (!finished) allGroupsFinished = false;

    const third = table[2];
    // 3ª posição inequívoca = grupo terminou, 2º estritamente à frente do 3º e
    // 3º estritamente à frente do 4º (senão o "3º" pode ser outro time).
    const unambiguous =
      finished &&
      strictlyAhead(table[1], table[2]) &&
      (table.length < 4 || strictlyAhead(table[2], table[3]));

    thirds.push({
      group: g,
      teamId: third.teamId,
      played: third.played,
      points: third.points,
      gd: third.gd,
      gf: third.gf,
      locked: unambiguous,
      rank: 0,
      qualifies: 'out',
    });
  }

  // Ordena os 12 terceiros pelo critério oficial computável (pts → saldo → gols).
  // Empates além disso ficam lado a lado e são sinalizados, nunca "resolvidos".
  thirds.sort((a, b) => {
    if (b.points !== a.points) return b.points - a.points;
    if (b.gd !== a.gd) return b.gd - a.gd;
    if (b.gf !== a.gf) return b.gf - a.gf;
    return a.group.localeCompare(b.group); // ordem estável só p/ exibição (NÃO é critério)
  });

  thirds.forEach((t, i) => (t.rank = i + 1));

  // Fronteira 8/9: decidida só se o 8º está estritamente à frente do 9º.
  const boundaryClear = thirds.length >= 9 ? strictlyAhead(thirds[7], thirds[8]) : thirds.length <= 8;

  // Marca quem avança. Times empatados (pts+saldo+gols) atravessando a fronteira
  // recebem 'tie' — não afirmamos qual entra.
  for (let i = 0; i < thirds.length; i++) {
    const t = thirds[i];
    if (i < 8) {
      // dentro do top-8, mas se empata com alguém de fora (9º+), é 'tie'
      const tiesWithOut = thirds.slice(8).some((o) => tiedHard(t, o));
      t.qualifies = tiesWithOut ? 'tie' : 'in';
    } else {
      const tiesWithIn = thirds.slice(0, 8).some((o) => tiedHard(t, o));
      t.qualifies = tiesWithIn ? 'tie' : 'out';
    }
  }

  const allLocked = thirds.length === 12 && thirds.every((t) => t.locked);
  const definitive = allGroupsFinished && allLocked && boundaryClear;

  let note: string;
  if (!allGroupsFinished) {
    note = 'Parcial: ainda há grupos em andamento — os 3ºs e a ordem podem mudar.';
  } else if (!allLocked) {
    note = 'Alguns 3ºs dependem de critério de desempate dentro do grupo.';
  } else if (!boundaryClear) {
    note = '8º e 9º empatados em pontos, saldo e gols: definição por fair-play/sorteio.';
  } else {
    note = 'Definido: estes 8 terceiros avançam às oitavas.';
  }

  return { rows: thirds, allGroupsFinished, boundaryClear, definitive, note };
}
