/**
 * Grupo de pruebas (e) — tarea 3.7: interrogación asíncrona, fallback local
 * obligatorio y concurrencia.
 *
 * Se usan el store real y el servicio real: lo único sustituido es el límite de
 * red (`fetch`). El catálogo local solo se altera, y siempre con restauración,
 * en los casos que simulan datos corruptos imposibles por construcción.
 *
 * Propiedades cubiertas: 5, 11-15, 20, 22-31.
 *
 * Requisitos: 6.3-6.11, 7.6-7.9, 9.3, 10.3-10.4, 11.6, 13.2, 13.5, 13.7, 14.1,
 * 14.4, 15.5, 16.1-16.5
 */

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { config } from '@/config';
import { LOCAL_RESPONSES } from '@/data/localResponses';
import { STATEMENTS } from '@/data/statements';
import { createInitialGameSessionState, useGameStore } from '@/store/gameStore';
import type { AppConfig, InterrogationMode } from '@/config';
import type { AccusationInput, ChatMessage, GameState, LocalResponseDef } from '@/data/types';

const DANIEL_ARRIVAL_QUESTION = '¿A qué hora llegaste al edificio?';
const DANIEL_ARRIVAL_TEXT = STATEMENTS.stmt_daniel_arrival.canonicalText;
const UNKNOWN_QUESTION = '¿Te gusta la jardinería tropical?';

/** Acciones públicas aprobadas del store, sin ninguna otra. */
const PUBLIC_ACTIONS = [
  'askQuestion',
  'clearFeedback',
  'endCall',
  'openAccusation',
  'openCaseFile',
  'openEvidence',
  'presentEvidence',
  'resetGame',
  'returnToDesktop',
  'startCall',
  'startGame',
  'submitAccusation',
  'triggerTimeDefeat',
];

/** Acciones que el diseño prohíbe exponer. */
const FORBIDDEN_ACTIONS = [
  'processResponse',
  'registerStatement',
  'triggerConfession',
  'setActiveView',
  'setFeedback',
  'setLastContradictionFeedback',
  'setCallSessionId',
  'setCurrentRequestId',
];

const WRONG_ACCUSATION: AccusationInput = {
  suspectId: 'sofia',
  motiveId: 'motive_revenge',
  methodId: 'method_assault',
  evidenceIds: ['ev_bottle'],
};

const originalMode: InterrogationMode = config.interrogationMode;
const originalApiUrl: string | null = config.apiUrl;
const originalTimeout: number = config.requestTimeoutMs;

/** Copia inmutable del catálogo congelado para restaurarlo tras cada prueba. */
const REAL_CATALOG: readonly LocalResponseDef[] = [...LOCAL_RESPONSES];
/** Misma referencia que consume el store; solo se muta en pruebas de corrupción. */
const mutableCatalog = LOCAL_RESPONSES as unknown as LocalResponseDef[];

function catalogEntry(id: string): LocalResponseDef {
  const entry = REAL_CATALOG.find((response) => response.id === id);
  if (entry === undefined) {
    throw new Error(`El catálogo aprobado no contiene la respuesta ${id}.`);
  }

  return entry;
}

const DANIEL_GENERIC_TEXT = catalogEntry('resp_daniel_generic').text;

/** Sustituye el catálogo local; `restoreCatalog` deshace el cambio. */
function replaceCatalog(entries: readonly LocalResponseDef[]): void {
  mutableCatalog.splice(0, mutableCatalog.length, ...entries);
}

function restoreCatalog(): void {
  mutableCatalog.splice(0, mutableCatalog.length, ...REAL_CATALOG);
}

function resetStore(): void {
  useGameStore.setState(createInitialGameSessionState());
}

function startActiveCall(suspect: 'daniel' | 'elena' = 'daniel'): void {
  useGameStore.getState().startGame();
  useGameStore.getState().startCall(suspect);
}

/** Activa el modo remoto sin alterar la duración aprobada del temporizador. */
function enableBedrock(timeoutMs = 5_000): void {
  const mutable: AppConfig = config;
  mutable.interrogationMode = 'bedrock';
  mutable.apiUrl = 'https://example.invalid/prod';
  mutable.requestTimeoutMs = timeoutMs;
}

function jsonResponse(payload: unknown): Response {
  return new Response(JSON.stringify(payload), {
    status: 200,
    headers: { 'Content-Type': 'application/json' },
  });
}

interface PendingFetch {
  signal: AbortSignal | null;
  resolveWith: (payload: unknown) => void;
  rejectWith: (reason: Error) => void;
}

/** `fetch` que solo responde cuando la prueba lo libera explícitamente. */
function stubDeferredFetch(): PendingFetch[] {
  const pending: PendingFetch[] = [];
  vi.stubGlobal(
    'fetch',
    vi.fn(
      (_url: string, init?: RequestInit) =>
        new Promise<Response>((resolve, reject) => {
          pending.push({
            signal: init?.signal ?? null,
            resolveWith: (payload: unknown) => {
              resolve(jsonResponse(payload));
            },
            rejectWith: (reason: Error) => {
              reject(reason);
            },
          });
        }),
    ),
  );

  return pending;
}

function pendingAt(pending: readonly PendingFetch[], index: number): PendingFetch {
  const call = pending[index];
  if (call === undefined) {
    throw new Error(`No se registró la solicitud remota número ${String(index)}.`);
  }

  return call;
}

function historyOf(suspect: 'daniel' | 'elena'): readonly ChatMessage[] {
  return useGameStore.getState().callHistory[suspect];
}

beforeEach(() => {
  resetStore();
});

afterEach(() => {
  const mutable: AppConfig = config;
  mutable.interrogationMode = originalMode;
  mutable.apiUrl = originalApiUrl;
  mutable.requestTimeoutMs = originalTimeout;
  vi.unstubAllGlobals();
  restoreCatalog();
});

// ============================================================================
// Guardas previas (propiedad 22)
// ============================================================================

describe('askQuestion: cada guarda previa falla por separado', () => {
  it('no crea solicitud, loading, pregunta ni historial sin partida activa', async () => {
    const fetchSpy = vi.fn();
    vi.stubGlobal('fetch', fetchSpy);

    await useGameStore.getState().askQuestion(DANIEL_ARRIVAL_QUESTION);

    const state = useGameStore.getState();
    expect(state.phase).toBe('title');
    expect(state.currentRequestId).toBeNull();
    expect(state.isInterrogationLoading).toBe(false);
    expect(state.callHistory.daniel).toEqual([]);
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it('finaliza como derrota por tiempo con timestamp nulo, sin crear solicitud ni historial', async () => {
    startActiveCall();
    useGameStore.setState({ timerEndTimestamp: null });

    await useGameStore.getState().askQuestion(DANIEL_ARRIVAL_QUESTION);

    const state = useGameStore.getState();
    expect(state.phase).toBe('defeat_time');
    expect(state.currentRequestId).toBeNull();
    expect(state.isInterrogationLoading).toBe(false);
    expect(state.callHistory.daniel).toEqual([]);
  });

  it('finaliza como derrota por tiempo con temporizador expirado', async () => {
    startActiveCall();
    useGameStore.setState({ timerEndTimestamp: Date.now() - 1 });

    await useGameStore.getState().askQuestion(DANIEL_ARRIVAL_QUESTION);

    const state = useGameStore.getState();
    expect(state.phase).toBe('defeat_time');
    expect(state.currentRequestId).toBeNull();
    expect(state.isInterrogationLoading).toBe(false);
    expect(state.callHistory.daniel).toEqual([]);
  });

  it('ignora la pregunta fuera de la vista de llamada aunque haya sospechoso y sesión', async () => {
    startActiveCall();
    useGameStore.setState({ activeView: 'evidence' });

    await useGameStore.getState().askQuestion(DANIEL_ARRIVAL_QUESTION);

    const state = useGameStore.getState();
    expect(state.activeCallSuspect).toBe('daniel');
    expect(state.callSessionId).not.toBeNull();
    expect(state.currentRequestId).toBeNull();
    expect(state.isInterrogationLoading).toBe(false);
    expect(state.callHistory.daniel).toEqual([]);
  });

  it('ignora la pregunta sin sospechoso en llamada', async () => {
    startActiveCall();
    useGameStore.setState({ activeCallSuspect: null });

    await useGameStore.getState().askQuestion(DANIEL_ARRIVAL_QUESTION);

    const state = useGameStore.getState();
    expect(state.currentRequestId).toBeNull();
    expect(state.isInterrogationLoading).toBe(false);
    expect(state.callHistory.daniel).toEqual([]);
  });

  it('ignora la pregunta sin sesión de llamada', async () => {
    startActiveCall();
    useGameStore.setState({ callSessionId: null });

    await useGameStore.getState().askQuestion(DANIEL_ARRIVAL_QUESTION);

    const state = useGameStore.getState();
    expect(state.activeCallSuspect).toBe('daniel');
    expect(state.currentRequestId).toBeNull();
    expect(state.isInterrogationLoading).toBe(false);
    expect(state.callHistory.daniel).toEqual([]);
  });

  it('ignora preguntas vacías o de solo espacios', async () => {
    startActiveCall();

    await useGameStore.getState().askQuestion('');
    await useGameStore.getState().askQuestion('   ');
    await useGameStore.getState().askQuestion('\n\t ');

    const state = useGameStore.getState();
    expect(state.currentRequestId).toBeNull();
    expect(state.isInterrogationLoading).toBe(false);
    expect(state.callHistory.daniel).toEqual([]);
  });

  it('ignora preguntas de más de 300 caracteres y acepta el límite exacto', async () => {
    startActiveCall();

    await useGameStore.getState().askQuestion('a'.repeat(301));

    expect(useGameStore.getState().callHistory.daniel).toEqual([]);
    expect(useGameStore.getState().currentRequestId).toBeNull();

    const limitQuestion = 'hora llegaste '.padEnd(300, 'x');
    expect(limitQuestion).toHaveLength(300);

    await useGameStore.getState().askQuestion(limitQuestion);

    const state = useGameStore.getState();
    expect(state.callHistory.daniel).toHaveLength(2);
    expect(state.callHistory.daniel[0]?.text).toBe(limitQuestion);
    expect(state.isInterrogationLoading).toBe(false);
  });

  it('tras superar las guardas genera el identificador interno y registra una sola pregunta antes de esperar', async () => {
    enableBedrock();
    const pending = stubDeferredFetch();
    startActiveCall();
    const sessionId = useGameStore.getState().callSessionId;

    const request = useGameStore.getState().askQuestion(DANIEL_ARRIVAL_QUESTION);

    const waiting = useGameStore.getState();
    expect(typeof waiting.currentRequestId).toBe('string');
    expect(waiting.currentRequestId).not.toBe('');
    expect(waiting.currentRequestId).not.toBe(sessionId);
    expect(waiting.isInterrogationLoading).toBe(true);
    expect(waiting.callHistory.daniel).toHaveLength(1);
    expect(waiting.callHistory.daniel[0]?.role).toBe('player');
    expect(waiting.callHistory.daniel[0]?.text).toBe(DANIEL_ARRIVAL_QUESTION);
    expect(waiting.registeredStatements.size).toBe(0);

    pendingAt(pending, 0).resolveWith({ text: 'Sin comentarios.', statementId: null });
    await request;

    expect(useGameStore.getState().callHistory.daniel).toHaveLength(2);
  });
});

// ============================================================================
// Superficie pública (propiedades 15, 20 y 31)
// ============================================================================

describe('superficie pública de interrogación', () => {
  it('expone exactamente las acciones aprobadas y ninguna prohibida', () => {
    const state: GameState = useGameStore.getState();
    const actionNames = Object.entries(state)
      .filter(([, value]) => typeof value === 'function')
      .map(([key]) => key)
      .sort();

    expect(actionNames).toEqual(PUBLIC_ACTIONS);
    for (const forbidden of FORBIDDEN_ACTIONS) {
      expect(Object.hasOwn(state, forbidden)).toBe(false);
    }
  });

  it('askQuestion recibe solo el texto de la pregunta', () => {
    expect(useGameStore.getState().askQuestion).toHaveLength(1);
    expect(useGameStore.getState().clearFeedback).toHaveLength(0);
  });

  it('solo startCall abre la vista de llamada y genera sesión', () => {
    useGameStore.getState().startGame();

    useGameStore.getState().openCaseFile();
    useGameStore.getState().openEvidence();
    useGameStore.getState().openAccusation();
    useGameStore.getState().returnToDesktop();

    const navigated = useGameStore.getState();
    expect(navigated.activeView).toBe('desktop');
    expect(navigated.callSessionId).toBeNull();
    expect(navigated.activeCallSuspect).toBeNull();

    useGameStore.getState().startCall('daniel');
    const firstSession = useGameStore.getState().callSessionId;
    expect(useGameStore.getState().activeView).toBe('call');
    expect(firstSession).not.toBeNull();

    useGameStore.getState().startCall('daniel');
    expect(useGameStore.getState().callSessionId).not.toBe(firstSession);
    expect(useGameStore.getState().callSessionId).not.toBeNull();
  });
});

// ============================================================================
// Modo local y endpoint ausente (propiedad 25, requisito 15.5)
// ============================================================================

describe('modo local y endpoint ausente', () => {
  beforeEach(() => {
    startActiveCall();
  });

  it('no usa fetch en modo local y aplica la respuesta local completa', async () => {
    const fetchSpy = vi.fn();
    vi.stubGlobal('fetch', fetchSpy);

    await useGameStore.getState().askQuestion(DANIEL_ARRIVAL_QUESTION);

    const state = useGameStore.getState();
    expect(fetchSpy).not.toHaveBeenCalled();
    expect(state.callHistory.daniel).toHaveLength(2);
    expect(state.callHistory.daniel[1]?.text).toBe(DANIEL_ARRIVAL_TEXT);
    expect(state.callHistory.daniel[1]?.statementId).toBe('stmt_daniel_arrival');
    expect(state.registeredStatements.has('stmt_daniel_arrival')).toBe(true);
    expect(state.isInterrogationLoading).toBe(false);
  });

  it('no usa fetch cuando falta el endpoint aunque el modo pida Bedrock', async () => {
    const mutable: AppConfig = config;
    mutable.interrogationMode = 'bedrock';
    mutable.apiUrl = null;
    const fetchSpy = vi.fn();
    vi.stubGlobal('fetch', fetchSpy);

    await useGameStore.getState().askQuestion(UNKNOWN_QUESTION);

    const state = useGameStore.getState();
    expect(fetchSpy).not.toHaveBeenCalled();
    expect(state.callHistory.daniel[1]?.text).toBe(DANIEL_GENERIC_TEXT);
    expect(state.registeredStatements.size).toBe(0);
    expect(state.isInterrogationLoading).toBe(false);
  });
});

// ============================================================================
// Descarte total de Bedrock (propiedades 13, 14, 25 y 26)
// ============================================================================

describe('descarte íntegro de respuestas de Bedrock', () => {
  beforeEach(() => {
    enableBedrock();
    startActiveCall();
  });

  it.each([
    ['campos extra', { text: 'Texto remoto.', statementId: null, points: 99 }],
    ['campo faltante', { text: 'Texto remoto.' }],
    ['tipo erróneo en text', { text: 42, statementId: null }],
    ['tipo erróneo en statementId', { text: 'Texto remoto.', statementId: 7 }],
    ['texto vacío', { text: '   ', statementId: null }],
    ['texto de más de 500', { text: 'a'.repeat(501), statementId: null }],
    ['declaración desconocida', { text: 'Texto remoto.', statementId: 'stmt_desconocida' }],
    ['declaración de otro sospechoso', { text: 'Texto remoto.', statementId: 'stmt_elena_arrival' }],
    ['carga no objeto', 'Texto remoto.'],
    ['carga nula', null],
  ])('descarta la respuesta remota con %s y usa la candidata local completa', async (_label, payload) => {
    vi.stubGlobal(
      'fetch',
      vi.fn(() => Promise.resolve(jsonResponse(payload))),
    );

    await useGameStore.getState().askQuestion(DANIEL_ARRIVAL_QUESTION);

    const state = useGameStore.getState();
    expect(state.callHistory.daniel).toHaveLength(2);
    expect(state.callHistory.daniel[1]?.text).toBe(DANIEL_ARRIVAL_TEXT);
    expect(state.callHistory.daniel[1]?.statementId).toBe('stmt_daniel_arrival');
    expect(state.registeredStatements).toEqual(new Set(['stmt_daniel_arrival']));
    expect(state.isInterrogationLoading).toBe(false);
    expect(state.currentRequestId).toBeNull();
  });

  it('descarta un cuerpo que no es JSON válido', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(() => Promise.resolve(new Response('esto no es json', { status: 200 }))),
    );

    await useGameStore.getState().askQuestion(DANIEL_ARRIVAL_QUESTION);

    const state = useGameStore.getState();
    expect(state.callHistory.daniel[1]?.text).toBe(DANIEL_ARRIVAL_TEXT);
    expect(state.isInterrogationLoading).toBe(false);
  });

  it('descarta un error del backend y usa la candidata local', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(() => Promise.resolve(new Response('{}', { status: 502 }))),
    );

    await useGameStore.getState().askQuestion(DANIEL_ARRIVAL_QUESTION);

    expect(useGameStore.getState().callHistory.daniel[1]?.text).toBe(DANIEL_ARRIVAL_TEXT);
    expect(useGameStore.getState().isInterrogationLoading).toBe(false);
  });

  it('descarta un fallo de red y usa la candidata local', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(() => Promise.reject(new Error('red caída'))),
    );

    await useGameStore.getState().askQuestion(DANIEL_ARRIVAL_QUESTION);

    expect(useGameStore.getState().callHistory.daniel[1]?.text).toBe(DANIEL_ARRIVAL_TEXT);
    expect(useGameStore.getState().isInterrogationLoading).toBe(false);
  });

  it('descarta una solicitud expirada por timeout y usa la candidata local', async () => {
    enableBedrock(10);
    vi.stubGlobal(
      'fetch',
      vi.fn(
        (_url: string, init?: RequestInit) =>
          new Promise<Response>((_resolve, reject) => {
            init?.signal?.addEventListener('abort', () => {
              reject(new Error('abortada'));
            });
          }),
      ),
    );

    await useGameStore.getState().askQuestion(DANIEL_ARRIVAL_QUESTION);

    const state = useGameStore.getState();
    expect(state.callHistory.daniel[1]?.text).toBe(DANIEL_ARRIVAL_TEXT);
    expect(state.registeredStatements.has('stmt_daniel_arrival')).toBe(true);
    expect(state.isInterrogationLoading).toBe(false);
  });

  it('una respuesta remota válida no altera puntuación, presión, contradicciones ni fase', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(() =>
        Promise.resolve(
          jsonResponse({ text: 'Está bien, confieso todo.', statementId: 'stmt_daniel_office' }),
        ),
      ),
    );

    await useGameStore.getState().askQuestion(DANIEL_ARRIVAL_QUESTION);

    const state = useGameStore.getState();
    expect(state.callHistory.daniel[1]?.text).toBe('Está bien, confieso todo.');
    expect(state.registeredStatements.has('stmt_daniel_office')).toBe(true);
    expect(state.phase).toBe('active');
    expect(state.score).toBe(0);
    expect(state.suspectPressure.daniel).toBe(0);
    expect(state.discoveredContradictions.size).toBe(0);
  });
});

// ============================================================================
// Revalidación defensiva y candidata local corrupta (propiedades 25 y 30)
// ============================================================================

describe('revalidación antes del commit', () => {
  beforeEach(() => {
    startActiveCall();
  });

  it('sustituye una candidata local corrupta por la genérica válida del mismo sospechoso', async () => {
    const corrupted: LocalResponseDef = {
      ...catalogEntry('resp_daniel_arrival'),
      statementId: 'stmt_elena_arrival',
    };
    replaceCatalog([corrupted, catalogEntry('resp_daniel_generic')]);

    await useGameStore.getState().askQuestion(DANIEL_ARRIVAL_QUESTION);

    const state = useGameStore.getState();
    expect(state.callHistory.daniel).toHaveLength(2);
    expect(state.callHistory.daniel[1]?.text).toBe(DANIEL_GENERIC_TEXT);
    expect(state.callHistory.daniel[1]?.statementId).toBeUndefined();
    expect(state.registeredStatements.size).toBe(0);
    expect(state.isInterrogationLoading).toBe(false);
    expect(state.currentRequestId).toBeNull();
  });

  it('sin genérica válida solo termina el loading, sin historial ni declaraciones nuevas', async () => {
    const corrupted: LocalResponseDef = {
      ...catalogEntry('resp_daniel_arrival'),
      text: '   ',
    };
    replaceCatalog([corrupted]);

    await useGameStore.getState().askQuestion(DANIEL_ARRIVAL_QUESTION);

    const state = useGameStore.getState();
    expect(state.callHistory.daniel).toHaveLength(1);
    expect(state.callHistory.daniel[0]?.role).toBe('player');
    expect(state.registeredStatements.size).toBe(0);
    expect(state.isInterrogationLoading).toBe(false);
    expect(state.currentRequestId).toBeNull();
    expect(state.phase).toBe('active');
  });
});

// ============================================================================
// Orden post-await (propiedades 12 y 23)
// ============================================================================

describe('orden literal de comprobaciones tras el await', () => {
  it('ignora la respuesta cuando la partida ya terminó, sin modificar el estado final', async () => {
    enableBedrock();
    const pending = stubDeferredFetch();
    startActiveCall();

    const request = useGameStore.getState().askQuestion(DANIEL_ARRIVAL_QUESTION);
    useGameStore.getState().submitAccusation(WRONG_ACCUSATION);
    const finished = useGameStore.getState();

    pendingAt(pending, 0).resolveWith({ text: 'Respuesta tardía.', statementId: null });
    await request;

    const state = useGameStore.getState();
    expect(state.phase).toBe('defeat_accusation');
    expect(state.score).toBe(finished.score);
    expect(state.callHistory.daniel).toHaveLength(1);
    expect(state.registeredStatements.size).toBe(0);
    expect(state.isInterrogationLoading).toBe(false);
  });

  it('comprueba la fase antes del temporizador: partida terminada con timestamp nulo no produce derrota por tiempo', async () => {
    enableBedrock();
    const pending = stubDeferredFetch();
    startActiveCall();

    const request = useGameStore.getState().askQuestion(DANIEL_ARRIVAL_QUESTION);
    useGameStore.getState().submitAccusation(WRONG_ACCUSATION);
    useGameStore.setState({ timerEndTimestamp: null });

    pendingAt(pending, 0).resolveWith({ text: 'Respuesta tardía.', statementId: null });
    await request;

    expect(useGameStore.getState().phase).toBe('defeat_accusation');
  });

  it('un timestamp nulo durante la espera produce derrota por tiempo y limpia el loading de la solicitud vigente', async () => {
    enableBedrock();
    const pending = stubDeferredFetch();
    startActiveCall();

    const stale = useGameStore.getState().askQuestion(DANIEL_ARRIVAL_QUESTION);
    // Nueva llamada al mismo sospechoso: sesión y solicitud anteriores quedan obsoletas.
    useGameStore.getState().startCall('daniel');
    const fresh = useGameStore.getState().askQuestion(DANIEL_ARRIVAL_QUESTION);
    expect(useGameStore.getState().isInterrogationLoading).toBe(true);

    useGameStore.setState({ timerEndTimestamp: null });
    pendingAt(pending, 0).resolveWith({ text: 'Respuesta obsoleta.', statementId: null });
    await stale;

    const state = useGameStore.getState();
    expect(state.phase).toBe('defeat_time');
    expect(state.isInterrogationLoading).toBe(false);
    expect(state.currentRequestId).toBeNull();

    pendingAt(pending, 1).resolveWith({ text: 'Respuesta posterior.', statementId: null });
    await fresh;
    expect(useGameStore.getState().phase).toBe('defeat_time');
  });

  it('un temporizador expirado durante la espera produce derrota por tiempo con sospechoso obsoleto', async () => {
    enableBedrock();
    const pending = stubDeferredFetch();
    startActiveCall();

    const stale = useGameStore.getState().askQuestion(DANIEL_ARRIVAL_QUESTION);
    useGameStore.getState().startCall('elena');
    const fresh = useGameStore.getState().askQuestion('¿A qué hora llegaste?');
    expect(useGameStore.getState().isInterrogationLoading).toBe(true);

    useGameStore.setState({ timerEndTimestamp: Date.now() - 1 });
    pendingAt(pending, 0).resolveWith({ text: 'Respuesta obsoleta.', statementId: null });
    await stale;

    const state = useGameStore.getState();
    expect(state.phase).toBe('defeat_time');
    expect(state.isInterrogationLoading).toBe(false);
    expect(state.callHistory.daniel).toHaveLength(1);
    expect(state.callHistory.elena).toHaveLength(1);
    expect(state.registeredStatements.size).toBe(0);

    pendingAt(pending, 1).rejectWith(new Error('cancelada'));
    await fresh;
  });
});

// ============================================================================
// Respuestas obsoletas con temporizador válido (propiedades 11, 24 y 29)
// ============================================================================

describe('respuestas obsoletas con temporizador válido', () => {
  beforeEach(() => {
    enableBedrock();
  });

  it('ignora la respuesta de una sesión anterior al mismo sospechoso sin pisar el loading nuevo', async () => {
    const pending = stubDeferredFetch();
    startActiveCall();

    const stale = useGameStore.getState().askQuestion(DANIEL_ARRIVAL_QUESTION);
    useGameStore.getState().startCall('daniel');
    const fresh = useGameStore.getState().askQuestion(DANIEL_ARRIVAL_QUESTION);
    const freshRequestId = useGameStore.getState().currentRequestId;

    // La solicitud vieja falla: no debe limpiar el loading de la nueva.
    pendingAt(pending, 0).rejectWith(new Error('red caída'));
    await stale;

    const duringFresh = useGameStore.getState();
    expect(duringFresh.isInterrogationLoading).toBe(true);
    expect(duringFresh.currentRequestId).toBe(freshRequestId);
    expect(duringFresh.callHistory.daniel).toHaveLength(2);
    expect(duringFresh.registeredStatements.size).toBe(0);

    pendingAt(pending, 1).resolveWith({ text: 'Respuesta vigente.', statementId: null });
    await fresh;

    const state = useGameStore.getState();
    expect(state.callHistory.daniel).toHaveLength(3);
    expect(state.callHistory.daniel[2]?.text).toBe('Respuesta vigente.');
    expect(state.isInterrogationLoading).toBe(false);
  });

  it('ignora la respuesta de una solicitud anterior de la misma sesión', async () => {
    const pending = stubDeferredFetch();
    startActiveCall();

    const stale = useGameStore.getState().askQuestion(DANIEL_ARRIVAL_QUESTION);
    const fresh = useGameStore.getState().askQuestion('¿Entraste a la oficina de Marcos?');

    pendingAt(pending, 0).resolveWith({
      text: 'Respuesta obsoleta.',
      statementId: 'stmt_daniel_substance',
    });
    await stale;

    const duringFresh = useGameStore.getState();
    expect(duringFresh.callHistory.daniel).toHaveLength(2);
    expect(duringFresh.registeredStatements.size).toBe(0);
    expect(duringFresh.isInterrogationLoading).toBe(true);

    pendingAt(pending, 1).resolveWith({
      text: 'Respuesta vigente.',
      statementId: 'stmt_daniel_office',
    });
    await fresh;

    const state = useGameStore.getState();
    expect(state.callHistory.daniel).toHaveLength(3);
    expect(state.registeredStatements).toEqual(new Set(['stmt_daniel_office']));
    expect(state.isInterrogationLoading).toBe(false);
  });

  it('ignora la respuesta cuando la llamada terminó, sin tocar historial ni loading', async () => {
    const pending = stubDeferredFetch();
    startActiveCall();

    const request = useGameStore.getState().askQuestion(DANIEL_ARRIVAL_QUESTION);
    useGameStore.getState().endCall();

    pendingAt(pending, 0).resolveWith({
      text: 'Respuesta tras cerrar.',
      statementId: 'stmt_daniel_arrival',
    });
    await request;

    const state = useGameStore.getState();
    expect(state.activeView).toBe('desktop');
    expect(state.callHistory.daniel).toHaveLength(1);
    expect(state.registeredStatements.size).toBe(0);
    expect(state.isInterrogationLoading).toBe(false);
    expect(state.currentRequestId).toBeNull();
  });
});

// ============================================================================
// Commit final atómico (propiedades 27 y 28)
// ============================================================================

describe('commit final único y atómico', () => {
  beforeEach(() => {
    enableBedrock();
  });

  it('agrega solo el mensaje del sospechoso y su declaración, con copias nuevas', async () => {
    const pending = stubDeferredFetch();
    startActiveCall();

    const request = useGameStore.getState().askQuestion(DANIEL_ARRIVAL_QUESTION);
    const beforeHistory = useGameStore.getState().callHistory;
    const beforeMessages = beforeHistory.daniel;
    const beforeStatements = useGameStore.getState().registeredStatements;

    pendingAt(pending, 0).resolveWith({
      text: 'Llegué a las 20:50, lo mantengo.',
      statementId: 'stmt_daniel_arrival',
    });
    await request;

    const state = useGameStore.getState();
    expect(state.callHistory.daniel).toHaveLength(2);
    expect(state.callHistory.daniel[0]?.role).toBe('player');
    expect(state.callHistory.daniel[1]?.role).toBe('suspect');
    expect(state.callHistory.daniel[1]?.text).toBe('Llegué a las 20:50, lo mantengo.');
    expect(state.callHistory.daniel[1]?.statementId).toBe('stmt_daniel_arrival');
    expect(state.registeredStatements).toEqual(new Set(['stmt_daniel_arrival']));
    expect(state.callHistory).not.toBe(beforeHistory);
    expect(state.callHistory.daniel).not.toBe(beforeMessages);
    expect(state.registeredStatements).not.toBe(beforeStatements);
    expect(beforeMessages).toHaveLength(1);
    expect(beforeStatements.size).toBe(0);
    expect(state.isInterrogationLoading).toBe(false);
    expect(state.currentRequestId).toBeNull();
  });

  it('no repite la pregunta y conserva los mensajes añadidos durante la espera', async () => {
    const pending = stubDeferredFetch();
    startActiveCall();

    const request = useGameStore.getState().askQuestion(DANIEL_ARRIVAL_QUESTION);

    const concurrent: ChatMessage = {
      role: 'suspect',
      text: 'Mensaje concurrente.',
      timestamp: 1,
    };
    useGameStore.setState((state) => ({
      callHistory: {
        ...state.callHistory,
        daniel: [...state.callHistory.daniel, concurrent],
      },
    }));

    pendingAt(pending, 0).resolveWith({ text: 'Respuesta vigente.', statementId: null });
    await request;

    const messages = historyOf('daniel');
    expect(messages).toHaveLength(3);
    expect(messages[0]?.text).toBe(DANIEL_ARRIVAL_QUESTION);
    expect(messages[1]?.text).toBe('Mensaje concurrente.');
    expect(messages[2]?.text).toBe('Respuesta vigente.');
    expect(messages.filter((message) => message.role === 'player')).toHaveLength(1);
  });
});

// ============================================================================
// Limpieza de loading y cancelación (propiedad 29)
// ============================================================================

describe('limpieza de loading y cancelación de solicitudes', () => {
  beforeEach(() => {
    enableBedrock();
  });

  it('startCall limpia el loading y cancela la solicitud anterior', async () => {
    const pending = stubDeferredFetch();
    startActiveCall();

    const request = useGameStore.getState().askQuestion(DANIEL_ARRIVAL_QUESTION);
    expect(useGameStore.getState().isInterrogationLoading).toBe(true);

    useGameStore.getState().startCall('elena');

    const state = useGameStore.getState();
    expect(state.isInterrogationLoading).toBe(false);
    expect(state.currentRequestId).toBeNull();
    expect(pendingAt(pending, 0).signal?.aborted).toBe(true);

    pendingAt(pending, 0).rejectWith(new Error('abortada'));
    await request;
    expect(useGameStore.getState().isInterrogationLoading).toBe(false);
  });

  it('endCall limpia el loading, vuelve al escritorio y cancela la solicitud', async () => {
    const pending = stubDeferredFetch();
    startActiveCall();

    const request = useGameStore.getState().askQuestion(DANIEL_ARRIVAL_QUESTION);
    useGameStore.getState().endCall();

    const state = useGameStore.getState();
    expect(state.activeView).toBe('desktop');
    expect(state.isInterrogationLoading).toBe(false);
    expect(state.currentRequestId).toBeNull();
    expect(state.callSessionId).toBeNull();
    expect(pendingAt(pending, 0).signal?.aborted).toBe(true);

    pendingAt(pending, 0).rejectWith(new Error('abortada'));
    await request;
  });

  it('resetGame limpia el loading y la solicitud pendiente', async () => {
    const pending = stubDeferredFetch();
    startActiveCall();

    const request = useGameStore.getState().askQuestion(DANIEL_ARRIVAL_QUESTION);
    useGameStore.getState().resetGame();

    const state = useGameStore.getState();
    expect(state.phase).toBe('title');
    expect(state.isInterrogationLoading).toBe(false);
    expect(state.currentRequestId).toBeNull();
    expect(state.callHistory.daniel).toEqual([]);
    expect(pendingAt(pending, 0).signal?.aborted).toBe(true);

    pendingAt(pending, 0).rejectWith(new Error('abortada'));
    await request;
    expect(useGameStore.getState().callHistory.daniel).toEqual([]);
  });

  it('la finalización de la partida limpia el loading de la solicitud en curso', async () => {
    const pending = stubDeferredFetch();
    startActiveCall();

    const request = useGameStore.getState().askQuestion(DANIEL_ARRIVAL_QUESTION);
    useGameStore.getState().triggerTimeDefeat();

    const state = useGameStore.getState();
    expect(state.phase).toBe('defeat_time');
    expect(state.isInterrogationLoading).toBe(false);
    expect(state.currentRequestId).toBeNull();
    expect(pendingAt(pending, 0).signal?.aborted).toBe(true);

    pendingAt(pending, 0).rejectWith(new Error('abortada'));
    await request;
    expect(useGameStore.getState().phase).toBe('defeat_time');
  });
});
