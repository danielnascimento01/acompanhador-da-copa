import { extractScore, type ESPNEvent } from './espn';

export type MatchAlertKind = 'delayed' | 'postponed' | 'suspended' | 'time_changed' | 'started';

export type MatchAlertState = {
  kind?: MatchAlertKind;
  signature?: string;
  kickoff?: string;
};

export type MatchAlertCandidate = {
  eventId: string;
  kind: MatchAlertKind;
  signature: string;
  homeTeam: string;
  awayTeam: string;
  detail?: string;
  currentStart?: string;
  previousStart?: string;
};

export type MatchAlertDecision = {
  candidate?: MatchAlertCandidate;
  nextState: MatchAlertState;
};

export function parseMatchAlertState(raw: string | null): MatchAlertState | null {
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw) as MatchAlertState;
    if (!parsed || typeof parsed !== 'object') return null;
    return {
      kind: isMatchAlertKind(parsed.kind) ? parsed.kind : undefined,
      signature: typeof parsed.signature === 'string' ? parsed.signature : undefined,
      kickoff: typeof parsed.kickoff === 'string' ? parsed.kickoff : undefined,
    };
  } catch {
    return null;
  }
}

export function evaluateMatchAlert(
  event: ESPNEvent,
  previous: MatchAlertState | null,
): MatchAlertDecision {
  const { homeTeam, awayTeam } = extractScore(event);
  const kickoff = canonicalDate(event.competitions[0]?.startDate ?? event.competitions[0]?.date ?? event.date);
  const statusHit = detectStatusAlert(event);
  const previousKickoff = previous?.kickoff;
  const state = event.status.type.state;
  const kickoffChanged =
    state === 'pre' &&
    !!previousKickoff &&
    !!kickoff &&
    Math.abs(Date.parse(previousKickoff) - Date.parse(kickoff)) > 60_000;

  const kind = statusHit?.kind ?? (kickoffChanged ? 'time_changed' : undefined);
  const detail = statusHit?.detail;
  const signature = kind ? buildSignature(event.id, kind, kickoff, detail) : undefined;
  const candidate =
    kind && signature
      ? {
          eventId: event.id,
          kind,
          signature,
          homeTeam,
          awayTeam,
          detail,
          currentStart: kickoff,
          previousStart: kickoffChanged ? previousKickoff : undefined,
        }
      : undefined;

  return {
    candidate,
    nextState: {
      kind,
      signature,
      kickoff: kickoff ?? previousKickoff,
    },
  };
}

function detectStatusAlert(event: ESPNEvent): { kind: MatchAlertKind; detail?: string } | null {
  const comp = event.competitions[0];
  const texts = collectAlertTexts(event);
  if (comp?.wasSuspended) return { kind: 'suspended', detail: firstUsefulText(texts) ?? 'Partida suspensa pela ESPN.' };

  const joined = texts.join(' | ');
  const normalized = normalize(joined);
  if (!normalized) return null;

  const checks: Array<{ kind: MatchAlertKind; re: RegExp }> = [
    { kind: 'suspended', re: /status[_ ]?suspended|suspended|suspens|interrompid|paralisad/ },
    { kind: 'postponed', re: /status[_ ]?postponed|postponed|adiad|remarcad/ },
    { kind: 'delayed', re: /status[_ ]?delayed|weather delay|delayed|delay|atrasad|lightning|thunderstorm|storm|tempestade|clima/ },
  ];

  for (const check of checks) {
    if (check.re.test(normalized)) {
      return { kind: check.kind, detail: firstMatchingText(texts, check.re) ?? firstUsefulText(texts) };
    }
  }
  return null;
}

function collectAlertTexts(event: ESPNEvent): string[] {
  const comp = event.competitions[0];
  const statusValues = [
    event.status.type.name,
    event.status.type.description,
    event.status.type.detail,
    event.status.type.shortDetail,
    comp?.status?.type?.name,
    comp?.status?.type?.description,
    comp?.status?.type?.detail,
    comp?.status?.type?.shortDetail,
  ];
  const notes = (comp?.notes ?? []).flatMap((n) => [
    n.type,
    n.headline,
    n.text,
    n.detail,
    n.shortDetail,
    n.description,
  ]);
  const headlines = [...(event.headlines ?? []), ...(comp?.headlines ?? [])].flatMap((h) => [
    h.headline,
    h.shortLinkText,
    h.description,
  ]);
  return [...statusValues, ...notes, ...headlines].filter((v): v is string => typeof v === 'string' && v.trim().length > 0);
}

function firstUsefulText(texts: string[]): string | undefined {
  return texts.find((t) => normalize(t) !== 'pre' && normalize(t) !== 'scheduled');
}

function firstMatchingText(texts: string[], re: RegExp): string | undefined {
  return texts.find((t) => re.test(normalize(t)));
}

function buildSignature(eventId: string, kind: MatchAlertKind, kickoff?: string, detail?: string): string {
  return [eventId, kind, kickoff ?? '', normalize(detail ?? '').slice(0, 160)].join(':');
}

function canonicalDate(value?: string): string | undefined {
  if (!value) return undefined;
  const ms = Date.parse(value);
  return Number.isFinite(ms) ? new Date(ms).toISOString() : value;
}

function normalize(value: string): string {
  return value
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

function isMatchAlertKind(value: unknown): value is MatchAlertKind {
  return value === 'delayed' || value === 'postponed' || value === 'suspended' || value === 'time_changed' || value === 'started';
}
