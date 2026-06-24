import * as Notifications from 'expo-notifications';
import Constants from 'expo-constants';
import * as Device from 'expo-device';
import { Platform } from 'react-native';

import { filterByTeams, isFinished, kickoff, Match } from '../data/fixtures';
import { teamName, teamFlag } from '../data/teams';
import { Settings, SERVER_URL } from './storage';
import { formatTime, localDayKey } from './format';

// iOS limita o número de notificações locais pendentes a 64. Deixamos folga.
const MAX_PENDING = 60;
// Reservamos uma fatia para o resumo diário, para que muitas seleções não
// engulam todos os slots com avisos de "jogo começando" e sumam com os resumos.
const MAX_DIGESTS = 16;
const ANDROID_CHANNEL = 'jogos';

// "Latest wins": cada chamada de rescheduleAll pega um número de sequência.
// Se uma chamada mais nova começar, a antiga aborta no meio sem deixar a
// agenda pela metade (evita interleaving em taps rápidos).
let scheduleSeq = 0;

/** Define como notificações aparecem com o app aberto. Chame uma vez no boot. */
export function configureNotificationHandler() {
  Notifications.setNotificationHandler({
    handleNotification: async () => ({
      shouldShowBanner: true,
      shouldShowList: true,
      shouldPlaySound: true,
      shouldSetBadge: false,
    }),
  });
}

/** Cria o canal no Android (necessário para som/prioridade). */
export async function ensureAndroidChannel() {
  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync(ANDROID_CHANNEL, {
      name: 'Jogos da Copa',
      importance: Notifications.AndroidImportance.HIGH,
      vibrationPattern: [0, 250, 250, 250],
      lightColor: '#0B6E4F',
    });
  }
}

/** Pede permissão de notificação. Retorna true se concedida. */
export async function requestPermission(): Promise<boolean> {
  if (!Device.isDevice) {
    // Em simulador/emulador as permissões podem não funcionar; tratamos como ok.
    return true;
  }
  const { status: existing } = await Notifications.getPermissionsAsync();
  let status = existing;
  if (existing !== 'granted') {
    const req = await Notifications.requestPermissionsAsync();
    status = req.status;
  }
  return status === 'granted';
}

export async function getPermissionGranted(): Promise<boolean> {
  const { status } = await Notifications.getPermissionsAsync();
  return status === 'granted';
}

type PlannedNotification = {
  date: Date;
  title: string;
  body: string;
  data: Record<string, unknown>;
};

function matchLabel(m: Match): string {
  return `${teamFlag(m.home)} ${teamName(m.home)} x ${teamName(m.away)} ${teamFlag(m.away)}`;
}

/** Monta (sem agendar) os avisos de "jogo começando". */
function planMatchStartNotifications(matches: Match[], settings: Settings, now: Date): PlannedNotification[] {
  if (!settings.matchStart) return [];
  const out: PlannedNotification[] = [];
  for (const m of matches) {
    const ko = kickoff(m);
    const fireAt = new Date(ko.getTime() - settings.matchStartLeadMinutes * 60_000);
    if (fireAt <= now) continue;
    const mins = settings.matchStartLeadMinutes;
    out.push({
      date: fireAt,
      title: '⚽ Vai começar!',
      body: `${matchLabel(m)} começa às ${formatTime(ko)} (em ${mins} min).`,
      data: { type: 'match-start', matchId: m.id },
    });
  }
  return out;
}

/** Monta (sem agendar) o resumo diário com os jogos do dia. */
function planDailyDigests(matches: Match[], settings: Settings, now: Date): PlannedNotification[] {
  if (!settings.dailyDigest) return [];

  // Agrupa por dia local.
  const byDay = new Map<string, Match[]>();
  for (const m of matches) {
    const key = localDayKey(kickoff(m));
    const arr = byDay.get(key) ?? [];
    arr.push(m);
    byDay.set(key, arr);
  }

  const out: PlannedNotification[] = [];
  for (const [, dayMatches] of byDay) {
    const first = kickoff(dayMatches[0]);
    const fireAt = new Date(first.getFullYear(), first.getMonth(), first.getDate(), settings.dailyDigestHour, 0, 0, 0);
    if (fireAt <= now) continue;

    // Só lista jogos que ainda não começaram no horário do resumo (evita
    // "tem jogo hoje" para uma partida que já rolou de madrugada).
    const upcoming = dayMatches
      .filter((m) => kickoff(m) >= fireAt)
      .sort((a, b) => a.utc.localeCompare(b.utc));
    if (upcoming.length === 0) continue;

    const lines = upcoming.map((m) => `${formatTime(kickoff(m))}  ${matchLabel(m)}`);
    const count = upcoming.length;
    out.push({
      date: fireAt,
      title: count === 1 ? '📅 Tem jogo hoje!' : `📅 ${count} jogos hoje!`,
      body: lines.join('\n'),
      data: { type: 'daily-digest' },
    });
  }
  return out;
}

function byDateAsc(a: PlannedNotification, b: PlannedNotification) {
  return a.date.getTime() - b.date.getTime();
}

/**
 * Reagenda TODAS as notificações a partir da lista de jogos ATUAL (já com os
 * horários ao vivo), filtrando pelas seleções marcadas e ignorando jogos
 * encerrados. Cancela o que havia antes. Deve ser chamada na abertura do app
 * (além de quando muda seleção/preferência) para "rolar a janela" de 60 slots.
 *
 * Orçamento: reserva até MAX_DIGESTS resumos diários (os mais próximos) e
 * preenche o resto com os avisos de "jogo começando" mais próximos — assim
 * marcar muitas seleções não engole todos os resumos nem corta o futuro em
 * silêncio (a cada abertura a janela avança).
 *
 * "Latest wins": se uma chamada mais nova começar, esta aborta sem deixar a
 * agenda pela metade. Retorna quantas ficaram agendadas (ou -1 se abortada).
 */
export async function rescheduleAll(
  allMatches: Match[],
  teamIds: string[],
  settings: Settings,
): Promise<number> {
  const my = ++scheduleSeq;

  await ensureAndroidChannel();
  await Notifications.cancelAllScheduledNotificationsAsync();
  if (my !== scheduleSeq) return -1; // superada por uma chamada mais nova

  const now = new Date();
  const matches = filterByTeams(allMatches, teamIds).filter((m) => !isFinished(m));

  const digests = planDailyDigests(matches, settings, now).sort(byDateAsc).slice(0, MAX_DIGESTS);
  const remaining = Math.max(0, MAX_PENDING - digests.length);
  const matchStarts = planMatchStartNotifications(matches, settings, now)
    .sort(byDateAsc)
    .slice(0, remaining);

  const planned = [...digests, ...matchStarts].sort(byDateAsc);

  for (const p of planned) {
    if (my !== scheduleSeq) return -1; // outra chamada assumiu — para aqui
    await Notifications.scheduleNotificationAsync({
      content: { title: p.title, body: p.body, data: p.data, sound: 'default' },
      trigger: {
        type: Notifications.SchedulableTriggerInputTypes.DATE,
        date: p.date,
        channelId: ANDROID_CHANNEL,
      },
    });
  }

  return planned.length;
}

/** Quantas notificações estão agendadas no momento. */
export async function countScheduled(): Promise<number> {
  const list = await Notifications.getAllScheduledNotificationsAsync();
  return list.length;
}

/**
 * Obtém o Expo Push Token do dispositivo (necessário para push remoto).
 * Retorna null em simulador, emulador ou se a permissão foi negada.
 * Requer projectId do app (configurado no app.json via expo-constants).
 */
export async function getExpoPushToken(): Promise<string | null> {
  if (!Device.isDevice) return null; // Simulador/emulador não tem token real

  const { status } = await Notifications.getPermissionsAsync();
  if (status !== 'granted') return null;

  try {
    const projectId =
      Constants.expoConfig?.extra?.eas?.projectId ??
      Constants.easConfig?.projectId;
    if (!projectId) return null;

    const tokenData = await Notifications.getExpoPushTokenAsync({ projectId });
    return tokenData.data;
  } catch {
    return null;
  }
}

/** Dispara um teste imediato para o usuário ver como fica. */
export async function sendTestNotification() {
  await ensureAndroidChannel();
  await Notifications.scheduleNotificationAsync({
    content: {
      title: '✅ Notificações ativas',
      body: 'Você vai receber os avisos das suas seleções aqui.',
      sound: 'default',
    },
    trigger: {
      type: Notifications.SchedulableTriggerInputTypes.TIME_INTERVAL,
      seconds: 2,
      channelId: ANDROID_CHANNEL,
    },
  });
}

/**
 * DIAGNÓSTICO (temporário): tenta obter o token de push remoto e devolve o
 * resultado em texto — token OK ou a mensagem de erro exata. Usado para
 * descobrir por que o registro de push falha (getExpoPushTokenAsync engole o
 * erro no fluxo normal). Remover depois de diagnosticar.
 */
export async function getPushDiagnostic(): Promise<string> {
  if (!Device.isDevice) return 'Não é um aparelho físico (simulador).';
  const { status } = await Notifications.getPermissionsAsync();
  if (status !== 'granted') return `Permissão não concedida (status: ${status}).`;
  const projectId =
    Constants.expoConfig?.extra?.eas?.projectId ?? Constants.easConfig?.projectId;
  if (!projectId) return 'projectId ausente no app.json.';

  let token: string;
  try {
    const t = await Notifications.getExpoPushTokenAsync({ projectId });
    token = t.data;
  } catch (e) {
    return `ERRO ao obter token de push:\n${e instanceof Error ? e.message : String(e)}`;
  }

  // Testa o registro no servidor PONTA A PONTA (mesmo caminho corrigido).
  try {
    const ctrl = new AbortController();
    setTimeout(() => ctrl.abort(), 10_000);
    const res = await fetch(`${SERVER_URL}/api/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ token, mode: 'all', teams: [], matches: [] }),
      signal: ctrl.signal,
    });
    const text = await res.text();
    return `TOKEN OK ✅\nRegistro no servidor: HTTP ${res.status}\n${text}`;
  } catch (e) {
    return `TOKEN OK, mas FALHOU ao registrar:\n${e instanceof Error ? e.message : String(e)}`;
  }
}
