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
  /** id interno da seleção (p/ bandeira real via <Flag>). undefined se não casar. */
  teamId?: string;
  goals: number;
  updatedAt: string;
};

/**
 * Sinal de abort com timeout via AbortController + setTimeout.
 *
 * ⚠️ NÃO usar `AbortSignal.timeout()` aqui: o Hermes do RN 0.81 não implementa
 * esse método estático — ele lança "AbortSignal.timeout is not a function" ANTES
 * do fetch sair, o try/catch engole, e a requisição nunca acontece (foi o bug que
 * deixava o registro de push silenciosamente sem efeito → servidor com 0 tokens).
 */
function timeoutSignal(ms: number): AbortSignal {
  const ctrl = new AbortController();
  setTimeout(() => ctrl.abort(), ms);
  return ctrl.signal;
}

/** Resolve a bandeira (emoji) + id interno do time pelo nome ESPN (melhor esforço). */
function resolveTeam(espnTeamName: string): { flag: string; teamId?: string } {
  const team = TEAMS.find((t) => teamMatches(espnTeamName, t.id));
  return { flag: team?.flag ?? '🏳️', teamId: team?.id };
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
      signal: timeoutSignal(5000),
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);

    const json = (await res.json()) as ServerResponse;
    if (!json.ok || !Array.isArray(json.scorers) || json.scorers.length === 0) {
      throw new Error('empty');
    }

    // Resolve flag + teamId no cliente (servidor retorna teamName da ESPN)
    const data = json.scorers.map((s) => ({
      ...s,
      ...resolveTeam(s.teamName),
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
    teamId: s.teamId,
    goals: s.goals,
    updatedAt: '',
  }));
}

/** Preferências de push de gol enviadas ao servidor junto com o token. */
export type PushPrefs = {
  mode: 'all' | 'mine' | 'off';
  /** ids internos das seleções seguidas. */
  teams: string[];
  /** jogos específicos seguidos, como pares de ids de time [home, away]. */
  matches: [string, string][];
  /** modo do aviso de FIM DE JOGO (independe do push de gol). */
  fullTime: 'all' | 'mine' | 'off';
};

/**
 * Registra o token + as preferências de push de gol no servidor.
 * Fire-and-forget — não bloqueia o app. O servidor usa as prefs para filtrar
 * quais gols notificam este aparelho.
 */
export async function registerPushToken(token: string, prefs?: PushPrefs): Promise<void> {
  try {
    await fetch(`${SERVER_URL}/api/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(prefs ? { token, ...prefs } : { token }),
      signal: timeoutSignal(10_000),
    });
  } catch {
    // Falha silenciosa — tentará de novo na próxima abertura do app
  }
}
