/**
 * Testes da detecção de alertas operacionais da ESPN.
 * Rodar: npx tsx src/matchAlerts.test.ts
 */
import { evaluateMatchAlert, parseMatchAlertState, type MatchAlertState } from './matchAlerts';
import type { ESPNEvent } from './espn';

let pass = 0;
let fail = 0;

function check(label: string, got: unknown, want: unknown) {
  if (JSON.stringify(got) === JSON.stringify(want)) {
    pass++;
    console.log(`✅ ${label}`);
  } else {
    fail++;
    console.log(`❌ ${label} — esperava ${JSON.stringify(want)}, veio ${JSON.stringify(got)}`);
  }
}

function ev(overrides: Partial<ESPNEvent> = {}): ESPNEvent {
  return {
    id: 'm1',
    name: 'Mexico vs Ecuador',
    date: '2026-07-01T01:00Z',
    status: { type: { state: 'pre', name: 'STATUS_SCHEDULED', description: 'Scheduled' } },
    competitions: [
      {
        startDate: '2026-07-01T01:00Z',
        wasSuspended: false,
        competitors: [
          { homeAway: 'home', score: '0', team: { id: 'mex', displayName: 'Mexico', abbreviation: 'MEX' } },
          { homeAway: 'away', score: '0', team: { id: 'ecu', displayName: 'Ecuador', abbreviation: 'ECU' } },
        ],
      },
    ],
    ...overrides,
  };
}

function withState(state: MatchAlertState | null): MatchAlertState | null {
  return parseMatchAlertState(state ? JSON.stringify(state) : null);
}

const firstScheduled = evaluateMatchAlert(ev(), null);
check('primeiro jogo agendado só grava horário', firstScheduled.candidate, undefined);
check('primeiro estado guarda kickoff', firstScheduled.nextState.kickoff, '2026-07-01T01:00:00.000Z');

const delayed = evaluateMatchAlert(
  ev({ status: { type: { state: 'pre', name: 'STATUS_DELAYED', detail: 'Weather Delay' } } }),
  withState(firstScheduled.nextState),
);
check('status delayed gera alerta', delayed.candidate?.kind, 'delayed');
check('delayed inclui seleções', [delayed.candidate?.homeTeam, delayed.candidate?.awayTeam], ['Mexico', 'Ecuador']);

const repeated = evaluateMatchAlert(
  ev({ status: { type: { state: 'pre', name: 'STATUS_DELAYED', detail: 'Weather Delay' } } }),
  withState(delayed.nextState),
);
check('mesma assinatura continua igual para dedup', repeated.candidate?.signature, delayed.nextState.signature);

const changedTime = evaluateMatchAlert(
  ev({
    date: '2026-07-01T02:15Z',
    competitions: [
      {
        startDate: '2026-07-01T02:15Z',
        competitors: [
          { homeAway: 'home', score: '0', team: { id: 'mex', displayName: 'Mexico', abbreviation: 'MEX' } },
          { homeAway: 'away', score: '0', team: { id: 'ecu', displayName: 'Ecuador', abbreviation: 'ECU' } },
        ],
      },
    ],
  }),
  withState(firstScheduled.nextState),
);
check('mudança de horário gera alerta', changedTime.candidate?.kind, 'time_changed');
check('mudança de horário preserva horário anterior', changedTime.candidate?.previousStart, '2026-07-01T01:00:00.000Z');

const suspended = evaluateMatchAlert(
  ev({ competitions: [{ ...ev().competitions[0], wasSuspended: true }] }),
  withState(firstScheduled.nextState),
);
check('wasSuspended gera alerta', suspended.candidate?.kind, 'suspended');

console.log(`\n${pass} passaram, ${fail} falharam`);
if (fail > 0) throw new Error(`${fail} teste(s) de alertas de partida falharam`);
