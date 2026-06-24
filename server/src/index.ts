/**
 * Copa 2026 Worker — Cloudflare Worker
 *
 * Responsabilidades:
 * 1. Cron a cada minuto: detecta gols por mudança de placar → envia push
 * 2. Cron a cada minuto: agrega artilheiros de todos os jogos encerrados/ao vivo
 * 3. REST API:
 *    POST /api/register  — app registra/atualiza seu Expo push token
 *    GET  /api/scorers   — app busca lista de artilheiros ao vivo
 *    GET  /api/health    — healthcheck
 */

import { fetchScoreboard, extractScore, fetchPlays } from './espn';
import { sendPush } from './push';
import { aggregateScorers, getScorers } from './scorers';
import { wantsGoal, type SubscriberPrefs } from './filter';

export interface Env {
  KV: KVNamespace;
  WORKER_URL: string;
  EXPO_ACCESS_TOKEN?: string;
}

// ── KV key helpers ─────────────────────────────────────────────────────────────
const K = {
  tokens: 'tokens',   // legado (string[]) — migrado para `subs`
  subs: 'subs',       // Record<token, SubscriberPrefs>
  scorers: 'scorers',
  lastScore: (matchId: string) => `lastScore:${matchId}`,
};

type Subscribers = Record<string, SubscriberPrefs>;

const DEFAULT_PREFS: SubscriberPrefs = { mode: 'all', teams: [], matches: [] };

/**
 * Carrega os assinantes. Migra os tokens legados (string[] do `K.tokens`,
 * registrados antes desta feature) como mode 'all' — preserva o comportamento
 * atual de quem ainda não atualizou o app (OTA).
 */
async function loadSubscribers(env: Env): Promise<Subscribers> {
  const subsRaw = await env.KV.get(K.subs);
  const subs: Subscribers = subsRaw ? (JSON.parse(subsRaw) as Subscribers) : {};

  const legacyRaw = await env.KV.get(K.tokens);
  if (legacyRaw) {
    const legacy = JSON.parse(legacyRaw) as string[];
    for (const t of legacy) {
      if (!subs[t]) subs[t] = { ...DEFAULT_PREFS };
    }
  }
  return subs;
}

async function saveSubscribers(env: Env, subs: Subscribers): Promise<void> {
  await env.KV.put(K.subs, JSON.stringify(subs), { expirationTtl: 365 * 24 * 60 * 60 });
}

// ── Cron ───────────────────────────────────────────────────────────────────────

async function runCron(env: Env): Promise<void> {
  const events = await fetchScoreboard();

  // Agrega artilheiros (roda sempre, independente de haver jogo ao vivo)
  await aggregateScorers(env.KV);

  const liveEvents = events.filter((e) => e.status.type.state === 'in');
  if (liveEvents.length === 0) return;

  // Carrega os assinantes (com preferências) uma vez para todos os gols.
  const subs = await loadSubscribers(env);
  if (Object.keys(subs).length === 0) return;
  let subsDirty = false; // só persiste o `subs` se removermos algum token inválido

  for (const event of liveEvents) {
    const { home, away, homeTeam, awayTeam } = extractScore(event);
    const currentScoreStr = `${home}-${away}`;

    const storedScoreStr = await env.KV.get(K.lastScore(event.id));

    // Primeiro poll desse jogo — apenas guarda o placar, não notifica
    if (storedScoreStr === null) {
      await env.KV.put(K.lastScore(event.id), currentScoreStr, {
        expirationTtl: 48 * 60 * 60,
      });
      continue;
    }

    if (storedScoreStr === currentScoreStr) continue; // Nenhuma mudança

    // Placar mudou — pode ter 1+ gols (se cron perdeu um ciclo)
    const [prevHome, prevAway] = storedScoreStr.split('-').map(Number);
    const newHomeGoals = home - prevHome;
    const newAwayGoals = away - prevAway;
    const totalNewGoals = newHomeGoals + newAwayGoals;

    // Atualiza KV antes de enviar push (evita loop se push falhar)
    await env.KV.put(K.lastScore(event.id), currentScoreStr, {
      expirationTtl: 48 * 60 * 60,
    });

    if (totalNewGoals <= 0) continue; // Gol anulado ou erro de dados — ignora

    // Destinatários deste jogo: só quem segue uma das seleções em campo
    // (ou o jogo específico), conforme a preferência de cada aparelho.
    const recipients = Object.keys(subs).filter((t) => wantsGoal(subs[t], homeTeam, awayTeam));
    if (recipients.length === 0) continue;

    // Tenta identificar o(s) artilheiro(s) pelos lances — MAS o push sai mesmo se
    // não achar (robustez: o GOL já está CONFIRMADO pela mudança de placar). Antes,
    // se fetchPlays não retornasse o lance, o loop ficava vazio e NENHUM push saía.
    let scorerLine = '';
    try {
      const plays = await fetchPlays(event.id);
      const goals = plays.filter(
        (p) => (p.type?.text ?? '').toLowerCase().includes('goal'),
      );
      const names = goals
        .slice(-totalNewGoals)
        .map((p) => p.athletesInvolved?.[0]?.displayName)
        .filter((n): n is string => !!n);
      if (names.length > 0) scorerLine = names.join(', ');
    } catch {
      // Sem lance-a-lance — segue com push genérico.
    }

    const title = `⚽ GOL! ${homeTeam} ${home}–${away} ${awayTeam}`;
    const body = scorerLine || `Saiu gol em ${homeTeam} x ${awayTeam}!`;

    const { invalidTokens } = await sendPush(
      recipients,
      { title, body, data: { matchId: event.id } },
      env.EXPO_ACCESS_TOKEN,
    );

    // Remove tokens inválidos (dispositivos que desinstalaram o app).
    for (const t of invalidTokens) {
      if (subs[t]) {
        delete subs[t];
        subsDirty = true;
      }
    }
  }

  if (subsDirty) await saveSubscribers(env, subs);
}

// ── HTTP API ───────────────────────────────────────────────────────────────────

function json(data: unknown, status = 200): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      'Content-Type': 'application/json',
      'Access-Control-Allow-Origin': '*',
    },
  });
}

/** Sanitiza o modo recebido; default 'all' (compatível com app antigo). */
function parseMode(m: unknown): SubscriberPrefs['mode'] {
  return m === 'mine' || m === 'off' || m === 'all' ? m : 'all';
}

/** Sanitiza uma lista de ids de time (strings curtas, sem lixo). */
function parseTeams(v: unknown): string[] {
  if (!Array.isArray(v)) return [];
  return v.filter((x): x is string => typeof x === 'string' && x.length > 0 && x.length <= 40).slice(0, 64);
}

/** Sanitiza a lista de jogos seguidos (pares de ids de time). */
function parseMatches(v: unknown): [string, string][] {
  if (!Array.isArray(v)) return [];
  const out: [string, string][] = [];
  for (const p of v) {
    if (Array.isArray(p) && typeof p[0] === 'string' && typeof p[1] === 'string' && p[0] && p[1]) {
      out.push([p[0].slice(0, 40), p[1].slice(0, 40)]);
    }
    if (out.length >= 128) break;
  }
  return out;
}

async function handleRegister(request: Request, env: Env): Promise<Response> {
  if (request.method !== 'POST') return json({ error: 'Method not allowed' }, 405);

  let body: { token?: string; mode?: unknown; teams?: unknown; matches?: unknown };
  try {
    body = (await request.json()) as typeof body;
  } catch {
    return json({ error: 'Invalid JSON' }, 400);
  }

  const token = body.token?.trim();
  if (!token || !token.startsWith('ExponentPushToken[')) {
    return json({ error: 'Invalid Expo push token' }, 400);
  }

  const subs = await loadSubscribers(env);
  // App antigo (só manda token) → mantém/assume 'all'. App novo manda as prefs.
  const prefs: SubscriberPrefs =
    body.mode === undefined && body.teams === undefined && body.matches === undefined
      ? subs[token] ?? { ...DEFAULT_PREFS }
      : { mode: parseMode(body.mode), teams: parseTeams(body.teams), matches: parseMatches(body.matches) };

  subs[token] = prefs;
  await saveSubscribers(env, subs);

  return json({ ok: true, total: Object.keys(subs).length });
}

async function handleScorers(env: Env): Promise<Response> {
  const scorers = await getScorers(env.KV);
  return json({ scorers, ok: true });
}

async function handleHealth(env: Env): Promise<Response> {
  const subs = await loadSubscribers(env);
  const tokens = Object.keys(subs);
  const byMode = { all: 0, mine: 0, off: 0 };
  for (const t of tokens) byMode[subs[t].mode]++;
  const hasScorers = (await env.KV.get(K.scorers)) !== null;
  return json({ ok: true, tokens: tokens.length, byMode, hasScorers });
}

/**
 * DIAGNÓSTICO (temporário): mostra o que o worker enxerga AGORA — jogos ao vivo,
 * placar guardado no KV (revela se o cron já rodou e rastreou o jogo) e a
 * estrutura dos lances (revela se fetchPlays acha os gols). Remover depois.
 */
async function handleDebug(env: Env): Promise<Response> {
  const events = await fetchScoreboard();
  const live = events.filter((e) => e.status.type.state === 'in');
  const out: Array<Record<string, unknown>> = [];
  for (const e of live) {
    const { home, away, homeTeam, awayTeam } = extractScore(e);
    const storedLastScore = await env.KV.get(K.lastScore(e.id));
    let totalPlays = -1;
    let goalPlays = -1;
    let playTypes: string[] = [];
    try {
      const plays = await fetchPlays(e.id);
      totalPlays = plays.length;
      goalPlays = plays.filter((p) => (p.type?.text ?? '').toLowerCase().includes('goal')).length;
      playTypes = Array.from(new Set(plays.map((p) => p.type?.text).filter((t): t is string => !!t))).slice(0, 25);
    } catch (err) {
      playTypes = [`FETCHPLAYS_ERROR: ${err instanceof Error ? err.message : String(err)}`];
    }
    out.push({
      id: e.id,
      match: `${homeTeam} ${home}-${away} ${awayTeam}`,
      storedLastScore,            // null = cron ainda não rastreou (não rodou / acabou de começar)
      currentScore: `${home}-${away}`,
      totalPlays,                 // 0 = sem lance-a-lance; -1 = erro
      goalPlays,                  // 0 com totalPlays>0 = filtro de gol não casa
      playTypes,                  // tipos REAIS de lance que a ESPN retorna
    });
  }
  return json({ liveCount: live.length, live: out });
}

// ── Entry point ────────────────────────────────────────────────────────────────

export default {
  async scheduled(_event: ScheduledEvent, env: Env, ctx: ExecutionContext): Promise<void> {
    ctx.waitUntil(runCron(env));
  },

  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url);

    if (url.pathname === '/api/debug')    return handleDebug(env);
    if (url.pathname === '/api/register') return handleRegister(request, env);
    if (url.pathname === '/api/scorers')  return handleScorers(env);
    if (url.pathname === '/api/health')   return handleHealth(env);

    return new Response('Copa 2026 Worker', { status: 200 });
  },
};
