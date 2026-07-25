import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { GameSessionState } from '@/data/types';
import {
  PERSISTENCE_VERSION,
  deserializeState,
  serializeState,
  type PersistedGameState,
} from '@/store/persistence';

const NOW = 1_700_000_000_000;
const END = NOW + 720_000;

function activeState(overrides: Partial<GameSessionState> = {}): GameSessionState {
  return {
    phase: 'active',
    activeView: 'call',
    score: 250,
    incorrectAttempts: 1,
    timerEndTimestamp: END,
    discoveredContradictions: new Set(['contra_daniel_access']),
    suspectPressure: { daniel: 30, elena: 0, roberto: 0, sofia: 0 },
    accusationUsed: false,
    activeCallSuspect: 'daniel',
    callSessionId: 'session-1',
    currentRequestId: 'request-1',
    callHistory: {
      daniel: [
        { role: 'player', text: '¿A qué hora llegaste?', timestamp: NOW - 5_000 },
        {
          role: 'suspect',
          text: 'Llegué a las 20:50.',
          timestamp: NOW - 4_000,
          statementId: 'stmt_daniel_arrival',
        },
      ],
      elena: [],
      roberto: [],
      sofia: [],
    },
    registeredStatements: new Set(['stmt_daniel_arrival']),
    lastContradictionFeedback: { type: 'valid', explanation: 'mintió' },
    isInterrogationLoading: true,
    ...overrides,
  };
}

function persisted(overrides: Partial<PersistedGameState> = {}): PersistedGameState {
  const serialized = serializeState(activeState());
  if (serialized === null) {
    throw new Error('la partida activa de prueba debe ser serializable');
  }
  return { ...serialized, ...overrides };
}

describe('serializeState', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(NOW);
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('converts sets to arrays and omits every transient field', () => {
    const result = serializeState(activeState());

    expect(result).toEqual({
      version: PERSISTENCE_VERSION,
      phase: 'active',
      activeView: 'call',
      score: 250,
      incorrectAttempts: 1,
      timerEndTimestamp: END,
      discoveredContradictions: ['contra_daniel_access'],
      suspectPressure: { daniel: 30, elena: 0, roberto: 0, sofia: 0 },
      registeredStatements: ['stmt_daniel_arrival'],
      callHistory: {
        daniel: [
          { role: 'player', text: '¿A qué hora llegaste?', timestamp: NOW - 5_000 },
          {
            role: 'suspect',
            text: 'Llegué a las 20:50.',
            timestamp: NOW - 4_000,
            statementId: 'stmt_daniel_arrival',
          },
        ],
        elena: [],
        roberto: [],
        sofia: [],
      },
      accusationUsed: false,
      activeCallSuspect: 'daniel',
    });
    expect(Object.keys(result ?? {})).not.toContain('callSessionId');
    expect(Object.keys(result ?? {})).not.toContain('currentRequestId');
    expect(Object.keys(result ?? {})).not.toContain('lastContradictionFeedback');
    expect(Object.keys(result ?? {})).not.toContain('isInterrogationLoading');
  });

  it('only serializes active games with a timer timestamp', () => {
    expect(serializeState(activeState({ phase: 'victory_confession' }))).toBeNull();
    expect(serializeState(activeState({ phase: 'title' }))).toBeNull();
    expect(serializeState(activeState({ timerEndTimestamp: null }))).toBeNull();
  });

  it('does not alias the original collections', () => {
    const state = activeState();
    const result = serializeState(state);

    state.discoveredContradictions.add('contra_daniel_camera');
    state.callHistory.daniel.push({ role: 'player', text: 'otra', timestamp: NOW });

    expect(result?.discoveredContradictions).toEqual(['contra_daniel_access']);
    expect(result?.callHistory.daniel).toHaveLength(2);
  });
});

describe('deserializeState', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(NOW);
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('restores sets from arrays and keeps the call view of a valid suspect', () => {
    const result = deserializeState(persisted());

    expect(result).not.toBeNull();
    expect(result?.phase).toBe('active');
    expect(result?.activeView).toBe('call');
    expect(result?.activeCallSuspect).toBe('daniel');
    expect(result?.discoveredContradictions).toBeInstanceOf(Set);
    expect([...(result?.discoveredContradictions ?? [])]).toEqual(['contra_daniel_access']);
    expect([...(result?.registeredStatements ?? [])]).toEqual(['stmt_daniel_arrival']);
    expect(result?.timerEndTimestamp).toBe(END);
    expect(result?.callHistory.daniel).toHaveLength(2);
    expect(result).not.toHaveProperty('callSessionId');
    expect(result).not.toHaveProperty('currentRequestId');
    expect(result).not.toHaveProperty('lastContradictionFeedback');
    expect(result).not.toHaveProperty('isInterrogationLoading');
  });

  it('accepts a raw JSON string round trip', () => {
    const result = deserializeState(JSON.stringify(persisted()));

    expect(result?.phase).toBe('active');
    expect([...(result?.discoveredContradictions ?? [])]).toEqual(['contra_daniel_access']);
  });

  it('rejects unknown versions, missing keys, extra keys and non-objects', () => {
    expect(deserializeState({ ...persisted(), version: 2 })).toBeNull();
    const { score, ...withoutScore } = persisted();
    expect(score).toBe(250);
    expect(deserializeState(withoutScore)).toBeNull();
    expect(deserializeState({ ...persisted(), unexpected: true })).toBeNull();
    expect(deserializeState(null)).toBeNull();
    expect(deserializeState('{not json')).toBeNull();
    expect(deserializeState([persisted()])).toBeNull();
  });

  it('rejects corrupt types and unknown narrative ids', () => {
    expect(
      deserializeState({ ...persisted(), discoveredContradictions: ['contra_unknown'] }),
    ).toBeNull();
    expect(
      deserializeState({
        ...persisted(),
        discoveredContradictions: ['contra_daniel_access', 'contra_daniel_access'],
      }),
    ).toBeNull();
    expect(deserializeState({ ...persisted(), registeredStatements: ['stmt_x'] })).toBeNull();
    expect(deserializeState({ ...persisted(), activeView: 'lobby' })).toBeNull();
    expect(deserializeState({ ...persisted(), score: -10 })).toBeNull();
    expect(deserializeState({ ...persisted(), incorrectAttempts: 1.5 })).toBeNull();
    expect(deserializeState({ ...persisted(), accusationUsed: 'yes' })).toBeNull();
    expect(deserializeState({ ...persisted(), timerEndTimestamp: 'soon' })).toBeNull();
    expect(
      deserializeState({ ...persisted(), suspectPressure: { daniel: 30, elena: 0, sofia: 0 } }),
    ).toBeNull();
    expect(
      deserializeState({
        ...persisted(),
        suspectPressure: { daniel: -1, elena: 0, roberto: 0, sofia: 0 },
      }),
    ).toBeNull();
  });

  it('rejects corrupt call history messages', () => {
    const base = persisted();

    expect(
      deserializeState({
        ...base,
        callHistory: { ...base.callHistory, elena: [{ role: 'ghost', text: 'x', timestamp: NOW }] },
      }),
    ).toBeNull();
    expect(
      deserializeState({
        ...base,
        callHistory: { ...base.callHistory, elena: [{ role: 'suspect', text: '', timestamp: NOW }] },
      }),
    ).toBeNull();
    expect(
      deserializeState({
        ...base,
        callHistory: {
          ...base.callHistory,
          elena: [
            {
              role: 'suspect',
              text: 'algo',
              timestamp: NOW,
              statementId: 'stmt_daniel_arrival',
            },
          ],
        },
      }),
    ).toBeNull();
    expect(
      deserializeState({
        ...base,
        callHistory: { ...base.callHistory, roberto: 'nope' },
      }),
    ).toBeNull();
  });

  it('fixes inconsistent call and view combinations', () => {
    expect(deserializeState(persisted({ activeCallSuspect: null }))?.activeView).toBe('desktop');

    const evidenceView = deserializeState(
      persisted({ activeView: 'evidence', activeCallSuspect: 'elena' }),
    );
    expect(evidenceView?.activeView).toBe('evidence');
    expect(evidenceView?.activeCallSuspect).toBeNull();

    const unknownSuspect = deserializeState({ ...persisted(), activeCallSuspect: 'marcos' });
    expect(unknownSuspect?.activeView).toBe('desktop');
    expect(unknownSuspect?.activeCallSuspect).toBeNull();
  });

  it('hydrates an expired timer as a time defeat without an active call', () => {
    const result = deserializeState(persisted({ timerEndTimestamp: NOW - 1 }));

    expect(result?.phase).toBe('defeat_time');
    expect(result?.activeView).toBe('desktop');
    expect(result?.activeCallSuspect).toBeNull();
    expect(deserializeState(persisted({ timerEndTimestamp: NOW }))?.phase).toBe('defeat_time');
  });

  it('recalculates expiration against the real clock', () => {
    expect(deserializeState(persisted())?.phase).toBe('active');
    vi.setSystemTime(END + 1);
    expect(deserializeState(persisted())?.phase).toBe('defeat_time');
  });

  it('rejects persisted states that are not active games', () => {
    expect(deserializeState(persisted({ phase: 'victory_accusation' }))).toBeNull();
    expect(deserializeState(persisted({ phase: 'title' }))).toBeNull();
  });
});
// ============================================================================
// Grupo de pruebas (d), tarea 3.6: batería exhaustiva de serialización,
// validación e hidratación de la persistencia.
//
// Requisitos: 10.3-10.4, 13.6-13.7, 18.1-18.7
// ============================================================================

describe('serializeState: casos límite de la partida activa', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(NOW);
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('rejects timer timestamps that are not finite numbers', () => {
    expect(serializeState(activeState({ timerEndTimestamp: Number.NaN }))).toBeNull();
    expect(
      serializeState(activeState({ timerEndTimestamp: Number.POSITIVE_INFINITY })),
    ).toBeNull();
  });

  it('serializes every navigable view without an active call', () => {
    for (const activeView of ['desktop', 'casefile', 'evidence', 'accusation'] as const) {
      const result = serializeState(activeState({ activeView, activeCallSuspect: null }));

      expect(result?.activeView).toBe(activeView);
      expect(result?.activeCallSuspect).toBeNull();
    }
  });

  it('copies the pressure map instead of aliasing it', () => {
    const state = activeState();
    const result = serializeState(state);

    state.suspectPressure.daniel = 999;

    expect(result?.suspectPressure.daniel).toBe(30);
  });

  it('survives a JSON round trip preserving every persisted value', () => {
    const snapshot = serializeState(activeState());
    const restored = deserializeState(JSON.parse(JSON.stringify(snapshot)) as unknown);

    expect(restored).not.toBeNull();
    expect(restored?.score).toBe(250);
    expect(restored?.incorrectAttempts).toBe(1);
    expect(restored?.timerEndTimestamp).toBe(END);
    expect(restored?.suspectPressure).toEqual({ daniel: 30, elena: 0, roberto: 0, sofia: 0 });
    expect([...(restored?.discoveredContradictions ?? [])]).toEqual(['contra_daniel_access']);
    expect([...(restored?.registeredStatements ?? [])]).toEqual(['stmt_daniel_arrival']);
    expect(restored?.callHistory.daniel[1]?.statementId).toBe('stmt_daniel_arrival');
    expect(restored?.accusationUsed).toBe(false);
    expect(restored?.activeCallSuspect).toBe('daniel');
  });
});

describe('deserializeState: validación exhaustiva de tipos e IDs', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(NOW);
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('rejects primitives, undefined and empty payloads', () => {
    expect(deserializeState(undefined)).toBeNull();
    expect(deserializeState(42)).toBeNull();
    expect(deserializeState(true)).toBeNull();
    expect(deserializeState('')).toBeNull();
    expect(deserializeState({})).toBeNull();
    expect(deserializeState('null')).toBeNull();
  });

  it('rejects every version that is not the current numeric version', () => {
    expect(deserializeState({ ...persisted(), version: '1' })).toBeNull();
    expect(deserializeState({ ...persisted(), version: 0 })).toBeNull();
    expect(deserializeState({ ...persisted(), version: null })).toBeNull();
  });

  it('rejects id collections that are not arrays of known ids', () => {
    expect(
      deserializeState({ ...persisted(), discoveredContradictions: 'contra_daniel_access' }),
    ).toBeNull();
    expect(deserializeState({ ...persisted(), discoveredContradictions: [7] })).toBeNull();
    expect(deserializeState({ ...persisted(), discoveredContradictions: [null] })).toBeNull();
    expect(deserializeState({ ...persisted(), registeredStatements: { 0: 'stmt_x' } })).toBeNull();
    expect(
      deserializeState({
        ...persisted(),
        registeredStatements: ['stmt_daniel_arrival', 'stmt_daniel_arrival'],
      }),
    ).toBeNull();
  });

  it('rejects pressure maps with wrong keys or non finite values', () => {
    expect(
      deserializeState({
        ...persisted(),
        suspectPressure: { daniel: 0, elena: 0, roberto: 0, sofia: 0, marcos: 0 },
      }),
    ).toBeNull();
    expect(
      deserializeState({
        ...persisted(),
        suspectPressure: { daniel: Number.POSITIVE_INFINITY, elena: 0, roberto: 0, sofia: 0 },
      }),
    ).toBeNull();
    expect(
      deserializeState({
        ...persisted(),
        suspectPressure: { daniel: '30', elena: 0, roberto: 0, sofia: 0 },
      }),
    ).toBeNull();
    expect(deserializeState({ ...persisted(), suspectPressure: [] })).toBeNull();
  });

  it('rejects call histories with missing or unknown suspect keys', () => {
    const base = persisted();
    const { daniel, ...withoutDaniel } = base.callHistory;
    expect(daniel).toHaveLength(2);

    expect(deserializeState({ ...base, callHistory: withoutDaniel })).toBeNull();
    expect(
      deserializeState({ ...base, callHistory: { ...base.callHistory, marcos: [] } }),
    ).toBeNull();
    expect(deserializeState({ ...base, callHistory: [] })).toBeNull();
  });

  it('rejects messages with an invalid shape, text or timestamp', () => {
    const base = persisted();
    const withElena = (message: unknown): unknown => ({
      ...base,
      callHistory: { ...base.callHistory, elena: [message] },
    });

    // Solo un mensaje del sospechoso puede registrar una declaración canónica.
    expect(
      deserializeState(
        withElena({
          role: 'player',
          text: 'pregunta',
          timestamp: NOW,
          statementId: 'stmt_elena_arrival',
        }),
      ),
    ).toBeNull();
    expect(
      deserializeState(
        withElena({ role: 'suspect', text: 'algo', timestamp: NOW, statementId: null }),
      ),
    ).toBeNull();
    expect(
      deserializeState(
        withElena({ role: 'suspect', text: 'algo', timestamp: NOW, statementId: 'stmt_x' }),
      ),
    ).toBeNull();
    expect(
      deserializeState(withElena({ role: 'suspect', text: 'algo', timestamp: NOW, extra: 1 })),
    ).toBeNull();
    expect(deserializeState(withElena({ role: 'suspect', timestamp: NOW }))).toBeNull();
    expect(
      deserializeState(withElena({ role: 'suspect', text: 'a'.repeat(501), timestamp: NOW })),
    ).toBeNull();
    expect(deserializeState(withElena({ role: 'suspect', text: 'algo', timestamp: -1 }))).toBeNull();
    expect(
      deserializeState(withElena({ role: 'suspect', text: 'algo', timestamp: Number.NaN })),
    ).toBeNull();
    expect(
      deserializeState(withElena({ role: 'suspect', text: 'algo', timestamp: '2025' })),
    ).toBeNull();
    expect(deserializeState(withElena(null))).toBeNull();
    expect(deserializeState(withElena('mensaje'))).toBeNull();
  });

  it('accepts a valid statement message of the suspect that owns it', () => {
    const base = persisted();
    const result = deserializeState({
      ...base,
      callHistory: {
        ...base.callHistory,
        elena: [
          { role: 'player', text: '¿Cuándo llegaste?', timestamp: NOW - 1_000 },
          {
            role: 'suspect',
            text: 'Llegué después de las nueve.',
            timestamp: NOW,
            statementId: 'stmt_elena_arrival',
          },
        ],
      },
    });

    expect(result?.callHistory.elena).toHaveLength(2);
    expect(result?.callHistory.elena[1]?.statementId).toBe('stmt_elena_arrival');
  });

  it('rejects an activeCallSuspect that is not a string or null', () => {
    expect(deserializeState({ ...persisted(), activeCallSuspect: 3 })).toBeNull();
    expect(deserializeState({ ...persisted(), activeCallSuspect: {} })).toBeNull();
  });

  it('accepts a freshly started game with empty collections', () => {
    const result = deserializeState({
      version: PERSISTENCE_VERSION,
      phase: 'active',
      activeView: 'desktop',
      score: 0,
      incorrectAttempts: 0,
      timerEndTimestamp: END,
      discoveredContradictions: [],
      suspectPressure: { daniel: 0, elena: 0, roberto: 0, sofia: 0 },
      registeredStatements: [],
      callHistory: { daniel: [], elena: [], roberto: [], sofia: [] },
      accusationUsed: false,
      activeCallSuspect: null,
    });

    expect(result?.phase).toBe('active');
    expect(result?.discoveredContradictions.size).toBe(0);
    expect(result?.registeredStatements.size).toBe(0);
    expect(result?.callHistory.daniel).toEqual([]);
  });

  it('returns fresh collections that do not alias the persisted payload', () => {
    const source = persisted();
    const result = deserializeState(source);

    source.discoveredContradictions.push('contra_daniel_camera');
    source.registeredStatements.push('stmt_daniel_office');
    source.callHistory.daniel.push({ role: 'player', text: 'otra', timestamp: NOW });
    source.suspectPressure.daniel = 999;

    expect(result?.discoveredContradictions.size).toBe(1);
    expect(result?.registeredStatements.size).toBe(1);
    expect(result?.callHistory.daniel).toHaveLength(2);
    expect(result?.suspectPressure.daniel).toBe(30);

    result?.discoveredContradictions.add('contra_elena_arrival');
    expect(source.discoveredContradictions).toEqual([
      'contra_daniel_access',
      'contra_daniel_camera',
    ]);
  });
});
