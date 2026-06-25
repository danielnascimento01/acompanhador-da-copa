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

import { fetchScoreboard, extractScore, yyyymmdd, type ESPNEvent } from './espn';
import { sendPush } from './push';
import { aggregateScorers, getScorers } from './scorers';
import { wantsGoal, wantsFullTime, type SubscriberPrefs } from './filter';
import { buildGoalNotification, buildFullTimeNotification, pickScorerFromDetails } from './notify';

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
  matchState: (matchId: string) => `state:${matchId}`, // último estado visto: 'in' | 'post'
};

type Subscribers = Record<string, SubscriberPrefs>;

const DEFAULT_PREFS: SubscriberPrefs = { mode: 'all', teams: [], matches: [], fullTime: 'off' };

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

/** Interface mínima de KV — permite injetar um fake no teste. */
type KVLike = {
  get(key: string): Promise<string | null>;
  put(key: string, value: string, opts?: { expirationTtl?: number }): Promise<void>;
};
/** Função de envio injetável (no Worker é o sendPush; no teste é um spy). */
type SendFn = (
  tokens: string[],
  msg: { title: string; body: string; data?: Record<string, unknown> },
) => Promise<{ invalidTokens: string[] }>;

/**
 * FIM DE JOGO: dispara o aviso na transição ao-vivo→encerrado. Isolada e testável
 * (KV e envio injetados — ver fulltime.test.ts). Garante:
 *  - só avisa se o estado anterior era 'in' (jogo já encerrado na 1ª vez = sem aviso retroativo)
 *  - grava 'post' uma vez → não reenvia no próximo ciclo
 *  - filtra destinatários por wantsFullTime (modo próprio do fim de jogo)
 * Retorna tokens inválidos (para remoção pelo chamador).
 */
export async function processFullTime(
  finishedEvents: ESPNEvent[],
  subs: Subscribers,
  kv: KVLike,
  send: SendFn,
): Promise<{ sent: number; removedTokens: string[] }> {
  const removedTokens: string[] = [];
  let sent = 0;
  for (const event of finishedEvents) {
    try {
      const stateKey = K.matchState(event.id);
      const prevState = await kv.get(stateKey);

      if (prevState === 'in') {
        const { home, away, homeTeam, awayTeam } = extractScore(event);
        const recipients = Object.keys(subs).filter((t) => wantsFullTime(subs[t], homeTeam, awayTeam));
        if (recipients.length > 0) {
          const { title, body } = buildFullTimeNotification({ homeTeam, awayTeam, home, away });
          console.log('processFullTime: FIM DE JOGO', { event: event.id, score: `${home}-${away}`, recipients: recipients.length });
          const { invalidTokens } = await send(recipients, { title, body, data: { matchId: event.id, kind: 'fulltime' } });
          sent += recipients.length;
          removedTokens.push(...invalidTokens);
        }
      }

      // Grava 'post' uma vez — no próximo cron prevState será 'post' e não reenvia.
      if (prevState !== 'post') {
        await kv.put(stateKey, 'post', { expirationTtl: 7 * 24 * 60 * 60 });
      }
    } catch (err) {
      console.error(`processFullTime: erro no fim de jogo ${event.id}:`, err);
    }
  }
  return { sent, removedTokens };
}

// ── Cron ───────────────────────────────────────────────────────────────────────

async function runCron(env: Env): Promise<void> {
  // Board do dia ET atual (SEM ?dates — a ESPN ancora por US-Eastern) UNIDO ao de
  // ontem-UTC, para cobrir a virada de meia-noite ET↔UTC. Dedup por id. Esta é a
  // correção do bug crítico que deixava o push cego entre ~00:00–04:00 UTC.
  const byId = new Map<string, ESPNEvent>();
  try {
    const today = await fetchScoreboard();
    const yest = await fetchScoreboard(yyyymmdd(new Date(Date.now() - 86_400_000)));
    for (const e of [...today, ...yest]) byId.set(e.id, e);
  } catch (err) {
    console.error('runCron: fetchScoreboard falhou:', err);
    return;
  }
  const events = [...byId.values()];

  // Agrega artilheiros — isolado: se falhar, NÃO pode bloquear o push de gol.
  try {
    await aggregateScorers(env.KV);
  } catch (err) {
    console.error('runCron: aggregateScorers falhou:', err);
  }

  const liveEvents = events.filter((e) => e.status.type.state === 'in');
  const finishedEvents = events.filter((e) => e.status.type.state === 'post');
  if (liveEvents.length === 0 && finishedEvents.length === 0) return;

  // Carrega os assinantes (com preferências) uma vez para gols + fim de jogo.
  // NÃO faz early-return se vazio: o rastreamento de estado do jogo ('in'/'post')
  // precisa rodar SEMPRE, senão um assinante que chega tarde (no fim do jogo)
  // perderia o aviso por nunca ter havido a transição 'in'→'post' gravada.
  // Com 0 destinatários, os loops abaixo apenas registram estado e não enviam nada.
  const subs = await loadSubscribers(env);
  let subsDirty = false; // só persiste o `subs` se removermos algum token inválido

  for (const event of liveEvents) {
    // Um jogo com erro (ESPN instável, parsing) NÃO pode abortar os demais.
    try {
      const { home, away, homeTeam, awayTeam } = extractScore(event);
      const currentScoreStr = `${home}-${away}`;

      // Marca que vimos este jogo AO VIVO — base p/ detectar o fim de jogo depois.
      await env.KV.put(K.matchState(event.id), 'in', { expirationTtl: 7 * 24 * 60 * 60 });

      const storedScoreStr = await env.KV.get(K.lastScore(event.id));

      // Primeiro poll desse jogo — apenas guarda o placar, não notifica.
      if (storedScoreStr === null) {
        await env.KV.put(K.lastScore(event.id), currentScoreStr, { expirationTtl: 48 * 60 * 60 });
        continue;
      }

      if (storedScoreStr === currentScoreStr) continue; // nenhuma mudança

      // Placar mudou — pode ter 1+ gols (se o cron perdeu um ciclo).
      const [prevHome, prevAway] = storedScoreStr.split('-').map(Number);
      const newHomeGoals = home - prevHome;
      const newAwayGoals = away - prevAway;
      const totalNewGoals = newHomeGoals + newAwayGoals;

      // Atualiza o KV ANTES de enviar (evita reenvio/loop se o push falhar).
      await env.KV.put(K.lastScore(event.id), currentScoreStr, { expirationTtl: 48 * 60 * 60 });

      if (totalNewGoals <= 0) continue; // gol anulado (VAR) / correção de placar — ignora

      // Destinatários: só quem segue uma das seleções em campo (ou o jogo).
      const recipients = Object.keys(subs).filter((t) => wantsGoal(subs[t], homeTeam, awayTeam));
      if (recipients.length === 0) continue;

      // Artilheiro só quando há EXATAMENTE 1 gol novo E a ESPN deu o lance (o
      // texto é singular). Sem lance → push sem autor (placar é o que importa).
      let scorer: string | null = null;
      if (totalNewGoals === 1) {
        // Artilheiro vem dos details do scoreboard (já temos o evento) — é onde a
        // ESPN traz o nome na Copa. Pega o gol mais recente do time que marcou.
        const comp = event.competitions[0];
        const scoringSide = newHomeGoals > 0 ? 'home' : 'away';
        const scoringTeamId = comp?.competitors.find((c) => c.homeAway === scoringSide)?.team.id;
        if (scoringTeamId) scorer = pickScorerFromDetails(comp?.details ?? [], scoringTeamId);
      }

      const { title, body } = buildGoalNotification({
        homeTeam,
        awayTeam,
        home,
        away,
        newHome: newHomeGoals,
        newAway: newAwayGoals,
        scorer,
      });

      console.log('runCron: GOL detectado', {
        event: event.id,
        score: `${storedScoreStr} -> ${currentScoreStr}`,
        newGoals: totalNewGoals,
        recipients: recipients.length,
        title,
      });

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
    } catch (err) {
      console.error(`runCron: erro no evento ${event.id}:`, err);
    }
  }

  // ── FIM DE JOGO ────────────────────────────────────────────────────────────
  const ft = await processFullTime(finishedEvents, subs, env.KV, (tokens, msg) =>
    sendPush(tokens, msg, env.EXPO_ACCESS_TOKEN),
  );
  for (const t of ft.removedTokens) {
    if (subs[t]) {
      delete subs[t];
      subsDirty = true;
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

/** Modo do FIM DE JOGO; default 'off' (feature opt-in, novo). */
function parseFullTime(m: unknown): NonNullable<SubscriberPrefs['fullTime']> {
  return m === 'mine' || m === 'all' || m === 'off' ? m : 'off';
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

  let body: { token?: string; mode?: unknown; teams?: unknown; matches?: unknown; fullTime?: unknown };
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
      : {
          mode: parseMode(body.mode),
          teams: parseTeams(body.teams),
          matches: parseMatches(body.matches),
          fullTime: parseFullTime(body.fullTime),
        };

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

// ── Entry point ────────────────────────────────────────────────────────────────

export default {
  async scheduled(_event: ScheduledEvent, env: Env, ctx: ExecutionContext): Promise<void> {
    ctx.waitUntil(runCron(env));
  },

  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url);

    if (url.pathname === '/api/register') return handleRegister(request, env);
    if (url.pathname === '/api/scorers')  return handleScorers(env);
    if (url.pathname === '/api/health')   return handleHealth(env);

    return new Response('Copa 2026 Worker', { status: 200 });
  },
};
