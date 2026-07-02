/**
 * Foto de jogador via TheSportsDB — busca por NOME (a ESPN não dá id estável
 * pro artilheiro na maioria dos casos, então essa é a fonte com mais cobertura).
 * Busca por nome é arriscada (nome comum → jogador errado), então NUNCA escolhe
 * entre candidatos: só aceita se exatamente 1 resultado bater a nacionalidade
 * com a seleção do gol. Comparação por SOBREPOSIÇÃO DE PALAVRAS (não substring)
 * — cobre "DR Congo"/"Congo DR", "Netherlands"/"The Netherlands" sem lista de
 * alias manual, e não casa "Congo" sozinho com qualquer coisa que contenha "Congo".
 */

const BASE = 'https://www.thesportsdb.com/api/v1/json/3';

export type TSDBPlayer = {
  idPlayer: string;
  strPlayer: string;
  strSport?: string;
  strNationality?: string;
  strThumb?: string;
  strCutout?: string;
};

const STOPWORDS = new Set(['the']);

function tokens(s: string): Set<string> {
  return new Set(
    s
      .toLowerCase()
      .replace(/[^\p{L}\p{N}\s]/gu, '')
      .split(/\s+/)
      .filter((t) => t && !STOPWORDS.has(t)),
  );
}

/**
 * true se o conjunto de palavras MENOR é subconjunto INTEIRO do maior — não só
 * uma palavra em comum. Cobre "DR Congo"/"Congo DR" e "Netherlands"/"The
 * Netherlands" (conjuntos iguais ou um contém o outro por completo), mas
 * recusa "DR Congo" vs "Republic of the Congo" (só "congo" em comum, um país
 * diferente do outro — uma palavra solta não basta).
 */
export function nationalityMatches(candidate: string | undefined, teamName: string): boolean {
  if (!candidate) return false;
  const a = tokens(candidate);
  const b = tokens(teamName);
  if (a.size === 0 || b.size === 0) return false;
  const [small, big] = a.size <= b.size ? [a, b] : [b, a];
  for (const t of small) if (!big.has(t)) return false;
  return true;
}

/** Escolhe a foto entre os resultados da busca — null se ambíguo (nunca chuta). */
export function pickPlayerPhoto(results: TSDBPlayer[], teamName: string): string | null {
  const soccer = results.filter((p) => p.strSport === 'Soccer');
  const natMatches = soccer.filter((p) => nationalityMatches(p.strNationality, teamName));
  if (natMatches.length !== 1) return null;
  const p = natMatches[0];
  return p.strCutout || p.strThumb || null;
}

/** Busca + escolhe a foto de UM jogador. Retorna null em qualquer falha/ambiguidade. */
export async function findPlayerPhoto(playerName: string, teamName: string): Promise<string | null> {
  try {
    const q = encodeURIComponent(playerName.trim().replace(/\s+/g, '_'));
    const res = await fetch(`${BASE}/searchplayers.php?p=${q}`, {
      headers: { 'User-Agent': 'Copa2026App/1.0' },
    });
    if (!res.ok) return null;
    const json = (await res.json()) as { player?: TSDBPlayer[] };
    return pickPlayerPhoto(json.player ?? [], teamName);
  } catch {
    return null;
  }
}
