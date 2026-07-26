/**
 * Pruebas mínimas del flujo de interrogación asíncrona de la tarea 3.4:
 * guardas previas, registro único de la pregunta, fallback local obligatorio,
 * validación del contrato de Bedrock, orden posterior al `await` y commit final
 * atómico. La batería completa de concurrencia pertenece al grupo 3.7.
 *
 * Requisitos: 6.3-6.9, 7.7-7.9, 11.6, 14.4, 16.1-16.6
 */

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { config } from '@/config';
import { STATEMENTS } from '@/data/statements';
import { createInitialGameSessionState, useGameStore } from '@/store/gameStore';
import type { AppConfig, InterrogationMode } from '@/config';

const DANIEL_ARRIVAL_QUESTION = '¿A qué hora llegaste al edificio?';
const UNKNOWN_QUESTION = '¿Te gusta la jardinería tropical?';

const originalMode: InterrogationMode = config.interrogationMode;
const originalApiUrl: string | null = config.apiUrl;
const originalTimeout: number = config.requestTimeoutMs;

function resetStore(): void {
  useGameStore.setState(createInitialGameSessionState());
}

function startActiveCall(): void {
  useGameStore.getState().startGame();
  useGameStore.getState().startCall('daniel');
}

/** Activa el modo remoto sin tocar el resto de la configuración aprobada. */
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

interface DeferredFetchControl {
  release: (() => void) | null;
}

/** `fetch` que solo responde cuando la prueba lo libera explícitamente. */
function stubDeferredFetch(): DeferredFetchControl {
  const control: DeferredFetchControl = { release: null };
  vi.stubGlobal(
    'fetch',
    vi.fn(
      () =>
        new Promise<Response>((resolve) => {
          control.release = () => {
            resolve(jsonResponse({ text: 'Respuesta tardía.', statementId: null }));
          };
        }),
    ),
  );

  return control;
}

afterEach(() => {
  const mutable: AppConfig = config;
  mutable.interrogationMode = originalMode;
  mutable.apiUrl = originalApiUrl;
  mutable.requestTimeoutMs = originalTimeout;
  vi.unstubAllGlobals();
});

describe('askQuestion: guardas previas', () => {
  beforeEach(resetStore);

  it('no crea solicitud, loading, pregunta ni historial sin partida activa', async () => {
    await useGameStore.getState().askQuestion(DANIEL_ARRIVAL_QUESTION);

    const state = useGameStore.getState();
    expect(state.currentRequestId).toBeNull();
    expect(state.isInterrogationLoading).toBe(false);
    expect(state.callHistory.daniel).toEqual([]);
  });

  it('no registra nada fuera de una llamada activa', async () => {
    useGameStore.getState().startGame();

    await useGameStore.getState().askQuestion(DANIEL_ARRIVAL_QUESTION);

    const state = useGameStore.getState();
    expect(state.currentRequestId).toBeNull();
    expect(state.isInterrogationLoading).toBe(false);
    expect(state.callHistory.daniel).toEqual([]);
  });

  it('rechaza preguntas vacías, de solo espacios y de más de 300 caracteres', async () => {
    startActiveCall();

    await useGameStore.getState().askQuestion('');
    await useGameStore.getState().askQuestion('    ');
    await useGameStore.getState().askQuestion('a'.repeat(301));

    const state = useGameStore.getState();
    expect(state.callHistory.daniel).toEqual([]);
    expect(state.currentRequestId).toBeNull();
    expect(state.isInterrogationLoading).toBe(false);
  });

  it('finaliza por tiempo cuando el temporizador es nulo o ya expiró', async () => {
    startActiveCall();
    useGameStore.setState({ timerEndTimestamp: null });

    await useGameStore.getState().askQuestion(DANIEL_ARRIVAL_QUESTION);

    expect(useGameStore.getState().phase).toBe('defeat_time');
    expect(useGameStore.getState().callHistory.daniel).toEqual([]);

    resetStore();
    startActiveCall();
    useGameStore.setState({ timerEndTimestamp: Date.now() - 1 });

    await useGameStore.getState().askQuestion(DANIEL_ARRIVAL_QUESTION);

    const state = useGameStore.getState();
    expect(state.phase).toBe('defeat_time');
    expect(state.callHistory.daniel).toEqual([]);
    expect(state.isInterrogationLoading).toBe(false);
  });
});

describe('askQuestion: modo local', () => {
  beforeEach(() => {
    resetStore();
    startActiveCall();
  });

  it('registra la pregunta una vez y la respuesta local con su declaración', async () => {
    const fetchSpy = vi.fn();
    vi.stubGlobal('fetch', fetchSpy);

    await useGameStore.getState().askQuestion(DANIEL_ARRIVAL_QUESTION);

    const state = useGameStore.getState();
    const history = state.callHistory.daniel;
    expect(fetchSpy).not.toHaveBeenCalled();
    expect(history).toHaveLength(2);
    expect(history[0]?.role).toBe('player');
    expect(history[0]?.text).toBe(DANIEL_ARRIVAL_QUESTION);
    expect(history[1]?.role).toBe('suspect');
    expect(history[1]?.text).toBe(STATEMENTS.stmt_daniel_arrival.canonicalText);
    expect(history[1]?.statementId).toBe('stmt_daniel_arrival');
    expect(state.registeredStatements.has('stmt_daniel_arrival')).toBe(true);
    expect(state.currentRequestId).toBeNull();
    expect(state.isInterrogationLoading).toBe(false);
  });

  it('usa la genérica del sospechoso sin registrar declaración', async () => {
    await useGameStore.getState().askQuestion(UNKNOWN_QUESTION);

    const state = useGameStore.getState();
    const history = state.callHistory.daniel;
    expect(history).toHaveLength(2);
    expect(history[1]?.statementId).toBeUndefined();
    expect(state.registeredStatements.size).toBe(0);
    expect(state.score).toBe(0);
    expect(state.suspectPressure.daniel).toBe(0);
  });
});

describe('askQuestion: contrato de Bedrock y fallback', () => {
  beforeEach(() => {
    resetStore();
    startActiveCall();
  });

  it('acepta una respuesta remota que cumple el contrato completo', async () => {
    enableBedrock();
    const fetchSpy = vi.fn(() =>
      Promise.resolve(
        jsonResponse({ text: 'Llegué tarde, lo admito.', statementId: 'stmt_daniel_office' }),
      ),
    );
    vi.stubGlobal('fetch', fetchSpy);

    await useGameStore.getState().askQuestion(DANIEL_ARRIVAL_QUESTION);

    const state = useGameStore.getState();
    expect(fetchSpy).toHaveBeenCalledTimes(1);
    expect(state.callHistory.daniel[1]?.text).toBe('Llegué tarde, lo admito.');
    expect(state.registeredStatements.has('stmt_daniel_office')).toBe(true);
    expect(state.isInterrogationLoading).toBe(false);
  });

  it('envía solo sospechoso, pregunta y contexto permitido', async () => {
    enableBedrock();
    const sent: { url: string; body: string }[] = [];
    vi.stubGlobal(
      'fetch',
      vi.fn((url: string, init?: RequestInit) => {
        sent.push({ url, body: typeof init?.body === 'string' ? init.body : '' });

        return Promise.resolve(jsonResponse({ text: 'Sin comentarios.', statementId: null }));
      }),
    );

    await useGameStore.getState().askQuestion(DANIEL_ARRIVAL_QUESTION);

    expect(sent).toHaveLength(1);
    expect(sent[0]?.url).toBe('https://example.invalid/prod/interrogate');
    expect(JSON.parse(sent[0]?.body ?? '')).toEqual({
      suspectId: 'daniel',
      question: DANIEL_ARRIVAL_QUESTION,
      gameContext: { discoveredContradictionIds: [], suspectPressure: 0 },
    });
  });

  it.each([
    ['campos extra', { text: 'Hola.', statementId: null, points: 10 }],
    ['texto vacío', { text: '   ', statementId: null }],
    ['texto mayor a 500', { text: 'a'.repeat(501), statementId: null }],
    ['declaración desconocida', { text: 'Hola.', statementId: 'stmt_unknown' }],
    ['declaración de otro sospechoso', { text: 'Hola.', statementId: 'stmt_elena_arrival' }],
    ['tipo incorrecto', { text: 42, statementId: null }],
  ])('descarta la respuesta remota con %s y usa la candidata local', async (_label, payload) => {
    enableBedrock();
    vi.stubGlobal(
      'fetch',
      vi.fn(() => Promise.resolve(jsonResponse(payload))),
    );

    await useGameStore.getState().askQuestion(DANIEL_ARRIVAL_QUESTION);

    const state = useGameStore.getState();
    expect(state.callHistory.daniel[1]?.text).toBe(STATEMENTS.stmt_daniel_arrival.canonicalText);
    expect(state.registeredStatements.has('stmt_daniel_arrival')).toBe(true);
    expect(state.isInterrogationLoading).toBe(false);
  });

  it('usa la candidata local cuando la solicitud remota falla', async () => {
    enableBedrock();
    vi.stubGlobal(
      'fetch',
      vi.fn(() => Promise.reject(new Error('red caída'))),
    );

    await useGameStore.getState().askQuestion(DANIEL_ARRIVAL_QUESTION);

    const state = useGameStore.getState();
    expect(state.callHistory.daniel).toHaveLength(2);
    expect(state.callHistory.daniel[1]?.text).toBe(STATEMENTS.stmt_daniel_arrival.canonicalText);
    expect(state.isInterrogationLoading).toBe(false);
  });

  it('usa la candidata local cuando la solicitud remota expira', async () => {
    enableBedrock(10);
    vi.stubGlobal(
      'fetch',
      vi.fn((_url: string, init?: RequestInit) => {
        const signal = init?.signal ?? null;

        return new Promise<Response>((_resolve, reject) => {
          signal?.addEventListener('abort', () => {
            reject(new Error('abortada'));
          });
        });
      }),
    );

    await useGameStore.getState().askQuestion(DANIEL_ARRIVAL_QUESTION);

    const state = useGameStore.getState();
    expect(state.callHistory.daniel).toHaveLength(2);
    expect(state.callHistory.daniel[1]?.text).toBe(STATEMENTS.stmt_daniel_arrival.canonicalText);
    expect(state.isInterrogationLoading).toBe(false);
  });
});

describe('askQuestion: respuestas obsoletas', () => {
  beforeEach(() => {
    resetStore();
    startActiveCall();
  });

  it('ignora la respuesta si la llamada terminó, sin tocar el loading', async () => {
    enableBedrock();
    const control = stubDeferredFetch();

    const pending = useGameStore.getState().askQuestion(DANIEL_ARRIVAL_QUESTION);
    expect(useGameStore.getState().isInterrogationLoading).toBe(true);

    useGameStore.getState().endCall();
    control.release?.();
    await pending;

    const state = useGameStore.getState();
    expect(state.callHistory.daniel).toHaveLength(1);
    expect(state.registeredStatements.size).toBe(0);
    expect(state.isInterrogationLoading).toBe(false);
    expect(state.currentRequestId).toBeNull();
  });

  it('finaliza por tiempo si el temporizador expira durante la espera', async () => {
    enableBedrock();
    const control = stubDeferredFetch();

    const pending = useGameStore.getState().askQuestion(DANIEL_ARRIVAL_QUESTION);
    useGameStore.setState({ timerEndTimestamp: Date.now() - 1 });
    control.release?.();
    await pending;

    const state = useGameStore.getState();
    expect(state.phase).toBe('defeat_time');
    expect(state.callHistory.daniel).toHaveLength(1);
    expect(state.isInterrogationLoading).toBe(false);
    expect(state.currentRequestId).toBeNull();
  });
});
