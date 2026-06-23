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
      ...message,
    }));

    try {
      const res = await fetch(EXPO_PUSH_URL, {
        method: 'POST',
        headers,
        body: JSON.stringify(messages),
      });
      if (!res.ok) continue;

      const json = await res.json() as { data?: ExpoPushTicket[] };
      const tickets = json.data ?? [];
      tickets.forEach((ticket, idx) => {
        if (ticket.status === 'error' && ticket.details?.error === 'DeviceNotRegistered') {
          invalidTokens.push(chunk[idx]);
        }
      });
    } catch {
      // Falha de rede — tenta o próximo chunk
    }
  }

  return { invalidTokens };
}
