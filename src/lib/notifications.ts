import * as Notifications from 'expo-notifications';
import Constants from 'expo-constants';
import * as Device from 'expo-device';
import { Platform } from 'react-native';

import { Match } from '../data/fixtures';
import { Settings } from './storage';
import { planAll } from './notificationPlan';

// iOS limita o número de notificações locais pendentes a 64. Deixamos folga.
const MAX_PENDING = 60;
// Reservamos uma fatia para o resumo diário, para que muitas seleções não
// engulam todos os slots com avisos de "jogo começando" e sumam com os resumos.
const MAX_DIGESTS = 16;
const ANDROID_CHANNEL = 'jogos';

// Serializa cancelamento+agendamento. Esse bloco precisa ser atômico: se duas
// chamadas intercalarem, a antiga pode cancelar a agenda recém-criada pela nova.
let scheduleQueue: Promise<unknown> = Promise.resolve();

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
 * As chamadas são serializadas: cada cancelamento+agendamento termina antes do
 * próximo começar. Retorna quantas ficaram agendadas.
 */
export async function rescheduleAll(
  allMatches: Match[],
  teamIds: string[],
  settings: Settings,
): Promise<number> {
  const job = scheduleQueue.then(() => runRescheduleAll(allMatches, teamIds, settings));
  scheduleQueue = job.catch(() => {});
  return job;
}

async function runRescheduleAll(
  allMatches: Match[],
  teamIds: string[],
  settings: Settings,
): Promise<number> {
  await ensureAndroidChannel();
  await Notifications.cancelAllScheduledNotificationsAsync();

  const now = new Date();
  const planned = planAll(allMatches, teamIds, settings, now, MAX_DIGESTS, MAX_PENDING);

  for (const p of planned) {
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
