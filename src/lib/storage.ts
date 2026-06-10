import AsyncStorage from '@react-native-async-storage/async-storage';

import type { Match } from '../data/fixtures';

const KEY_TEAMS = 'copa2026:selectedTeams';
const KEY_SETTINGS = 'copa2026:settings';
const KEY_MATCHES = 'copa2026:cachedMatches';
const KEY_ONBOARDED = 'copa2026:onboarded';

export type Settings = {
  /** Avisar no início do dia quais jogos das suas seleções têm hoje. */
  dailyDigest: boolean;
  /** Hora (0-23) do resumo diário. */
  dailyDigestHour: number;
  /** Avisar antes de cada jogo começar. */
  matchStart: boolean;
  /** Quantos minutos antes do apito inicial avisar. */
  matchStartLeadMinutes: number;
};

export const DEFAULT_SETTINGS: Settings = {
  dailyDigest: true,
  dailyDigestHour: 9,
  matchStart: true,
  matchStartLeadMinutes: 15,
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
