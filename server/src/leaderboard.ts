/**
 * Ranking GLOBAL dos mini-games (aba Diversão).
 *
 * Armazenamento simples no KV: uma chave por jogo (`lb:<game>`) com um array
 * ordenado (desc) de entradas, deduplicado por aparelho (id) mantendo o MAIOR
 * score de cada um. Suficiente e barato para um placar casual — sem servidor
 * novo, reaproveitando o KV do push. (Há uma corrida teórica de read-modify-write
 * concorrente no KV; aceitável nesta escala — no máximo perde-se uma submissão.)
 */

export type LBEntry = { id: string; nick: string; score: number; ts: number };

/** Jogos que aceitam ranking (allowlist — evita criar chaves de lixo). */
export const LB_GAMES = new Set(['embaixadinhas']);

const MAX_KEEP = 100; // guardamos top 100; devolvemos top 50 ao app
const RETURN = 50;
const NICK_MAX = 16;
const SCORE_MAX = 100000; // teto de sanidade (anti-absurdo)

const lbKey = (game: string) => `lb:${game}`;

/** Interface mínima de KV (permite fake no teste). */
type KVLike = {
  get(key: string): Promise<string | null>;
  put(key: string, value: string, opts?: { expirationTtl?: number }): Promise<void>;
};

/**
 * Identidade no ranking: pelo APELIDO (normalizado) quando o jogador escolheu um
 * nome — assim REINSTALAR (que zera o id do aparelho no AsyncStorage) não duplica a
 * pessoa no ranking. Apelido vazio/"Anônimo" cai no id do aparelho (anônimos contam
 * soltos, pois não têm identidade). Tradeoff: 2 pessoas com o MESMO nome se fundem
 * (aceitável num placar de "desafie seus amigos").
 */
const keyOf = (e: LBEntry): string => {
  const n = e.nick.trim().toLowerCase();
  return n && n !== 'anônimo' ? `n:${n}` : `i:${e.id}`;
};

/** Colapsa a lista por identidade, mantendo o MAIOR placar; ordena desc. */
function dedupe(list: LBEntry[], cap = MAX_KEEP): LBEntry[] {
  const map = new Map<string, LBEntry>();
  for (const x of list) {
    const cur = map.get(keyOf(x));
    if (!cur || x.score > cur.score) map.set(keyOf(x), x);
  }
  return [...map.values()]
    .sort((a, b) => b.score - a.score || a.ts - b.ts) // empate: quem chegou antes
    .slice(0, cap);
}

/** Aplica uma nova pontuação à lista (dedup por apelido — sobrevive à reinstalação). */
export function upsertScore(list: LBEntry[], e: LBEntry, cap = MAX_KEEP): LBEntry[] {
  return dedupe([...list, e], cap);
}

/** Sanitiza o apelido para o placar global. */
function cleanNick(n: unknown): string {
  if (typeof n !== 'string') return 'Anônimo';
  const t = n.trim().slice(0, NICK_MAX);
  return t || 'Anônimo';
}

/** Valida o score; retorna null se inválido. */
function cleanScore(s: unknown): number | null {
  if (typeof s !== 'number' || !Number.isFinite(s)) return null;
  const v = Math.floor(s);
  if (v < 0 || v > SCORE_MAX) return null;
  return v;
}

function cleanId(v: unknown): string | null {
  if (typeof v !== 'string') return null;
  const t = v.trim().slice(0, 64);
  return t || null;
}

export async function getBoard(kv: KVLike, game: string): Promise<LBEntry[]> {
  const raw = await kv.get(lbKey(game));
  return raw ? (JSON.parse(raw) as LBEntry[]) : [];
}

/** Registra uma pontuação e devolve o top da lista (ou erro de validação). */
export async function submitScore(
  kv: KVLike,
  body: { game?: unknown; id?: unknown; nick?: unknown; score?: unknown },
  now: number,
): Promise<{ ok: true; top: LBEntry[] } | { ok: false; error: string }> {
  const game = typeof body.game === 'string' ? body.game : '';
  if (!LB_GAMES.has(game)) return { ok: false, error: 'unknown game' };

  const id = cleanId(body.id);
  if (!id) return { ok: false, error: 'invalid id' };

  const score = cleanScore(body.score);
  if (score === null) return { ok: false, error: 'invalid score' };

  const nick = cleanNick(body.nick);

  const list = await getBoard(kv, game);
  const updated = upsertScore(list, { id, nick, score, ts: now });
  await kv.put(lbKey(game), JSON.stringify(updated), { expirationTtl: 400 * 24 * 60 * 60 });

  return { ok: true, top: updated.slice(0, RETURN) };
}

/** Top do placar para exibição (colapsa por apelido na leitura → corrige duplicatas
 * já gravadas mesmo antes de uma nova submissão). */
export async function topScores(kv: KVLike, game: string): Promise<LBEntry[]> {
  if (!LB_GAMES.has(game)) return [];
  const list = await getBoard(kv, game);
  return dedupe(list).slice(0, RETURN);
}
