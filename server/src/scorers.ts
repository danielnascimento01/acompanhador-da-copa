/**
 * Agrega os artilheiros da Copa 2026 (Chuteira de Ouro DESTA Copa) somando os
 * gols de TODOS os jogos do torneio, do dia da abertura até hoje. Roda no cron e
 * grava o resultado no KV para o app consumir.
 *
 * Fonte: o próprio SCOREBOARD da ESPN já traz os autores dos gols em
 * `competitions[0].details` (scoringPlay + athletesInvolved) — então 1 request
 * POR DIA resolve, sem precisar do summary de cada jogo (que estouraria o limite
 * de subrequests do Worker).
 *
 * Custo controlado por CACHE POR DIA: um dia 100% encerrado (e com 2+ dias de
 * idade) vira "final" e NÃO é re-buscado — em regime, o cron busca só hoje/ontem.
 */

import { fetchScoreboard, yyyymmdd, type ESPNEvent } from './espn';
import { findPlayerPhoto } from './sportsdb';

export type LiveScorer = {
  player: string;
  teamName: string;
  goals: number;
  updatedAt: string; // ISO 8601
  /** id do atleta na ESPN (p/ foto real via a.espncdn.com — só o PRÓPRIO id, nunca outro). */
  athleteId?: string;
  /** foto real via TheSportsDB (busca por nome, só quando a nacionalidade confirma — ver sportsdb.ts). */
  photoUrl?: string;
};

/** Backfill de foto por tick do cron: orçamento baixo pra não estourar TheSportsDB nem subrequests. */
const MAX_PHOTO_LOOKUPS_PER_TICK = 8;

/** Abertura da Copa 2026 (a soma começa daqui). */
const TOURNEY_START = '20260611';

type DayGoals = { player: string; teamName: string; athleteId?: string }[];
type DateCache = Record<string, { final: boolean; scorers: DayGoals }>;

/** Todas as datas YYYYMMDD da abertura até hoje+1 (o +1 cobre o fuso ET/UTC). */
function tournamentDates(now: Date): string[] {
  const start = Date.parse(`${TOURNEY_START.slice(0, 4)}-${TOURNEY_START.slice(4, 6)}-${TOURNEY_START.slice(6, 8)}T00:00:00Z`);
  const end = now.getTime() + 86_400_000;
  const out: string[] = [];
  for (let t = start; t <= end; t += 86_400_000) out.push(yyyymmdd(new Date(t)));
  return out;
}

/**
 * Extrai os autores dos gols de UM jogo a partir dos `details` do scoreboard.
 * Ignora gol contra (não conta pra artilharia individual). O nome do time vem do
 * competidor dono do gol (casado por id).
 */
export function scorersFromEvent(event: ESPNEvent): DayGoals {
  const comp = event.competitions[0];
  if (!comp) return [];
  const out: DayGoals = [];
  for (const det of comp.details ?? []) {
    if (!det.scoringPlay || det.ownGoal) continue;
    const ath = det.athletesInvolved?.[0];
    const player = ath?.displayName;
    if (!player) continue;
    const teamId = ath?.team?.id ?? det.team?.id;
    const teamName = comp.competitors.find((c) => c.team.id === teamId)?.team.displayName ?? '';
    out.push({ player, teamName, athleteId: ath?.id });
  }
  return out;
}

export async function aggregateScorers(kv: KVNamespace): Promise<void> {
  const now = new Date();
  const todayStr = yyyymmdd(now);
  const yestStr = yyyymmdd(new Date(now.getTime() - 86_400_000));

  // Cache por dia: dias antigos e 100% encerrados não são re-buscados.
  const cacheRaw = await kv.get('scorers_dates');
  const cache: DateCache = safeParseDates(cacheRaw);
  let cacheDirty = false;

  for (const date of tournamentDates(now)) {
    const cached = cache[date];
    // Re-busca hoje e ontem SEMPRE (correções tardias da ESPN); dias "final" ficam no cache.
    const mustFetch = !cached || !cached.final || date === todayStr || date === yestStr;
    if (!mustFetch) continue;

    const events = await fetchScoreboard(date);
    const relevant = events.filter((e) => e.status.type.state !== 'pre');
    if (relevant.length === 0) continue; // dia sem jogos (ex.: hoje+1 vazio) — não cacheia

    const scorers = relevant.flatMap(scorersFromEvent);
    const allPost = relevant.every((e) => e.status.type.state === 'post');
    // "final" só se tudo encerrado E já não é hoje/ontem (deixa 48h p/ correção tardia).
    const final = allPost && date !== todayStr && date !== yestStr;
    const entry = { final, scorers };
    if (!cached || JSON.stringify(cached) !== JSON.stringify(entry)) {
      cache[date] = entry;
      cacheDirty = true; // só marca sujo quando MUDA → não reescreve o KV à toa
    }
  }

  // Soma todos os dias cacheados → total por jogador.
  const totals = new Map<string, { teamName: string; goals: number; athleteId?: string }>();
  for (const date of Object.keys(cache)) {
    for (const g of cache[date].scorers) {
      const cur = totals.get(g.player) ?? { teamName: g.teamName, goals: 0, athleteId: g.athleteId };
      totals.set(g.player, {
        teamName: cur.teamName || g.teamName,
        goals: cur.goals + 1,
        athleteId: cur.athleteId ?? g.athleteId,
      });
    }
  }
  if (totals.size === 0) return; // nada ainda — não sobrescreve

  const scorers: LiveScorer[] = Array.from(totals.entries())
    .map(([player, { teamName, goals, athleteId }]) => ({ player, teamName, goals, athleteId, updatedAt: now.toISOString() }))
    .sort((a, b) => b.goals - a.goals || a.player.localeCompare(b.player));

  // Backfill de foto (TheSportsDB) — cache permanente por jogador (achou OU não achou,
  // pra nunca re-tentar à toa), com orçamento baixo por tick (torneio inteiro converge
  // em poucos ciclos sem estourar limite de requests).
  const photoCache = safeParsePhotos(await kv.get('player_photos'));
  let photoCacheDirty = false;
  let lookupsUsed = 0;
  for (const s of scorers) {
    if (s.player in photoCache) continue; // já resolvido (achou ou não achou)
    if (lookupsUsed >= MAX_PHOTO_LOOKUPS_PER_TICK) continue; // orçamento do tick esgotado
    photoCache[s.player] = await findPlayerPhoto(s.player, s.teamName);
    photoCacheDirty = true;
    lookupsUsed++;
  }
  for (const s of scorers) {
    const url = photoCache[s.player];
    if (url) s.photoUrl = url;
  }
  if (photoCacheDirty) {
    await kv.put('player_photos', JSON.stringify(photoCache), { expirationTtl: 60 * 24 * 60 * 60 });
  }

  // Só grava `scorers` se a artilharia REALMENTE mudou (ignora `updatedAt`).
  const prevRaw = await kv.get('scorers');
  if (!prevRaw || !sameScorers(safeParse(prevRaw), scorers)) {
    await kv.put('scorers', JSON.stringify(scorers), { expirationTtl: 7 * 24 * 60 * 60 });
  }
  // Persiste o cache de dias só quando mudou (dias encerrados não geram escrita).
  if (cacheDirty) {
    await kv.put('scorers_dates', JSON.stringify(cache), { expirationTtl: 60 * 24 * 60 * 60 });
  }
}

/** Parse tolerante da lista de artilheiros (KV corrompido → vazio). */
function safeParse(raw: string): LiveScorer[] {
  try {
    const v = JSON.parse(raw);
    return Array.isArray(v) ? (v as LiveScorer[]) : [];
  } catch {
    return [];
  }
}

/** Parse tolerante do cache de dias. */
function safeParseDates(raw: string | null): DateCache {
  if (!raw) return {};
  try {
    const v = JSON.parse(raw);
    return v && typeof v === 'object' && !Array.isArray(v) ? (v as DateCache) : {};
  } catch {
    return {};
  }
}

/** Parse tolerante do cache de fotos (jogador → url ou null se já checado e não achou). */
function safeParsePhotos(raw: string | null): Record<string, string | null> {
  if (!raw) return {};
  try {
    const v = JSON.parse(raw);
    return v && typeof v === 'object' && !Array.isArray(v) ? (v as Record<string, string | null>) : {};
  } catch {
    return {};
  }
}

/** Compara duas listas de artilheiros ignorando `updatedAt` (muda todo ciclo). */
export function sameScorers(a: LiveScorer[], b: LiveScorer[]): boolean {
  if (a.length !== b.length) return false;
  const sig = (l: LiveScorer[]) =>
    l.map((s) => JSON.stringify([s.player, s.teamName, s.goals, s.athleteId, s.photoUrl])).sort().join('|');
  return sig(a) === sig(b);
}

/** Retorna artilheiros do KV (fallback: array vazio). Só gols DESTA Copa, ordenados. */
export async function getScorers(kv: KVNamespace): Promise<LiveScorer[]> {
  try {
    const raw = await kv.get('scorers');
    if (!raw) return [];
    const list = JSON.parse(raw) as LiveScorer[];
    return Array.isArray(list) ? list : [];
  } catch {
    return [];
  }
}
