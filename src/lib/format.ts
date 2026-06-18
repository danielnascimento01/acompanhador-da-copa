/** Formatação de datas/horas em português, sempre no fuso do aparelho. */

const dayFmt = new Intl.DateTimeFormat('pt-BR', {
  weekday: 'long',
  day: '2-digit',
  month: 'long',
});

const shortDayFmt = new Intl.DateTimeFormat('pt-BR', {
  weekday: 'short',
  day: '2-digit',
  month: '2-digit',
});

const timeFmt = new Intl.DateTimeFormat('pt-BR', {
  hour: '2-digit',
  minute: '2-digit',
});

function cap(s: string): string {
  return s.charAt(0).toUpperCase() + s.slice(1);
}

/** Ex.: "Quinta-feira, 11 de junho". */
export function formatDayLong(d: Date): string {
  return cap(dayFmt.format(d));
}

/** Ex.: "qui., 11/06". */
export function formatDayShort(d: Date): string {
  return cap(shortDayFmt.format(d));
}

/** Ex.: "16:00". */
export function formatTime(d: Date): string {
  return timeFmt.format(d);
}

/** Chave do dia local (YYYY-MM-DD no fuso do aparelho), para agrupar jogos. */
export function localDayKey(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

export function isSameLocalDay(a: Date, b: Date): boolean {
  return localDayKey(a) === localDayKey(b);
}

/** Jogo de madrugada no fuso do aparelho (00h–05h59) — bom p/ avisar o torcedor. */
export function isLateNight(d: Date): boolean {
  return d.getHours() >= 0 && d.getHours() < 6;
}

/** "hoje" / "amanhã" / "em 3 dias" / "Quinta-feira, 11 de junho". */
export function relativeDayLabel(d: Date, now: Date = new Date()): string {
  const a = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const b = new Date(d.getFullYear(), d.getMonth(), d.getDate());
  const diffDays = Math.round((b.getTime() - a.getTime()) / 86400000);
  if (diffDays === 0) return 'Hoje';
  if (diffDays === 1) return 'Amanhã';
  if (diffDays === -1) return 'Ontem';
  return formatDayLong(d);
}
