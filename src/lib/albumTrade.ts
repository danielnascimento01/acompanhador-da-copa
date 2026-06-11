/**
 * Lógica de TROCA do álbum (100% local, sem backend) — o diferencial grátis.
 *
 * Dois formatos de texto, ambos coláveis no WhatsApp:
 *  - "troca": lista legível de repetidas + faltantes (pra combinar troca com amigo).
 *  - "backup": código compacto com a coleção inteira (qty exata) pra salvar/restaurar.
 */
import {
  ALL_CODES,
  duplicateCodes,
  missingCodes,
  normalizeCode,
  type AlbumCollection,
} from '../data/stickers';

const TRADE_HEADER = '🃏 Minha troca da Copa 2026';
const TRADE_FOOTER = '— via Acompanhador da Copa';
const BACKUP_PREFIX = 'ACB1';

/** Códigos únicos de repetidas (sem repetir o mesmo code). */
function uniqueDuplicates(col: AlbumCollection): string[] {
  return [...new Set(duplicateCodes(col))];
}

/** Texto de troca legível: repetidas (o que ofereço) + faltantes (o que preciso). */
export function buildTradeText(col: AlbumCollection): string {
  const dupes = uniqueDuplicates(col);
  const missing = missingCodes(col);
  return [
    TRADE_HEADER,
    `✅ Tenho repetidas (${dupes.length}): ${dupes.join(', ') || '—'}`,
    `🎯 Me faltam (${missing.length}): ${missing.join(', ') || '—'}`,
    TRADE_FOOTER,
  ].join('\n');
}

export type ParsedTrade = { duplicates: string[]; missing: string[] };

/**
 * Lê o texto de troca de um amigo. Procura as linhas de "repetidas" e "faltam"
 * (tolerante a emoji/acentos/maiúsculas) e extrai os códigos válidos de cada uma.
 */
export function parseTradeText(text: string): ParsedTrade {
  const out: ParsedTrade = { duplicates: [], missing: [] };
  for (const line of text.split(/\r?\n/)) {
    const lower = line.toLowerCase();
    const isDup = lower.includes('repetid');
    const isMiss = lower.includes('falt');
    if (!isDup && !isMiss) continue;
    // Pega só a parte depois dos dois-pontos (se houver) e extrai os códigos.
    const body = line.includes(':') ? line.slice(line.indexOf(':') + 1) : line;
    const codes = extractCodes(body);
    if (isDup) out.duplicates.push(...codes);
    else if (isMiss) out.missing.push(...codes);
  }
  out.duplicates = [...new Set(out.duplicates)];
  out.missing = [...new Set(out.missing)];
  return out;
}

/** Extrai códigos válidos de um trecho livre (separados por vírgula/espaço). */
function extractCodes(text: string): string[] {
  const tokens = text.split(/[,\s]+/).filter(Boolean);
  const codes: string[] = [];
  for (const t of tokens) {
    const c = normalizeCode(t);
    if (c) codes.push(c);
  }
  return codes;
}

export type TradeMatch = { iGive: string[]; iReceive: string[] };

/**
 * Cruza a minha coleção com a troca de um amigo:
 *  - iGive    = minhas repetidas que ele precisa.
 *  - iReceive = repetidas dele que eu preciso.
 */
export function computeMatches(myCol: AlbumCollection, friend: ParsedTrade): TradeMatch {
  const myDupes = new Set(uniqueDuplicates(myCol));
  const myMissing = new Set(missingCodes(myCol));
  const friendMissing = new Set(friend.missing);
  const friendDupes = new Set(friend.duplicates);

  const iGive = [...myDupes].filter((c) => friendMissing.has(c)).sort(codeSort);
  const iReceive = [...friendDupes].filter((c) => myMissing.has(c)).sort(codeSort);
  return { iGive, iReceive };
}

/** Ordena códigos por prefixo e depois número (BRA2 antes de BRA10). */
export function codeSort(a: string, b: string): number {
  const pa = a.replace(/\d+$/, '');
  const pb = b.replace(/\d+$/, '');
  if (pa !== pb) return pa.localeCompare(pb);
  return (parseInt(a.replace(/^\D+/, ''), 10) || 0) - (parseInt(b.replace(/^\D+/, ''), 10) || 0);
}

/** Código de backup compacto da coleção inteira (qty exata). Hermes-safe (sem base64). */
export function exportCollection(col: AlbumCollection): string {
  const parts = Object.entries(col)
    .filter(([, q]) => q >= 1)
    .map(([code, q]) => `${code}:${q}`);
  return [BACKUP_PREFIX, ...parts].join('|');
}

/** Lê um código de backup. Retorna `null` se o formato for inválido. */
export function importCollection(code: string): AlbumCollection | null {
  const trimmed = code.trim();
  const parts = trimmed.split('|');
  if (parts[0] !== BACKUP_PREFIX) return null;
  const out: AlbumCollection = {};
  for (const p of parts.slice(1)) {
    const [c, qRaw] = p.split(':');
    const code2 = normalizeCode(c);
    const q = parseInt(qRaw, 10);
    if (code2 && ALL_CODES.has(code2) && Number.isInteger(q) && q >= 1) {
      out[code2] = q;
    }
  }
  return out;
}
