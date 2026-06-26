/**
 * Ranking GLOBAL dos mini-games — fala com o Worker (mesmo servidor do push).
 * Cada aparelho tem um id estável (gerado uma vez) pra não duplicar no ranking.
 * Tudo tolerante a falha/offline: retorna null e a UI cai pro ranking local.
 */
import AsyncStorage from '@react-native-async-storage/async-storage';

import { SERVER_URL } from './storage';

const KEY_DEVICE = 'copa2026:deviceId';
let cachedId: string | null = null;

export type GlobalEntry = { id: string; nick: string; score: number };

/** Id estável do aparelho (gerado e guardado uma vez). Sem PII — opaco. */
export async function getDeviceId(): Promise<string> {
  if (cachedId) return cachedId;
  try {
    let id = await AsyncStorage.getItem(KEY_DEVICE);
    if (!id) {
      id = `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
      await AsyncStorage.setItem(KEY_DEVICE, id);
    }
    cachedId = id;
    return id;
  } catch {
    return cachedId ?? 'anon';
  }
}

/** fetch com timeout (a rede do RN não tem timeout padrão e pode travar). */
async function fetchT(url: string, init?: RequestInit, ms = 8000): Promise<Response> {
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), ms);
  try {
    return await fetch(url, { ...init, signal: ctrl.signal });
  } finally {
    clearTimeout(t);
  }
}

function parseTop(data: unknown): GlobalEntry[] {
  const top = (data as { top?: unknown })?.top;
  return Array.isArray(top) ? (top as GlobalEntry[]) : [];
}

/** Busca o top global de um jogo. null = falhou (offline/erro) → usar local. */
export async function fetchGlobalLeaderboard(game: string): Promise<GlobalEntry[] | null> {
  try {
    const res = await fetchT(`${SERVER_URL}/api/leaderboard?game=${encodeURIComponent(game)}`);
    if (!res.ok) return null;
    return parseTop(await res.json());
  } catch {
    return null;
  }
}

/** Envia uma pontuação e devolve o top atualizado. null = falhou (offline/erro). */
export async function submitGlobalScore(game: string, nick: string, score: number): Promise<GlobalEntry[] | null> {
  try {
    const id = await getDeviceId();
    const res = await fetchT(`${SERVER_URL}/api/score`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ game, id, nick, score }),
    });
    if (!res.ok) return null;
    return parseTop(await res.json());
  } catch {
    return null;
  }
}
