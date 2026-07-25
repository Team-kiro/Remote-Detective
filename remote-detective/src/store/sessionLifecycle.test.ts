/**
 * Pruebas mínimas del ciclo de vida de `sessionStorage` en el store (tarea
 * 3.5): guardado de la partida activa tras las acciones significativas,
 * ausencia de escrituras con solicitud pendiente, hidratación con recálculo
 * real del tiempo, borrado al finalizar o reiniciar y degradación segura. La
 * batería exhaustiva de persistencia e hidratación pertenece al grupo 3.6.
 *
 * Requisitos: 10.3-10.4, 13.11, 14.4, 18.1-18.7
 */

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { calculateTimeRemaining } from '@/logic/timerEngine';
import {
  createHydratedGameSessionState,
  createInitialGameSessionState,
  useGameStore,
} from '@/store/gameStore';
import { PERSISTENCE_KEY, PERSISTENCE_VERSION } from '@/store/persistence';
import type { StatementId } from '@/data/types';
import type { PersistedGameState } from '@/store/persistence';

const DANIEL_ARRIVAL_QUESTION = '¿A qué hora llegaste al edificio?';

function readRaw(): string | null {
  return globalThis.sessionStorage.getItem(PERSISTENCE_KEY);
}

/** Lee la sesión guardada exigiendo que exista. */
function requireStored(): PersistedGameState {
  const raw = readRaw();
  if (raw === null) {
    throw new Error('se esperaba una sesión guardada');
  }

  return JSON.parse(raw) as PersistedGameState;
}

/** Escribe directamente una sesión válida para probar la hidratación. */
function writeStored(overrides: Partial<PersistedGameState>): void {
  const base: PersistedGameState = {
    version: PERSISTENCE_VERSION,
    phase: 'active',
    activeView: 'desktop',
    score: 150,
    incorrectAttempts: 1,
    timerEndTimestamp: Date.now() + 60_000,
    discoveredContradictions: ['contra_daniel_access'],
    suspectPressure: { daniel: 30, elena: 0, roberto: 0, sofia: 0 },
    registeredStatements: ['stmt_daniel_arrival'],
    callHistory: { daniel: [], elena: [], roberto: [], sofia: [] },
    accusationUsed: false,
    activeCallSuspect: null,
  };

  globalThis.sessionStorage.setItem(PERSISTENCE_KEY, JSON.stringify({ ...base, ...overrides }));
}

function registerStatements(...statementIds: readonly StatementId[]): void {
  useGameStore.setState({ registeredStatements: new Set(statementIds) });
}

beforeEach(() => {
  globalThis.sessionStorage.clear();
  useGameStore.setState(createInitialGameSessionState());
});

afterEach(() => {
  vi.unstubAllGlobals();
  vi.useRealTimers();
});

describe('sessionStorage: guardado de acciones significativas', () => {
  it('guarda la partida al iniciarla con la marca de fin del temporizador', () => {
    useGameStore.getState().startGame();

    const stored = requireStored();
    expect(stored.version).toBe(PERSISTENCE_VERSION);
    expect(stored.phase).toBe('active');
    expect(stored.activeView).toBe('desktop');
    expect(stored.timerEndTimestamp).toBe(useGameStore.getState().timerEndTimestamp);
  });

  it('no guarda estado transitorio ni el tiempo restante literal', () => {
    useGameStore.getState().startGame();
    useGameStore.getState().startCall('daniel');

    const stored = requireStored();
    expect(Object.hasOwn(stored, 'callSessionId')).toBe(false);
    expect(Object.hasOwn(stored, 'currentRequestId')).toBe(false);
    expect(Object.hasOwn(stored, 'isInterrogationLoading')).toBe(false);
    expect(Object.hasOwn(stored, 'lastContradictionFeedback')).toBe(false);
    expect(Object.hasOwn(stored, 'timeRemaining')).toBe(false);
  });

  it('guarda la navegación, el inicio y el fin de llamada', () => {
    useGameStore.getState().startGame();

    useGameStore.getState().openEvidence();
    expect(requireStored().activeView).toBe('evidence');

    useGameStore.getState().startCall('elena');
    let stored = requireStored();
    expect(stored.activeView).toBe('call');
    expect(stored.activeCallSuspect).toBe('elena');

    useGameStore.getState().endCall();
    stored = requireStored();
    expect(stored.activeView).toBe('desktop');
    expect(stored.activeCallSuspect).toBeNull();
  });

  it('guarda la vista al cancelar la acusación sin consumir el intento', () => {
    useGameStore.getState().startGame();
    useGameStore.getState().openAccusation();
    expect(requireStored().activeView).toBe('accusation');

    useGameStore.getState().returnToDesktop();

    const stored = requireStored();
    expect(stored.activeView).toBe('desktop');
    expect(stored.accusationUsed).toBe(false);
  });

  it('guarda contradicciones, presión y score tras una contradicción válida', () => {
    useGameStore.getState().startGame();
    registerStatements('stmt_daniel_arrival');

    useGameStore.getState().presentEvidence('ev_access_log', 'stmt_daniel_arrival');

    const stored = requireStored();
    expect(stored.discoveredContradictions).toEqual(['contra_daniel_access']);
    expect(stored.suspectPressure.daniel).toBe(30);
    expect(stored.score).toBe(150);
  });

  it('guarda los intentos incorrectos y el score penalizado', () => {
    useGameStore.getState().startGame();
    registerStatements('stmt_daniel_arrival');

    useGameStore.getState().presentEvidence('ev_toxicology', 'stmt_daniel_arrival');

    const stored = requireStored();
    expect(stored.incorrectAttempts).toBe(1);
    expect(stored.score).toBe(0);
  });

  it('escribe el mensaje aceptado y la declaración solo tras el commit atómico', async () => {
    useGameStore.getState().startGame();
    useGameStore.getState().startCall('daniel');
    expect(requireStored().callHistory.daniel).toEqual([]);

    await useGameStore.getState().askQuestion(DANIEL_ARRIVAL_QUESTION);

    const state = useGameStore.getState();
    const stored = requireStored();
    expect(stored.callHistory.daniel).toHaveLength(2);
    expect(stored.callHistory.daniel[1]?.role).toBe('suspect');
    expect(stored.registeredStatements).toEqual([...state.registeredStatements]);
  });

  it('no escribe mientras hay una solicitud pendiente', () => {
    useGameStore.getState().startGame();
    useGameStore.getState().openEvidence();
    const beforePending = readRaw();

    useGameStore.setState({ isInterrogationLoading: true, currentRequestId: 'req-1' });
    useGameStore.getState().openCaseFile();

    expect(readRaw()).toBe(beforePending);
  });

  it('no guarda partidas que no están activas', () => {
    useGameStore.getState().openEvidence();

    expect(readRaw()).toBeNull();
  });
});

describe('sessionStorage: borrado al finalizar y reiniciar', () => {
  it('elimina la sesión al finalizar la partida', () => {
    useGameStore.getState().startGame();
    expect(readRaw()).not.toBeNull();

    useGameStore.getState().triggerTimeDefeat();

    expect(readRaw()).toBeNull();
  });

  it('elimina la sesión al reiniciar', () => {
    useGameStore.getState().startGame();

    useGameStore.getState().resetGame();

    expect(readRaw()).toBeNull();
  });
});

describe('sessionStorage: hidratación', () => {
  it('restaura la partida activa recalculando el tiempo real transcurrido', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2025-03-17T20:00:00.000Z'));
    const timerEndTimestamp = Date.now() + 60_000;
    writeStored({ timerEndTimestamp, activeView: 'evidence' });

    vi.advanceTimersByTime(30_000);
    const hydrated = createHydratedGameSessionState();

    expect(hydrated.phase).toBe('active');
    expect(hydrated.activeView).toBe('evidence');
    expect(hydrated.timerEndTimestamp).toBe(timerEndTimestamp);
    expect(calculateTimeRemaining(timerEndTimestamp)).toBe(30_000);
    expect(hydrated.score).toBe(150);
    expect(hydrated.discoveredContradictions.has('contra_daniel_access')).toBe(true);
    expect(hydrated.registeredStatements.has('stmt_daniel_arrival')).toBe(true);
  });

  it('genera una sesión de llamada nueva sin reanudar solicitudes', () => {
    writeStored({ activeView: 'call', activeCallSuspect: 'daniel' });

    const hydrated = createHydratedGameSessionState();

    expect(hydrated.activeView).toBe('call');
    expect(hydrated.activeCallSuspect).toBe('daniel');
    expect(hydrated.callSessionId).not.toBeNull();
    expect(hydrated.currentRequestId).toBeNull();
    expect(hydrated.isInterrogationLoading).toBe(false);
    expect(hydrated.lastContradictionFeedback).toBeNull();
  });

  it('un temporizador expirado hidrata derrota por tiempo y descarta la sesión', () => {
    writeStored({ timerEndTimestamp: Date.now() - 1, activeView: 'call', activeCallSuspect: 'daniel' });

    const hydrated = createHydratedGameSessionState();

    expect(hydrated.phase).toBe('defeat_time');
    expect(hydrated.activeView).toBe('desktop');
    expect(hydrated.activeCallSuspect).toBeNull();
    expect(hydrated.callSessionId).toBeNull();
    expect(readRaw()).toBeNull();
  });

  it('datos corruptos o ausentes inician una partida nueva', () => {
    expect(createHydratedGameSessionState().phase).toBe('title');

    globalThis.sessionStorage.setItem(PERSISTENCE_KEY, '{"version":1,');

    const hydrated = createHydratedGameSessionState();
    expect(hydrated.phase).toBe('title');
    expect(hydrated.timerEndTimestamp).toBeNull();
    expect(readRaw()).toBeNull();
  });
});

describe('sessionStorage: degradación segura', () => {
  it('la partida continúa si el almacenamiento lanza al leer o escribir', () => {
    vi.stubGlobal('sessionStorage', {
      getItem: () => {
        throw new Error('almacenamiento bloqueado');
      },
      setItem: () => {
        throw new Error('cuota excedida');
      },
      removeItem: () => {
        throw new Error('almacenamiento bloqueado');
      },
    });

    expect(createHydratedGameSessionState().phase).toBe('title');
    expect(() => {
      useGameStore.getState().startGame();
      useGameStore.getState().startCall('daniel');
      useGameStore.getState().endCall();
      useGameStore.getState().resetGame();
    }).not.toThrow();
    expect(useGameStore.getState().phase).toBe('title');
  });

  it('la partida continúa si `sessionStorage` no está disponible', () => {
    vi.stubGlobal('sessionStorage', undefined);

    expect(createHydratedGameSessionState().phase).toBe('title');
    expect(() => {
      useGameStore.getState().startGame();
    }).not.toThrow();
    expect(useGameStore.getState().phase).toBe('active');
  });
});
// ============================================================================
// Grupo de pruebas (d), tarea 3.6: invariantes completos del ciclo de vida de
// `sessionStorage` en el store real y de la hidratación.
//
// Requisitos: 10.3-10.4, 13.6-13.7, 18.1-18.7
// ============================================================================

/** Almacenamiento en memoria que cuenta lecturas, escrituras y borrados. */
interface CountingStorage {
  reads: number;
  writes: number;
  removes: number;
  value: string | null;
}

/**
 * Sustituye `sessionStorage` por un almacenamiento equivalente que registra
 * cada operación, para poder afirmar la ausencia de escrituras sin tocar la
 * lógica de juego del store.
 */
function installCountingStorage(initial: string | null = null): CountingStorage {
  const tracked: CountingStorage = { reads: 0, writes: 0, removes: 0, value: initial };

  vi.stubGlobal('sessionStorage', {
    getItem: (key: string): string | null => {
      tracked.reads += 1;
      return key === PERSISTENCE_KEY ? tracked.value : null;
    },
    setItem: (key: string, value: string): void => {
      if (key === PERSISTENCE_KEY) {
        tracked.writes += 1;
        tracked.value = value;
      }
    },
    removeItem: (key: string): void => {
      if (key === PERSISTENCE_KEY) {
        tracked.removes += 1;
        tracked.value = null;
      }
    },
  });

  return tracked;
}

const WINNING_ACCUSATION = {
  suspectId: 'daniel',
  motiveId: 'motive_silence',
  methodId: 'method_poison',
  evidenceIds: ['ev_email', 'ev_camera', 'ev_receipt', 'ev_bottle'],
} as const;

describe('sessionStorage: ausencia de escrituras innecesarias', () => {
  it('no escribe por el paso del tiempo del temporizador', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2025-03-17T20:00:00.000Z'));
    const storage = installCountingStorage();

    useGameStore.getState().startGame();
    const writesAfterStart = storage.writes;
    const snapshotAfterStart = storage.value;
    expect(writesAfterStart).toBe(1);
    expect(snapshotAfterStart).not.toBeNull();

    vi.advanceTimersByTime(30_000);

    expect(storage.writes).toBe(writesAfterStart);
    expect(storage.value).toBe(snapshotAfterStart);
    expect(useGameStore.getState().phase).toBe('active');
  });

  it('no escribe por estados transitorios de contradicciones ni por feedback', () => {
    const storage = installCountingStorage();
    useGameStore.getState().startGame();
    registerStatements('stmt_daniel_arrival');

    const writesBeforeValid = storage.writes;
    useGameStore.getState().presentEvidence('ev_access_log', 'stmt_daniel_arrival');
    const writesAfterValid = storage.writes;
    expect(writesAfterValid).toBe(writesBeforeValid + 1);

    // Ya descubierta, evidencia relacionada pero insuficiente, declaración no
    // registrada y limpieza de feedback: nada de esto se persiste.
    useGameStore.getState().presentEvidence('ev_access_log', 'stmt_daniel_arrival');
    useGameStore.getState().presentEvidence('ev_bottle', 'stmt_daniel_arrival');
    useGameStore.getState().presentEvidence('ev_camera', 'stmt_daniel_office');
    useGameStore.getState().clearFeedback();

    expect(storage.writes).toBe(writesAfterValid);
    expect(useGameStore.getState().lastContradictionFeedback).toBeNull();
    expect(useGameStore.getState().incorrectAttempts).toBe(0);
  });

  it('no escribe una contradicción válida mientras una solicitud sigue pendiente', () => {
    const storage = installCountingStorage();
    useGameStore.getState().startGame();
    registerStatements('stmt_daniel_office');
    const writesBefore = storage.writes;

    useGameStore.setState({ isInterrogationLoading: true, currentRequestId: 'req-pendiente' });
    useGameStore.getState().presentEvidence('ev_camera', 'stmt_daniel_office');

    expect(useGameStore.getState().discoveredContradictions.has('contra_daniel_camera')).toBe(true);
    expect(storage.writes).toBe(writesBefore);
  });

  it('no escribe acciones de una partida ya finalizada', () => {
    const storage = installCountingStorage();
    useGameStore.getState().startGame();
    useGameStore.getState().triggerTimeDefeat();
    const writesAfterEnd = storage.writes;
    expect(writesAfterEnd).toBeGreaterThan(0);
    expect(storage.removes).toBeGreaterThan(0);

    useGameStore.getState().openEvidence();
    useGameStore.getState().returnToDesktop();
    useGameStore.getState().startCall('daniel');
    useGameStore.getState().endCall();

    expect(storage.writes).toBe(writesAfterEnd);
    expect(storage.value).toBeNull();
  });
});

describe('sessionStorage: borrado en toda finalización', () => {
  it('elimina la sesión al ganar por acusación correcta', () => {
    const storage = installCountingStorage();
    useGameStore.getState().startGame();
    expect(storage.value).not.toBeNull();

    useGameStore.getState().submitAccusation(WINNING_ACCUSATION);

    expect(useGameStore.getState().phase).toBe('victory_accusation');
    expect(storage.value).toBeNull();
    expect(storage.removes).toBeGreaterThan(0);
  });

  it('elimina la sesión al perder por acusación incorrecta', () => {
    const storage = installCountingStorage();
    useGameStore.getState().startGame();

    useGameStore.getState().submitAccusation({ ...WINNING_ACCUSATION, suspectId: 'elena' });

    expect(useGameStore.getState().phase).toBe('defeat_accusation');
    expect(storage.value).toBeNull();
  });

  it('elimina la sesión al ganar por confesión', () => {
    const storage = installCountingStorage();
    useGameStore.getState().startGame();
    registerStatements('stmt_daniel_arrival', 'stmt_daniel_office', 'stmt_daniel_substance');
    useGameStore.getState().startCall('daniel');
    useGameStore.getState().presentEvidence('ev_access_log', 'stmt_daniel_arrival');
    useGameStore.getState().presentEvidence('ev_camera', 'stmt_daniel_office');
    expect(storage.value).not.toBeNull();

    useGameStore.getState().presentEvidence('ev_receipt', 'stmt_daniel_substance');

    expect(useGameStore.getState().phase).toBe('victory_confession');
    expect(storage.value).toBeNull();
  });
});

describe('sessionStorage: hidratación de combinaciones incoherentes', () => {
  it('corrige una llamada sin sospechoso al escritorio', () => {
    writeStored({ activeView: 'call', activeCallSuspect: null });

    const hydrated = createHydratedGameSessionState();

    expect(hydrated.phase).toBe('active');
    expect(hydrated.activeView).toBe('desktop');
    expect(hydrated.activeCallSuspect).toBeNull();
    expect(hydrated.callSessionId).toBeNull();
  });

  it('anula el sospechoso guardado cuando la vista no es de llamada', () => {
    writeStored({ activeView: 'casefile', activeCallSuspect: 'roberto' });

    const hydrated = createHydratedGameSessionState();

    expect(hydrated.activeView).toBe('casefile');
    expect(hydrated.activeCallSuspect).toBeNull();
    expect(hydrated.callSessionId).toBeNull();
  });

  it('devuelve al escritorio un sospechoso inexistente', () => {
    writeStored({ activeView: 'call', activeCallSuspect: 'marcos' as never });

    const hydrated = createHydratedGameSessionState();

    expect(hydrated.activeView).toBe('desktop');
    expect(hydrated.activeCallSuspect).toBeNull();
    expect(hydrated.callSessionId).toBeNull();
  });

  it('restaura la vista de acusación sin consumir el intento', () => {
    writeStored({ activeView: 'accusation', accusationUsed: false });

    const hydrated = createHydratedGameSessionState();

    expect(hydrated.activeView).toBe('accusation');
    expect(hydrated.accusationUsed).toBe(false);
  });

  it('conserva un intento de acusación ya consumido', () => {
    writeStored({ accusationUsed: true });

    expect(createHydratedGameSessionState().accusationUsed).toBe(true);
  });

  it('genera una sesión de llamada distinta en cada hidratación', () => {
    writeStored({ activeView: 'call', activeCallSuspect: 'sofia' });

    const first = createHydratedGameSessionState();
    const second = createHydratedGameSessionState();

    expect(first.callSessionId).not.toBeNull();
    expect(second.callSessionId).not.toBeNull();
    expect(first.callSessionId).not.toBe(second.callSessionId);
  });

  it('restaura el historial de llamadas y las declaraciones registradas', () => {
    writeStored({
      activeView: 'call',
      activeCallSuspect: 'daniel',
      registeredStatements: ['stmt_daniel_arrival'],
      callHistory: {
        daniel: [
          { role: 'player', text: '¿A qué hora llegaste?', timestamp: 1 },
          {
            role: 'suspect',
            text: 'Llegué a las 20:50.',
            timestamp: 2,
            statementId: 'stmt_daniel_arrival',
          },
        ],
        elena: [],
        roberto: [],
        sofia: [],
      },
    });

    const hydrated = createHydratedGameSessionState();

    expect(hydrated.callHistory.daniel).toHaveLength(2);
    expect(hydrated.callHistory.daniel[1]?.statementId).toBe('stmt_daniel_arrival');
    expect(hydrated.registeredStatements.has('stmt_daniel_arrival')).toBe(true);
    expect(hydrated.currentRequestId).toBeNull();
    expect(hydrated.isInterrogationLoading).toBe(false);
  });

  it('descarta datos incompletos o con IDs desconocidos e inicia partida nueva', () => {
    writeStored({ discoveredContradictions: ['contra_desconocida' as never] });
    expect(createHydratedGameSessionState().phase).toBe('title');
    expect(readRaw()).toBeNull();

    globalThis.sessionStorage.setItem(PERSISTENCE_KEY, JSON.stringify({ version: 1 }));
    expect(createHydratedGameSessionState().phase).toBe('title');
    expect(readRaw()).toBeNull();
  });

  it('una partida hidratada sigue guardando sus acciones significativas', () => {
    writeStored({ activeView: 'call', activeCallSuspect: 'elena', score: 150 });
    const hydrated = createHydratedGameSessionState();
    useGameStore.setState(hydrated);

    useGameStore.getState().endCall();

    const stored = requireStored();
    expect(stored.activeView).toBe('desktop');
    expect(stored.activeCallSuspect).toBeNull();
    expect(stored.score).toBe(150);
    expect(Object.hasOwn(stored, 'callSessionId')).toBe(false);
  });
});
