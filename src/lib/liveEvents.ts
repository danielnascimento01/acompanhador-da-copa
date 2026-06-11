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

function teamMatches(espnName: string, ourId: string): boolean {
  const a = norm(espnName);
  const b = norm(ourId);
  return a === b || ALIAS[a] === b || ALIAS[b] === a;
}

function yyyymmdd(d: Date): string {
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

/**
 * Busca o lance a lance de um jogo. Retorna `null` se não achar o jogo na ESPN
 * ou se a rede falhar. Só faz sentido chamar p/ jogos que já começaram.
 */
export async function fetchTimeline(match: Match, timeoutMs = 8000): Promise<LiveTimeline | null> {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), timeoutMs);
  try {
    const date = yyyymmdd(new Date(match.utc));
    const res = await fetch(`${BASE}?dates=${date}`, { signal: ctrl.signal });
    const json = await res.json();
    const events: any[] = Array.isArray(json?.events) ? json.events : [];

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

    const stype = ev?.status?.type ?? {};
    const state: LiveTimeline['state'] =
      stype.state === 'in' ? 'in' : stype.completed ? 'post' : 'pre';
    // Intervalo: a ESPN mantém state="in" mas marca o status como Halftime.
    const halftime =
      String(stype.name || '').toUpperCase().includes('HALFTIME') ||
      /half\s*time|intervalo/i.test(String(stype.description || stype.shortDetail || ''));

    return {
      state,
      clock: state === 'in' ? String(ev?.status?.displayClock || '') || null : null,
      halftime: state === 'in' && halftime,
      homeScore: homeIsOurHome ? toNum(homeC?.score) : toNum(awayC?.score),
      awayScore: homeIsOurHome ? toNum(awayC?.score) : toNum(homeC?.score),
      events: tEvents,
    };
  } catch {
    return null;
  } finally {
    clearTimeout(timer);
  }
}
