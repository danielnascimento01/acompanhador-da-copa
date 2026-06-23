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

export interface Env {
  KV: KVNamespace;
  WORKER_URL: string;
  EXPO_ACCESS_TOKEN?: string;
}

// ── KV key helpers ─────────────────────────────────────────────────────────────
const K = {
  tokens: 'tokens',
  scorers: 'scorers',
  lastScore: (matchId: string) => `lastScore:${matchId}`,
};

// ── Cron ───────────────────────────────────────────────────────────────────────

async function runCron(env: Env): Promise<void> {
  const events = await fetchScoreboard();

  // Agrega artilheiros (roda sempre, independente de haver jogo ao vivo)
  await aggregateScorers(env.KV);

  const liveEvents = events.filter((e) => e.status.type.state === 'in');
  if (liveEvents.length === 0) return;

  // Carrega tokens uma vez para usar em todos os gols
  const tokensRaw = await env.KV.get(K.tokens);
  const tokens: string[] = tokensRaw ? (JSON.parse(tokensRaw) as string[]) : [];
  if (tokens.length === 0) return;

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

    // Busca plays para identificar o(s) artilheiro(s)
    const plays = await fetchPlays(event.id);
    const goals = plays.filter(
      (p) => p.type?.text === 'Goal' || p.type?.text === 'Penalty Goal',
    );

    // Encontra os gols novos comparando placar acumulado
    // (os últimos N plays de gol onde N = totalNewGoals)
    const newGoalPlays = goals.slice(-Math.max(totalNewGoals, 1));

    for (const play of newGoalPlays) {
      const scorer = play.athletesInvolved?.[0]?.displayName;
      const minute = play.clock?.displayValue ?? '';
      const playHome = play.homeScore ?? home;
      const playAway = play.awayScore ?? away;
      const scoreStr = `${playHome}–${playAway}`;
      const title = `⚽ GOL! ${homeTeam} ${playHome}–${playAway} ${awayTeam}`;
      const body = scorer
        ? `${scorer}${minute ? ` (${minute})` : ''}`
        : `${homeTeam} ${scoreStr} ${awayTeam}`;

      const { invalidTokens } = await sendPush(tokens, { title, body, data: { matchId: event.id } }, env.EXPO_ACCESS_TOKEN);

      // Remove tokens inválidos (dispositivos desinstalaram o app)
      if (invalidTokens.length > 0) {
        const updated = tokens.filter((t) => !invalidTokens.includes(t));
        await env.KV.put(K.tokens, JSON.stringify(updated), {
          expirationTtl: 365 * 24 * 60 * 60,
        });
        // Atualiza array local para os próximos gols deste ciclo
        tokens.splice(0, tokens.length, ...updated);
      }
    }
  }
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

async function handleRegister(request: Request, env: Env): Promise<Response> {
  if (request.method !== 'POST') return json({ error: 'Method not allowed' }, 405);

  let body: { token?: string; platform?: string };
  try {
    body = await request.json() as { token?: string; platform?: string };
  } catch {
    return json({ error: 'Invalid JSON' }, 400);
  }

  const token = body.token?.trim();
  if (!token || !token.startsWith('ExponentPushToken[')) {
    return json({ error: 'Invalid Expo push token' }, 400);
  }

  const raw = await env.KV.get(K.tokens);
  const tokens: string[] = raw ? (JSON.parse(raw) as string[]) : [];

  if (!tokens.includes(token)) {
    tokens.push(token);
    await env.KV.put(K.tokens, JSON.stringify(tokens), {
      expirationTtl: 365 * 24 * 60 * 60,
    });
  }

  return json({ ok: true, total: tokens.length });
}

async function handleScorers(env: Env): Promise<Response> {
  const scorers = await getScorers(env.KV);
  return json({ scorers, ok: true });
}

async function handleHealth(env: Env): Promise<Response> {
  const tokenCount = await env.KV.get(K.tokens).then((r: string | null) => (r ? JSON.parse(r).length : 0));
  const hasScorers = (await env.KV.get(K.scorers)) !== null;
  return json({ ok: true, tokens: tokenCount, hasScorers });
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
