/**
 * Catálogo autoral do álbum de figurinhas das seleções 2026 (980 figurinhas,
 * conteúdo próprio). O dataset vem de assets/data/stickers.json, gerado por
 * scripts/build-stickers.mjs.
 * Estrutura: 20 especiais + 48 seleções × 20 (código do país + 1..20).
 *
 * A COLEÇÃO do usuário (quantas ele tem de cada) é `AlbumCollection`, persistida à parte.
 * code -> quantidade: 0/ausente = falta · 1 = tenho · >1 = tenho + (n-1) repetidas.
 */
import rawAlbum from '../../assets/data/stickers.json';

export type StickerDef = { code: string; shiny?: boolean; label?: string };

export type AlbumSection = {
  id: string;        // 'special:abertura' | 'team:Brazil'
  title: string;     // 'Abertura' | 'Brasil'
  teamId?: string;   // liga à seleção (ids do teams.ts) quando for seção de time
  group?: string;    // grupo A..L (só seções de time)
  code?: string;     // prefixo FIFA do time (ex.: 'BRA')
  stickers: StickerDef[];
};

export type Album = {
  version: number;
  album: string;
  total: number;
  sections: AlbumSection[];
};

export const ALBUM = rawAlbum as Album;

/** Coleção do usuário: code -> quantidade possuída. */
export type AlbumCollection = Record<string, number>;

/** Teto de quantidade por figurinha (evita números absurdos vindos do disco/UI). */
export const MAX_STICKER_QTY = 99;

export type AlbumStats = {
  total: number;     // figurinhas distintas no álbum
  owned: number;     // distintas que o usuário já colou (qty >= 1)
  missing: number;   // distintas faltando (qty 0)
  duplicates: number;// total de repetidas (soma de max(qty-1, 0))
  percent: number;   // 0..100, coladas / total
};

const EMPTY_STATS: AlbumStats = { total: 0, owned: 0, missing: 0, duplicates: 0, percent: 0 };

/** Calcula progresso de uma lista de figurinhas para uma coleção. */
export function statsForStickers(stickers: StickerDef[], col: AlbumCollection): AlbumStats {
  let owned = 0;
  let duplicates = 0;
  for (const s of stickers) {
    const qty = col[s.code] ?? 0;
    if (qty >= 1) owned += 1;
    if (qty > 1) duplicates += qty - 1;
  }
  const total = stickers.length;
  return {
    total,
    owned,
    missing: total - owned,
    duplicates,
    percent: total === 0 ? 0 : Math.round((owned / total) * 100),
  };
}

/** Progresso do álbum inteiro. */
export function albumStats(col: AlbumCollection): AlbumStats {
  if (!col) return EMPTY_STATS;
  const all = ALBUM.sections.flatMap((s) => s.stickers);
  return statsForStickers(all, col);
}

/** Progresso por seção (na ordem do catálogo). */
export function sectionStats(section: AlbumSection, col: AlbumCollection): AlbumStats {
  return statsForStickers(section.stickers, col);
}

/** Conjunto de todos os códigos válidos do álbum (pra validar marcação rápida). */
export const ALL_CODES: ReadonlySet<string> = new Set(
  ALBUM.sections.flatMap((s) => s.stickers.map((st) => st.code)),
);

/**
 * Normaliza uma entrada de marcação rápida ("bra 5", "BRA5", "00") para um código
 * válido do álbum, ou `null` se não existir. Tira espaços e sobe pra maiúsculas.
 */
export function normalizeCode(input: string): string | null {
  const c = input.trim().toUpperCase().replace(/\s+/g, '');
  return ALL_CODES.has(c) ? c : null;
}

/** Códigos das figurinhas que faltam (qty 0), em todo o álbum. */
export function missingCodes(col: AlbumCollection): string[] {
  return ALBUM.sections.flatMap((s) => s.stickers).filter((s) => (col[s.code] ?? 0) === 0).map((s) => s.code);
}

/** Códigos das repetidas, repetidos pela quantidade extra (ex.: qty 3 → [code, code]). */
export function duplicateCodes(col: AlbumCollection): string[] {
  const out: string[] = [];
  for (const s of ALBUM.sections.flatMap((x) => x.stickers)) {
    const extra = (col[s.code] ?? 0) - 1;
    for (let i = 0; i < extra; i++) out.push(s.code);
  }
  return out;
}
