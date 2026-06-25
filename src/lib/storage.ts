import AsyncStorage from '@react-native-async-storage/async-storage';

import type { Match } from '../data/fixtures';

const KEY_TEAMS       = 'copa2026:selectedTeams';
const KEY_SETTINGS    = 'copa2026:settings';
const KEY_MATCHES     = 'copa2026:cachedMatches';
const KEY_ONBOARDED   = 'copa2026:onboarded';
const KEY_PREDICTIONS = 'copa2026:predictions';
const KEY_PUSH_TOKEN  = 'copa2026:pushToken';
const KEY_ANNOUNCE    = 'copa2026:lastAnnounce';

/**
 * Id do aviso (popup de novidade) ATUAL. Para lançar um novo aviso no futuro,
 * basta mudar este id — o popup volta a aparecer uma vez para todos.
 */
export const CURRENT_ANNOUNCE_ID = 'goal-push-v1';

/**
 * URL do Cloudflare Worker que gerencia push de gol e artilheiros ao vivo.
 * Atualizar após o primeiro `wrangler deploy` em server/.
 */
export const SERVER_URL = 'https://copa2026-worker.nascimentodaniel.workers.dev';

/** Palpite do usuário para um jogo (placar simulado). `at` = quando palpitou. */
export type Prediction = { home: number; away: number; at?: number };
export type PredictionMap = Record<string, Prediction>;

export const MAX_PREDICTION_GOALS = 20;

/** Valida dados vindos do disco: só palpites com placares inteiros no intervalo. */
function sanitizePredictions(raw: unknown): PredictionMap {
  if (!raw || typeof raw !== 'object') return {};
  const out: PredictionMap = {};
  for (const [id, v] of Object.entries(raw as Record<string, unknown>)) {
    const p = v as Partial<Prediction> | null;
    if (
      p &&
      Number.isInteger(p.home) &&
      Number.isInteger(p.away) &&
      (p.home as number) >= 0 &&
      (p.home as number) <= MAX_PREDICTION_GOALS &&
      (p.away as number) >= 0 &&
      (p.away as number) <= MAX_PREDICTION_GOALS
    ) {
      out[id] = {
        home: p.home as number,
        away: p.away as number,
        ...(typeof p.at === 'number' ? { at: p.at } : {}),
      };
    }
  }
  return out;
}

export type Settings = {
  /** Avisar no início do dia quais jogos das suas seleções têm hoje. */
  dailyDigest: boolean;
  /** Hora (0-23) do resumo diário. */
  dailyDigestHour: number;
  /** Avisar antes de cada jogo começar. */
  matchStart: boolean;
  /** Quantos minutos antes do apito inicial avisar. */
  matchStartLeadMinutes: number;
  /** Economia de dados: desliga a atualização automática ao vivo (só manual). */
  dataSaver: boolean;
  /** Seleção PRINCIPAL do usuário (id da seleção) — vira o foco do app (hero/situação). null = nenhuma. */
  primaryTeam: string | null;
  /** Apoiou o projeto via IAP "Apoie o projeto". Cosmético/gratidão — NUNCA libera função. */
  supporter: boolean;
  /** Push de GOL (remoto, app fechado): 'all' = todos os jogos · 'mine' = só as
   *  minhas seleções + jogos seguidos · 'off' = nenhum. Independe dos avisos locais. */
  goalPush: 'all' | 'mine' | 'off';
  /** Push de FIM DE JOGO (remoto): 'all' = todos · 'mine' = minhas seleções +
   *  jogos seguidos · 'off' = nenhum. Independe do push de gol. Default 'off'. */
  fullTimePush: 'all' | 'mine' | 'off';
  /** Jogos específicos seguidos para push de gol (ids de Match), além das seleções. */
  followedMatches: string[];
};

export const DEFAULT_SETTINGS: Settings = {
  dailyDigest: true,
  dailyDigestHour: 9,
  matchStart: true,
  matchStartLeadMinutes: 15,
  dataSaver: false,
  primaryTeam: null,
  supporter: false,
  goalPush: 'mine',
  fullTimePush: 'off',
  followedMatches: [],
};

export async function loadSelectedTeams(): Promise<string[]> {
  try {
    const raw = await AsyncStorage.getItem(KEY_TEAMS);
    return raw ? (JSON.parse(raw) as string[]) : [];
  } catch {
    return [];
  }
}

export async function saveSelectedTeams(ids: string[]): Promise<void> {
  await AsyncStorage.setItem(KEY_TEAMS, JSON.stringify(ids));
}

export async function loadSettings(): Promise<Settings> {
  try {
    const raw = await AsyncStorage.getItem(KEY_SETTINGS);
    return raw ? { ...DEFAULT_SETTINGS, ...JSON.parse(raw) } : DEFAULT_SETTINGS;
  } catch {
    return DEFAULT_SETTINGS;
  }
}

export async function saveSettings(s: Settings): Promise<void> {
  await AsyncStorage.setItem(KEY_SETTINGS, JSON.stringify(s));
}

/** Cache dos jogos atualizados pela API (placar/status), com o horário da última atualização. */
export async function loadCachedMatches(): Promise<{ matches: Match[]; updatedAt: number } | null> {
  try {
    const raw = await AsyncStorage.getItem(KEY_MATCHES);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

export async function saveCachedMatches(matches: Match[], updatedAt: number): Promise<void> {
  await AsyncStorage.setItem(KEY_MATCHES, JSON.stringify({ matches, updatedAt }));
}

/** Retorna `null` em falha de leitura — chamador NÃO deve sobrescrever o disco nesse caso. */
export async function loadPredictions(): Promise<PredictionMap | null> {
  try {
    const raw = await AsyncStorage.getItem(KEY_PREDICTIONS);
    return raw ? sanitizePredictions(JSON.parse(raw)) : {};
  } catch {
    return null;
  }
}

export async function savePredictions(p: PredictionMap): Promise<void> {
  try {
    await AsyncStorage.setItem(KEY_PREDICTIONS, JSON.stringify(p));
  } catch {
    // Falha de escrita não deve derrubar o app; o palpite fica em memória.
  }
}

export async function loadOnboarded(): Promise<boolean> {
  try {
    return (await AsyncStorage.getItem(KEY_ONBOARDED)) === '1';
  } catch {
    return false;
  }
}

export async function saveOnboarded(value: boolean): Promise<void> {
  await AsyncStorage.setItem(KEY_ONBOARDED, value ? '1' : '0');
}

export async function loadPushToken(): Promise<string | null> {
  try {
    return await AsyncStorage.getItem(KEY_PUSH_TOKEN);
  } catch {
    return null;
  }
}

export async function savePushToken(token: string): Promise<void> {
  await AsyncStorage.setItem(KEY_PUSH_TOKEN, token);
}

/** Id do último aviso (popup) que o usuário já viu. null = nunca viu nenhum. */
export async function loadLastAnnounce(): Promise<string | null> {
  try {
    return await AsyncStorage.getItem(KEY_ANNOUNCE);
  } catch {
    return null;
  }
}

export async function saveLastAnnounce(id: string): Promise<void> {
  try {
    await AsyncStorage.setItem(KEY_ANNOUNCE, id);
  } catch {
    // Falha de escrita não é crítica — o popup pode reaparecer no próximo boot.
  }
}
