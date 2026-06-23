/**
 * Busca a lista de artilheiros ao vivo do Cloudflare Worker.
 * Se o servidor estiver fora do ar ou não houver dados ainda, usa o fallback
 * estático de scorers.ts (mesma lista que existia antes da Task #17).
 */
import { SERVER_URL } from './storage';
import { SCORERS, topScorers } from '../data/scorers';
import { TEAMS } from '../data/teams';
import { teamMatches } from './liveEvents';

export type LiveScorer = {
  player: string;
  teamName: string;
  flag: string;
  goals: number;
  updatedAt: string;
};

/** Resolve a bandeira do time usando o nome ESPN (melhor esforço). */
function resolveFlag(espnTeamName: string): string {
  const team = TEAMS.find((t) => teamMatches(espnTeamName, t.id));
  return team?.flag ?? '🏳️';
}

type ServerResponse = {
  ok: boolean;
  scorers: LiveScorer[];
};

let cache: { data: LiveScorer[]; fetchedAt: number } | null = null;
const CACHE_TTL_MS = 60_000; // 1 min — refresh no máximo a cada minuto

/**
 * Retorna artilheiros: servidor ao vivo se disponível, senão fallback estático.
 * Usa cache em memória de 1 min para não bombardear o servidor a cada render.
 */
export async function fetchLiveScorers(): Promise<LiveScorer[]> {
  const now = Date.now();
  if (cache && now - cache.fetchedAt < CACHE_TTL_MS) return cache.data;

  try {
    const res = await fetch(`${SERVER_URL}/api/scorers`, {
      signal: AbortSignal.timeout(5000),
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);

    const json = (await res.json()) as ServerResponse;
    if (!json.ok || !Array.isArray(json.scorers) || json.scorers.length === 0) {
      throw new Error('empty');
    }

    // Resolve flag no cliente (servidor retorna teamName da ESPN)
    const data = json.scorers.map((s) => ({
      ...s,
      flag: resolveFlag(s.teamName),
    }));
    cache = { data, fetchedAt: now };
    return data;
  } catch {
    // Servidor fora do ar ou sem dados — usa fallback estático
    return staticScorers();
  }
}

function staticScorers(): LiveScorer[] {
  return topScorers(SCORERS).map((s) => ({
    player: s.player,
    teamName: s.teamName,
    flag: s.flag,
    goals: s.goals,
    updatedAt: '',
  }));
}

/** Registra o push token no servidor. Fire-and-forget — não bloqueia o app. */
export async function registerPushToken(token: string): Promise<void> {
  try {
    await fetch(`${SERVER_URL}/api/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ token }),
      signal: AbortSignal.timeout(10_000),
    });
  } catch {
    // Falha silenciosa — tentará de novo na próxima abertura do app
  }
}
