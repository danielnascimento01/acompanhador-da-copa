/** Expo Push Notifications API helper. */

const EXPO_PUSH_URL = 'https://exp.host/--/api/v2/push/send';

export type PushMessage = {
  to: string | string[];
  title: string;
  body: string;
  data?: Record<string, unknown>;
  sound?: 'default' | null;
  badge?: number;
  priority?: 'default' | 'normal' | 'high';
  /** Canal Android — DEVE bater com ANDROID_CHANNEL ('jogos') do cliente, senão
   * o gol cai no canal Default e perde heads-up/som/vibração de alta prioridade. */
  channelId?: string;
};

type ExpoPushTicket = {
  status: 'ok' | 'error';
  id?: string;
  message?: string;
  details?: { error?: string };
};

/**
 * Envia push notifications via Expo Push API.
 * Tokens inválidos são retornados para remoção da lista.
 * Faz chunking de 100 tokens por request (limite do Expo).
 */
export async function sendPush(
  tokens: string[],
  message: Omit<PushMessage, 'to'>,
  expoAccessToken?: string,
): Promise<{ invalidTokens: string[] }> {
  if (tokens.length === 0) return { invalidTokens: [] };

  const invalidTokens: string[] = [];
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    'Accept': 'application/json',
    'Accept-Encoding': 'gzip, deflate',
  };
  if (expoAccessToken) headers['Authorization'] = `Bearer ${expoAccessToken}`;

  // Chunking: máx 100 tokens por chamada
  for (let i = 0; i < tokens.length; i += 100) {
    const chunk = tokens.slice(i, i + 100);
    const messages: PushMessage[] = chunk.map((to) => ({
      to,
      sound: 'default',
      priority: 'high',
      channelId: 'jogos', // este servidor só envia push de GOL → canal de alta prioridade
      ...message,
    }));

    try {
      const res = await fetch(EXPO_PUSH_URL, {
        method: 'POST',
        headers,
        body: JSON.stringify(messages),
      });
      if (!res.ok) {
        // Expo recusou o chunk (429 rate-limit, 400 payload, 5xx). Loga p/ wrangler tail.
        let detail = '';
        try { detail = (await res.text()).slice(0, 500); } catch { /* corpo ilegível */ }
        console.error('sendPush: Expo respondeu não-2xx', { status: res.status, chunk: chunk.length, detail });
        continue;
      }

      const json = await res.json() as { data?: ExpoPushTicket[] };
      const tickets = json.data ?? [];
      let okCount = 0;
      let errCount = 0;
      tickets.forEach((ticket, idx) => {
        if (ticket.status === 'error') {
          errCount++;
          if (ticket.details?.error === 'DeviceNotRegistered') {
            invalidTokens.push(chunk[idx]);
          } else {
            console.error('sendPush: ticket de erro', { error: ticket.details?.error, message: ticket.message });
          }
        } else {
          okCount++;
        }
      });
      console.log('sendPush: chunk enviado', { status: res.status, chunk: chunk.length, ok: okCount, err: errCount });
    } catch (err) {
      // Falha de rede no edge — loga e tenta o próximo chunk.
      console.error('sendPush: fetch falhou', { chunk: chunk.length, err: String(err) });
    }
  }

  return { invalidTokens };
}
