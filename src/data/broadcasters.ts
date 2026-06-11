/**
 * "Onde assistir" — canais que transmitem a Copa 2026 no Brasil.
 *
 * Data-driven e OTA-friendly: um default aplicado a todos os jogos + override por
 * jogo (quando soubermos a grade exata de cada partida). A CazéTV é o destaque
 * gratuito; o link dela cai no jogo ao vivo (busca no YouTube com os times).
 */
import { teamName } from './teams';
import type { Match } from './fixtures';

export type Broadcaster = {
  id: string;
  name: string;
  kind: 'youtube' | 'streaming' | 'tv';
  free: boolean;
  emoji: string;
  /** Link fixo (sites/apps). */
  url?: string;
  /** Se true, gera um link de busca do jogo ao vivo no YouTube (CazéTV). */
  search?: boolean;
};

/** Canais padrão da Copa no Brasil (CazéTV em 1º como recomendação gratuita). */
const DEFAULT_BR: Broadcaster[] = [
  { id: 'caze', name: 'CazéTV', kind: 'youtube', free: true, emoji: '▶️', search: true },
  { id: 'globo', name: 'TV Globo', kind: 'tv', free: true, emoji: '📺' },
  { id: 'sportv', name: 'SporTV', kind: 'tv', free: false, emoji: '📡', url: 'https://globoplay.globo.com' },
  { id: 'globoplay', name: 'Globoplay', kind: 'streaming', free: false, emoji: '🟣', url: 'https://globoplay.globo.com' },
  { id: 'disney', name: 'Disney+', kind: 'streaming', free: false, emoji: '🔵', url: 'https://www.disneyplus.com' },
];

/** Override por jogo (id do Match). Vazio por ora — dá pra preencher e publicar via OTA. */
const OVERRIDES: Record<string, Broadcaster[]> = {};

/** Lista de canais de um jogo (override específico ou o default do Brasil). */
export function broadcastersFor(match: Match): Broadcaster[] {
  return OVERRIDES[match.id] ?? DEFAULT_BR;
}

/** Link "assistir": fixo, ou busca do jogo ao vivo no YouTube (CazéTV). */
export function watchUrl(b: Broadcaster, match: Match): string | undefined {
  if (b.url) return b.url;
  if (b.search) {
    const q = encodeURIComponent(`${teamName(match.home)} x ${teamName(match.away)} ao vivo CazéTV`);
    return `https://www.youtube.com/results?search_query=${q}`;
  }
  return undefined;
}

export function kindLabel(kind: Broadcaster['kind']): string {
  if (kind === 'youtube') return 'YouTube';
  if (kind === 'streaming') return 'Streaming';
  return 'TV';
}
