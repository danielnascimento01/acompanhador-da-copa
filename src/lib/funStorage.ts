/**
 * Armazenamento local da aba "Quiz e Jogos": apelido do jogador, melhor nota do
 * quiz por modo e o recorde/ranking local das embaixadinhas. Tudo offline.
 */
import AsyncStorage from '@react-native-async-storage/async-storage';

import type { QuizMode } from '../data/quiz';

const KEY_NICK = 'copa2026:nick';
const KEY_QUIZ_BEST = 'copa2026:quizBest';
const KEY_GAME = 'copa2026:embaixadinhas';
const KEY_SKIN = 'copa2026:embaixadinhasSkin';

export type ScoreEntry = { nick: string; score: number };

export async function loadNick(): Promise<string> {
  try {
    return (await AsyncStorage.getItem(KEY_NICK)) ?? '';
  } catch {
    return '';
  }
}
export async function saveNick(nick: string): Promise<void> {
  try {
    await AsyncStorage.setItem(KEY_NICK, nick.trim().slice(0, 16));
  } catch {
    /* ignore */
  }
}

/** Skin (camisa) equipada nas embaixadinhas. Default = 'brasil'. */
export async function loadSkin(): Promise<string> {
  try {
    return (await AsyncStorage.getItem(KEY_SKIN)) ?? 'brasil';
  } catch {
    return 'brasil';
  }
}
export async function saveSkin(id: string): Promise<void> {
  try {
    await AsyncStorage.setItem(KEY_SKIN, id);
  } catch {
    /* ignore */
  }
}

/** Melhor acerto do quiz por modo (Record<modo, acertos>). */
export async function loadQuizBest(): Promise<Partial<Record<QuizMode, number>>> {
  try {
    const raw = await AsyncStorage.getItem(KEY_QUIZ_BEST);
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}
export async function saveQuizBest(best: Partial<Record<QuizMode, number>>): Promise<void> {
  try {
    await AsyncStorage.setItem(KEY_QUIZ_BEST, JSON.stringify(best));
  } catch {
    /* ignore */
  }
}

/** Ranking local das embaixadinhas (top scores com apelido). */
export async function loadGameScores(): Promise<ScoreEntry[]> {
  try {
    const raw = await AsyncStorage.getItem(KEY_GAME);
    return raw ? (JSON.parse(raw) as ScoreEntry[]) : [];
  } catch {
    return [];
  }
}
/**
 * Registra uma pontuação e devolve o ranking atualizado (top 10, desc).
 * Cada apelido aparece UMA vez só, com o seu maior recorde — jogar várias
 * vezes não polui o ranking com entradas repetidas do mesmo jogador.
 */
export async function addGameScore(nick: string, score: number): Promise<ScoreEntry[]> {
  const list = await loadGameScores();
  // apara o apelido: vazio ou só espaços viram 'Você' (nada de linha em branco)
  const clean = nick.trim().slice(0, 16) || 'Você';
  list.push({ nick: clean, score });

  // mantém só o melhor de cada apelido (sem diferenciar maiúsculas), preservando
  // a grafia já consolidada pra não trocar a escrita de forma surpreendente.
  const best = new Map<string, ScoreEntry>();
  for (const e of list) {
    const key = e.nick.trim().toLowerCase();
    const cur = best.get(key);
    if (!cur) best.set(key, e);
    else best.set(key, { nick: cur.nick, score: Math.max(cur.score, e.score) });
  }

  const top = [...best.values()].sort((a, b) => b.score - a.score).slice(0, 10);
  try {
    await AsyncStorage.setItem(KEY_GAME, JSON.stringify(top));
  } catch {
    /* ignore */
  }
  return top;
}
