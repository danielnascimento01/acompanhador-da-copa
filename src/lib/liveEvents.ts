/**
 * Lance a lance ao vivo via API pública da ESPN (gratuita, sem chave).
 * Endpoint: site.api.espn.com/.../soccer/fifa.world/scoreboard?dates=YYYYMMDD
 *
 * ⚠️ API NÃO-OFICIAL (a mesma que o site/app da ESPN usa). Estável há anos, mas
 * pode mudar sem aviso — tudo aqui é defensivo (try/catch, campos opcionais) e,
 * se quebrar, o componente simplesmente não mostra nada (não derruba a tela).
 */
import type { Match } from '../data/fixtures';

const BASE = 'https://site.api.espn.com/apis/site/v2/sports/soccer/fifa.world/scoreboard';

export type LiveEventType = 'goal' | 'own-goal' | 'yellow' | 'red';
export type TimelineEvent = {
  minute: string; // "9'", "45+2'"
  type: LiveEventType;
  player: string;
  side: 'home' | 'away'; // relativo ao NOSSO mando (match.home/away)
  penalty: boolean;
};
export type LiveTimeline = {
  state: 'pre' | 'in' | 'post';
  clock: string | null; // "24'" quando ao vivo
  halftime: boolean; // jogo parado no intervalo
  homeScore: number | null;
  awayScore: number | null;
  events: TimelineEvent[];
};

/** Normaliza nome de time: minúsculo, sem acento/pontuação/espaço.
 * (o normalize('NFD') separa o acento da letra; o [^a-z] no fim remove o acento) */
function norm(s: string): string {
  return (s || '').toLowerCase().normalize('NFD').replace(/[^a-z]/g, '');
}

/** Apelidos ESPN → nosso id (quando os nomes diferem). Chave e valor já normalizados. */
const ALIAS: Record<string, string> = {
  czechia: 'czechrepublic',
  unitedstates: 'usa',
  bosniaandherzegovina: 'bosniaherzegovina',
  turkiye: 'turkey',
  cotedivoire: 'ivorycoast',
  iriran: 'iran',
  korearepublic: 'southkorea',
};

export function teamMatches(espnName: string, ourId: string): boolean {
  const a = norm(espnName);
  const b = norm(ourId);
  return a === b || ALIAS[a] === b || ALIAS[b] === a;
}

export function yyyymmdd(d: Date): string {
  return `${d.getUTCFullYear()}${String(d.getUTCMonth() + 1).padStart(2, '0')}${String(d.getUTCDate()).padStart(2, '0')}`;
}

function toNum(v: unknown): number | null {
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
}

function classify(d: any): LiveEventType | null {
  const t = String(d?.type?.text || '').toLowerCase();
  if (d?.ownGoal) return 'own-goal';
  if (d?.scoringPlay || t.includes('goal')) return 'goal';
  if (t.includes('red')) return 'red';
  if (t.includes('yellow')) return 'yellow';
  return null; // ignora substituições, VAR, etc.
}

/** Minuto numérico p/ ordenar ("45+2'" → 45). */
export function minuteNum(m: string): number {
  const n = parseInt(m, 10);
  return Number.isNaN(n) ? 999 : n;
}

/** Lê o status/placar do nó de status da ESPN (mesma regra do fetchTimeline). */
function readStatus(ev: any): { state: 'pre' | 'in' | 'post'; halftime: boolean } {
  const stype = ev?.status?.type ?? {};
  const state: 'pre' | 'in' | 'post' =
    stype.state === 'in' ? 'in' : stype.completed ? 'post' : 'pre';
  const halftime =
    String(stype.name || '').toUpperCase().includes('HALFTIME') ||
    /half\s*time|intervalo/i.test(String(stype.description || stype.shortDetail || ''));
  return { state, halftime: state === 'in' && halftime };
}

/** Eventos crus do scoreboard de UM dia (YYYYMMDD). Rede falha → []. */
async function fetchRawDay(date: string, timeoutMs = 8000): Promise<any[]> {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), timeoutMs);
  try {
    const res = await fetch(`${BASE}?dates=${date}`, { signal: ctrl.signal });
    const json = await res.json();
    return Array.isArray(json?.events) ? json.events : [];
  } catch {
    return [];
  } finally {
    clearTimeout(timer);
  }
}

/**
 * A ESPN agrupa os jogos por dia no fuso ET (UTC-4/-5), então um jogo de
 * madrugada UTC cai no dia ANTERIOR no índice deles. Como ET é sempre ≤ UTC,
 * a data UTC + a anterior cobrem qualquer jogo, sem depender de Intl/timezone
 * (que o Hermes não suporta de forma confiável).
 */
export function espnDatesFor(utc: string): string[] {
  const d = new Date(utc);
  return [yyyymmdd(d), yyyymmdd(new Date(d.getTime() - 86400000))];
}

/** Um jogo do scoreboard da ESPN, já com mando e placar resolvidos. */
export type EspnMatch = {
  homeName: string;
  awayName: string;
  state: 'pre' | 'in' | 'post';
  halftime: boolean;
  homeScore: number | null;
  awayScore: number | null;
};

/**
 * Lê o scoreboard de UM dia (YYYYMMDD) e devolve todos os jogos daquela data.
 * Um único request cobre todos os jogos do dia — é o que alimenta a
 * reconciliação de status/placar de toda a lista. Falha de rede → lista vazia.
 */
export async function fetchEspnDay(date: string, timeoutMs = 8000): Promise<EspnMatch[]> {
  const events = await fetchRawDay(date, timeoutMs);
  const out: EspnMatch[] = [];
  for (const ev of events) {
    const comps: any[] = ev?.competitions?.[0]?.competitors ?? [];
    const homeC = comps.find((c) => c.homeAway === 'home');
    const awayC = comps.find((c) => c.homeAway === 'away');
    const homeName = homeC?.team?.displayName;
    const awayName = awayC?.team?.displayName;
    if (!homeName || !awayName) continue;
    const { state, halftime } = readStatus(ev);
    out.push({
      homeName,
      awayName,
      state,
      halftime,
      homeScore: toNum(homeC?.score),
      awayScore: toNum(awayC?.score),
    });
  }
  return out;
}

/**
 * Busca o lance a lance de um jogo. Retorna `null` se não achar o jogo na ESPN
 * ou se a rede falhar. Só faz sentido chamar p/ jogos que já começaram.
 */
export async function fetchTimeline(match: Match, timeoutMs = 8000): Promise<LiveTimeline | null> {
  try {
    // Busca a data UTC + a anterior (cobre o fuso ET da ESPN) e junta os jogos.
    const days = await Promise.all(espnDatesFor(match.utc).map((d) => fetchRawDay(d, timeoutMs)));
    const events: any[] = days.flat();

    const ev = events.find((e) => {
      const comps = e?.competitions?.[0]?.competitors ?? [];
      const h = comps.find((c: any) => c.homeAway === 'home')?.team?.displayName;
      const a = comps.find((c: any) => c.homeAway === 'away')?.team?.displayName;
      if (!h || !a) return false;
      // aceita os dois sentidos (mando pode vir invertido vs o nosso dataset)
      return (
        (teamMatches(h, match.home) && teamMatches(a, match.away)) ||
        (teamMatches(h, match.away) && teamMatches(a, match.home))
      );
    });
    if (!ev) return null;

    const comp = ev.competitions[0];
    const comps: any[] = comp.competitors ?? [];
    const homeC = comps.find((c) => c.homeAway === 'home');
    const awayC = comps.find((c) => c.homeAway === 'away');
    const homeIsOurHome = teamMatches(homeC?.team?.displayName || '', match.home);

    const sideFor = (teamId: string): 'home' | 'away' => {
      if (teamId === homeC?.team?.id) return homeIsOurHome ? 'home' : 'away';
      return homeIsOurHome ? 'away' : 'home';
    };

    const details: any[] = Array.isArray(comp.details) ? comp.details : [];
    const tEvents: TimelineEvent[] = details
      .map((d) => {
        const type = classify(d);
        if (!type) return null;
        return {
          minute: String(d?.clock?.displayValue || ''),
          type,
          player: String(d?.athletesInvolved?.[0]?.displayName || ''),
          side: sideFor(String(d?.team?.id || '')),
          penalty: !!d?.penaltyKick,
        } as TimelineEvent;
      })
      .filter((e): e is TimelineEvent => !!e && !!e.player)
      .sort((a, b) => minuteNum(a.minute) - minuteNum(b.minute));

    // Intervalo: a ESPN mantém state="in" mas marca o status como Halftime.
    const { state, halftime } = readStatus(ev);

    return {
      state,
      clock: state === 'in' ? String(ev?.status?.displayClock || '') || null : null,
      halftime,
      homeScore: homeIsOurHome ? toNum(homeC?.score) : toNum(awayC?.score),
      awayScore: homeIsOurHome ? toNum(awayC?.score) : toNum(homeC?.score),
      events: tEvents,
    };
  } catch {
    return null;
  }
}
