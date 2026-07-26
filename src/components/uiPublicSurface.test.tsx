/**
 * Grupo de pruebas (f): superficie pública y flujos críticos de la UI.
 *
 * Cubre lo que los grupos anteriores dejaron explícitamente para la tarea 4.7:
 * qué entrega exactamente la UI al store (texto en `askQuestion`,
 * `AccusationInput` en `submitAccusation`, la pareja congelada en
 * `presentEvidence`), qué no puede entregar ni invocar, cómo se comporta el
 * arrastre con puntero y teclado, cómo se distinguen los cuatro feedbacks y las
 * cuatro maneras de terminar una partida local con su reinicio completo.
 *
 * Las combinaciones válidas de arrastre necesitan geometría real y viven en la
 * suite Playwright (`e2e-tests/call.spec.ts`); aquí se prueba lo que jsdom sí
 * decide de forma determinista: que soltar fuera de una declaración no evalúa
 * nada y que la UI nunca fabrica el resultado.
 *
 * Propiedades de superficie pública cubiertas: 5, 7, 15, 17, 20, 21 y 31.
 *
 * Requisitos: 2.1-2.5, 3.1-3.3, 4.1-4.3, 5.1-5.5, 6.1-6.11, 8.1, 8.9-8.10,
 * 9.1-9.5, 10.2-10.4, 12.1-12.9, 13.2-13.11, 14.1, 14.4, 15.2-15.6, 20.1-20.6
 */

import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { App } from '@/App';
import { CallPanel } from '@/components/call/CallPanel';
import { GameScreen } from '@/components/screens/GameScreen';
import { SOLUTION } from '@/data/solution';
import { STATEMENTS } from '@/data/statements';
import type {
  AccusationInput,
  ActiveView,
  ContradictionOutcome,
  GameActions,
  GameSessionState,
  StatementId,
} from '@/data/types';
import { EVIDENCE_VIEWS, SUSPECT_PROFILE_VIEWS } from '@/data/viewModels';
import { createInitialGameSessionState, useGameStore } from '@/store/gameStore';
import { PERSISTENCE_KEY } from '@/store/persistence';

interface MountedTree {
  root: Root;
  container: HTMLDivElement;
}

const mounted: MountedTree[] = [];

/** Instante fijo de referencia: toda cuenta atrás de estas pruebas parte de él. */
const FIXED_NOW = Date.UTC(2026, 2, 14, 21, 0, 0);

/** Tiempo restante usado en las partidas ya iniciadas por `setState`. */
const REMAINING_MS = 600_000;

/** Las tres declaraciones de Daniel necesarias para la confesión. */
const DANIEL_STATEMENTS: readonly StatementId[] = [
  'stmt_daniel_arrival',
  'stmt_daniel_office',
  'stmt_daniel_substance',
];

/** Acciones reales del store, restauradas tras las pruebas que las espían. */
const REAL_STORE = useGameStore.getState();

beforeAll(() => {
  (globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT?: boolean })
    .IS_REACT_ACT_ENVIRONMENT = true;
});

beforeEach(() => {
  useGameStore.setState({ ...REAL_STORE, ...createInitialGameSessionState() });
  sessionStorage.removeItem(PERSISTENCE_KEY);
});

afterEach(() => {
  for (const tree of mounted) {
    act(() => {
      tree.root.unmount();
    });
    tree.container.remove();
  }
  mounted.length = 0;
  vi.useRealTimers();
  sessionStorage.removeItem(PERSISTENCE_KEY);
});

function render(element: React.JSX.Element): HTMLDivElement {
  const container = document.createElement('div');
  document.body.append(container);
  const root = createRoot(container);
  mounted.push({ root, container });

  act(() => {
    root.render(element);
  });

  return container;
}

function query(container: HTMLElement, selector: string): HTMLElement {
  const element = container.querySelector<HTMLElement>(selector);
  if (element === null) {
    throw new Error(`No se encontró el elemento "${selector}".`);
  }

  return element;
}

function click(element: HTMLElement): void {
  act(() => {
    element.dispatchEvent(new MouseEvent('click', { bubbles: true }));
  });
}

function getButton(container: HTMLElement, label: string): HTMLElement {
  const match = [...container.querySelectorAll('button')].find(
    (button) => button.textContent.trim() === label,
  );

  if (match === undefined) {
    throw new Error(`No se encontró el botón "${label}".`);
  }

  return match;
}

function navigate(container: HTMLElement, view: ActiveView): void {
  click(query(container, `nav button[data-view="${view}"]`));
}

/** Escribe en el área de preguntas notificando al rastreador de React. */
function typeQuestion(container: HTMLElement, value: string): void {
  const textarea = query(container, '#call-question') as HTMLTextAreaElement;
  act(() => {
    Object.getOwnPropertyDescriptor(HTMLTextAreaElement.prototype, 'value')?.set?.call(
      textarea,
      value,
    );
    textarea.dispatchEvent(new Event('input', { bubbles: true }));
  });
}

async function submitQuestion(container: HTMLElement): Promise<void> {
  const form = query(container, 'form');
  await act(async () => {
    form.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }));
    await Promise.resolve();
  });
}

/** Marca una opción del tablero de acusación disparando el evento nativo. */
function choose(container: HTMLElement, selector: string): void {
  const input = query(container, selector) as HTMLInputElement;
  act(() => {
    input.click();
  });
}

function fillAccusation(container: HTMLElement, accusation: AccusationInput): void {
  choose(container, `input[data-suspect-choice="${accusation.suspectId}"]`);
  choose(container, `input[data-motive-choice="${accusation.motiveId}"]`);
  choose(container, `input[data-method-choice="${accusation.methodId}"]`);
  for (const evidenceId of accusation.evidenceIds) {
    choose(container, `input[data-evidence-choice="${evidenceId}"]`);
  }
}

/**
 * `PointerEvent` no existe en jsdom y el sensor de puntero exige un puntero
 * primario, así que se construye el evento equivalente a mano.
 */
function pointerEvent(type: string, x: number, y: number): MouseEvent {
  const event = new MouseEvent(type, { bubbles: true, cancelable: true, clientX: x, clientY: y });
  Object.defineProperty(event, 'isPrimary', { value: true });

  return event;
}

function keyEvent(code: string): KeyboardEvent {
  return new KeyboardEvent('keydown', {
    key: code === 'Space' ? ' ' : 'Escape',
    code,
    bubbles: true,
    cancelable: true,
  });
}

/**
 * @dnd-kit registra sus escuchas de teclado en un `setTimeout`, de modo que un
 * arrastre recién iniciado todavía no reacciona a Escape ni al segundo Espacio.
 */
async function flushSensors(): Promise<void> {
  await act(async () => {
    await new Promise((resolve) => {
      setTimeout(resolve, 20);
    });
  });
}

/** Partida activa lista para jugarse, con la llamada indicada ya abierta. */
function activateGame(overrides: Partial<GameSessionState> = {}): void {
  useGameStore.setState({
    ...createInitialGameSessionState(),
    phase: 'active',
    activeView: 'desktop',
    timerEndTimestamp: Date.now() + REMAINING_MS,
    ...overrides,
  });
}

/** Llamada a Daniel con sus tres declaraciones ya registradas. */
function activateCallWithStatements(): void {
  activateGame({
    activeView: 'call',
    activeCallSuspect: 'daniel',
    callSessionId: 'call-fijo',
    registeredStatements: new Set(DANIEL_STATEMENTS),
  });
}

function expectInitialSession(): void {
  const initial = createInitialGameSessionState();
  const state = useGameStore.getState();
  for (const key of Object.keys(initial) as (keyof GameSessionState)[]) {
    expect(state[key]).toEqual(initial[key]);
  }
  expect(sessionStorage.getItem(PERSISTENCE_KEY)).toBeNull();
}

describe('Superficie pública: lo que la UI entrega al store', () => {
  it('`askQuestion` recibe únicamente el texto de la pregunta', async () => {
    activateCallWithStatements();
    const askQuestion = vi.fn(async () => {
      await Promise.resolve();
    });
    useGameStore.setState({ askQuestion });

    const container = render(<GameScreen />);
    typeQuestion(container, '¿A qué hora llegaste al edificio?');
    await submitQuestion(container);

    expect(askQuestion).toHaveBeenCalledTimes(1);
    const args = askQuestion.mock.calls[0] ?? [];
    expect(args).toEqual(['¿A qué hora llegaste al edificio?']);
    expect(useGameStore.getState().currentRequestId).toBeNull();
  });

  it('`submitAccusation` recibe únicamente un `AccusationInput` completo', () => {
    activateGame({ activeView: 'accusation' });
    const submitAccusation = vi.fn<GameActions['submitAccusation']>();
    useGameStore.setState({ submitAccusation });

    const container = render(<GameScreen />);
    fillAccusation(container, {
      suspectId: SOLUTION.culpritId,
      motiveId: SOLUTION.motiveId,
      methodId: SOLUTION.methodId,
      evidenceIds: SOLUTION.requiredEvidenceIds,
    });
    click(query(container, '[data-testid="accusation-submit"]'));
    click(query(container, '[data-testid="accusation-confirm-submit"]'));

    expect(submitAccusation).toHaveBeenCalledTimes(1);
    const [accusation, ...extra] = submitAccusation.mock.calls[0] ?? [];
    expect(extra).toEqual([]);
    expect(Object.keys(accusation ?? {}).sort()).toEqual([
      'evidenceIds',
      'methodId',
      'motiveId',
      'suspectId',
    ]);
  });

  it('la UI puede marcar cualquiera de las seis evidencias en la acusación', () => {
    activateGame({ activeView: 'accusation' });
    const submitAccusation = vi.fn<GameActions['submitAccusation']>();
    useGameStore.setState({ submitAccusation });

    const container = render(<GameScreen />);
    fillAccusation(container, {
      suspectId: 'sofia',
      motiveId: 'motive_revenge',
      methodId: 'method_assault',
      evidenceIds: EVIDENCE_VIEWS.map((view) => view.id),
    });
    click(query(container, '[data-testid="accusation-submit"]'));
    click(query(container, '[data-testid="accusation-confirm-submit"]'));

    const [accusation] = submitAccusation.mock.calls[0] ?? [];
    expect(accusation?.evidenceIds).toHaveLength(6);
  });

  it('los tipos impiden que la UI entregue mensajes, identificadores o resultados', () => {
    const questionArgs: Parameters<GameActions['askQuestion']> = ['¿Dónde estabas?'];
    expect(questionArgs).toHaveLength(1);

    const messageArgs: Parameters<GameActions['askQuestion']> = [
      // @ts-expect-error La UI no construye `ChatMessage`: solo entrega texto.
      { role: 'player', text: '¿Dónde estabas?', timestamp: FIXED_NOW },
    ];
    expect(messageArgs).toHaveLength(1);

    // @ts-expect-error El `statementId` lo decide el store, nunca la UI.
    const statementArgs: Parameters<GameActions['askQuestion']> = [
      '¿Dónde estabas?',
      'stmt_daniel_arrival',
    ];
    expect(statementArgs).toHaveLength(2);

    const accusationArgs: Parameters<GameActions['submitAccusation']> = [
      {
        suspectId: SOLUTION.culpritId,
        motiveId: SOLUTION.motiveId,
        methodId: SOLUTION.methodId,
        evidenceIds: SOLUTION.requiredEvidenceIds,
        // @ts-expect-error La UI no adjunta el resultado de la acusación.
        result: 'victory',
      },
    ];
    expect(accusationArgs).toHaveLength(1);
  });

  it('las acciones prohibidas no existen en el store que consume la UI', () => {
    const state = useGameStore.getState();

    // @ts-expect-error La vista `call` solo la establece `startCall`.
    expect(state.setActiveView).toBeUndefined();
    // @ts-expect-error El procesamiento de respuestas es interno.
    expect(state.processResponse).toBeUndefined();
    // @ts-expect-error Las declaraciones las registra el store al responder.
    expect(state.registerStatement).toBeUndefined();
    // @ts-expect-error La confesión la decide el motor local.
    expect(state.triggerConfession).toBeUndefined();
    // @ts-expect-error La finalización nunca es una acción pública.
    expect(state.finalizeGame).toBeUndefined();
    // @ts-expect-error El feedback lo escribe `presentEvidence`.
    expect(state.setFeedback).toBeUndefined();
  });
});

describe('Contradicciones: arrastre, zonas de drop y feedback', () => {
  const chip = (container: HTMLElement): HTMLElement =>
    query(container, '[data-drag-evidence="ev_access_log"]');
  const statement = (container: HTMLElement): HTMLElement =>
    query(container, '[data-statement="stmt_daniel_arrival"]');

  function renderCall(): HTMLDivElement {
    return render(<CallPanel suspects={SUSPECT_PROFILE_VIEWS} evidence={EVIDENCE_VIEWS} />);
  }

  it('solo las declaraciones registradas son zonas de drop', () => {
    activateGame({
      activeView: 'call',
      activeCallSuspect: 'daniel',
      callSessionId: 'call-fijo',
      registeredStatements: new Set<StatementId>(['stmt_daniel_arrival', 'stmt_elena_arrival']),
    });

    const container = renderCall();

    expect(container.querySelectorAll('[data-statement]')).toHaveLength(2);
    expect(container.querySelector('[data-statement="stmt_daniel_office"]')).toBeNull();
    expect(statement(container).textContent).toContain(
      STATEMENTS.stmt_daniel_arrival.canonicalText,
    );
  });

  it('el arrastre con puntero resalta las zonas y soltarlo fuera no evalúa nada', async () => {
    activateCallWithStatements();
    const presentEvidence = vi.fn();
    useGameStore.setState({ presentEvidence });

    const container = renderCall();
    expect(statement(container).className).not.toContain('statementCardAvailable');

    act(() => {
      chip(container).dispatchEvent(pointerEvent('pointerdown', 5, 5));
    });
    await flushSensors();
    expect(statement(container).className).toContain('statementCardAvailable');

    act(() => {
      document.dispatchEvent(pointerEvent('pointermove', 400, 400));
    });
    act(() => {
      document.dispatchEvent(pointerEvent('pointerup', 400, 400));
    });
    await flushSensors();

    expect(presentEvidence).not.toHaveBeenCalled();
    expect(statement(container).className).not.toContain('statementCardAvailable');
    const state = useGameStore.getState();
    expect(state.score).toBe(0);
    expect(state.incorrectAttempts).toBe(0);
    expect(state.discoveredContradictions.size).toBe(0);
    expect(state.lastContradictionFeedback).toBeNull();
  });

  it('el arrastre con teclado resalta las zonas y Escape lo cancela sin evaluar', async () => {
    activateCallWithStatements();
    const presentEvidence = vi.fn();
    useGameStore.setState({ presentEvidence });

    const container = renderCall();
    // El sensor de teclado exige que la evidencia sea alcanzable y descrita.
    expect(chip(container).getAttribute('tabindex')).toBe('0');
    expect(chip(container).getAttribute('aria-roledescription')).toBe('evidencia arrastrable');

    act(() => {
      chip(container).dispatchEvent(keyEvent('Space'));
    });
    await flushSensors();
    expect(statement(container).className).toContain('statementCardAvailable');

    act(() => {
      chip(container).dispatchEvent(keyEvent('Escape'));
    });
    await flushSensors();

    expect(presentEvidence).not.toHaveBeenCalled();
    expect(statement(container).className).not.toContain('statementCardAvailable');
    expect(useGameStore.getState().suspectPressure.daniel).toBe(0);
  });

  const FEEDBACK_CASES: readonly {
    outcome: ContradictionOutcome;
    evidenceId: 'ev_access_log' | 'ev_bottle' | 'ev_toxicology';
    message: string;
  }[] = [
    { outcome: 'valid', evidenceId: 'ev_access_log', message: 'Contradicción demostrada.' },
    {
      outcome: 'related_insufficient',
      evidenceId: 'ev_bottle',
      message: 'no demuestra la contradicción',
    },
    { outcome: 'incorrect', evidenceId: 'ev_toxicology', message: 'se aplicó la penalización' },
  ];

  it.each(FEEDBACK_CASES)(
    'renderiza el aviso $outcome que decide el store',
    ({ outcome, evidenceId, message }) => {
      activateCallWithStatements();
      const container = renderCall();

      act(() => {
        useGameStore.getState().presentEvidence(evidenceId, 'stmt_daniel_arrival');
      });

      const feedback = query(container, '[data-feedback]');
      expect(feedback.dataset.feedback).toBe(outcome);
      expect(feedback.textContent).toContain(message);
    },
  );

  it('renderiza el aviso de contradicción repetida sin volver a puntuar', () => {
    activateCallWithStatements();
    const container = renderCall();

    act(() => {
      useGameStore.getState().presentEvidence('ev_access_log', 'stmt_daniel_arrival');
    });
    const explained = query(container, '[data-feedback]').textContent;
    expect(explained).toContain('19:30');
    expect(useGameStore.getState().score).toBe(150);

    act(() => {
      useGameStore.getState().presentEvidence('ev_access_log', 'stmt_daniel_arrival');
    });

    const feedback = query(container, '[data-feedback]');
    expect(feedback.dataset.feedback).toBe('already_discovered');
    expect(feedback.textContent).toContain('Ya habías demostrado esta contradicción.');
    expect(useGameStore.getState().score).toBe(150);
  });
});

describe('Flujos locales críticos', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(FIXED_NOW);
  });

  it('victoria por confesión al demostrar las tres contradicciones de Daniel', () => {
    activateCallWithStatements();
    const container = render(<App />);

    act(() => {
      const { presentEvidence } = useGameStore.getState();
      presentEvidence('ev_access_log', 'stmt_daniel_arrival');
      presentEvidence('ev_camera', 'stmt_daniel_office');
      presentEvidence('ev_receipt', 'stmt_daniel_substance');
    });

    const state = useGameStore.getState();
    expect(state.phase).toBe('victory_confession');
    // 150 + 150 + 200 de contradicciones, 500 de bonus y 600 s restantes.
    expect(state.score).toBe(1600);
    expect(state.activeCallSuspect).toBeNull();
    expect(container.textContent).toContain('Victoria por confesión');

    click(getButton(container, 'Reiniciar partida'));
    expectInitialSession();
    expect(container.textContent).toContain('REMOTE DETECTIVE');
  });

  it('victoria por acusación correcta desde el tablero de la UI', () => {
    activateGame({ activeView: 'accusation' });
    const container = render(<App />);

    fillAccusation(container, {
      suspectId: SOLUTION.culpritId,
      motiveId: SOLUTION.motiveId,
      methodId: SOLUTION.methodId,
      evidenceIds: SOLUTION.requiredEvidenceIds,
    });
    click(query(container, '[data-testid="accusation-submit"]'));
    click(query(container, '[data-testid="accusation-confirm-submit"]'));

    const state = useGameStore.getState();
    expect(state.phase).toBe('victory_accusation');
    expect(state.accusationUsed).toBe(true);
    // Sin contradicciones descubiertas: 300 de bonus y 600 s restantes.
    expect(state.score).toBe(900);
    expect(container.textContent).toContain('Victoria por acusación correcta');

    click(getButton(container, 'Reiniciar partida'));
    expectInitialSession();
  });

  it('derrota por acusación incorrecta con el crédito parcial del culpable', () => {
    activateGame({ activeView: 'accusation' });
    const container = render(<App />);

    fillAccusation(container, {
      suspectId: SOLUTION.culpritId,
      motiveId: 'motive_revenge',
      methodId: SOLUTION.methodId,
      evidenceIds: SOLUTION.requiredEvidenceIds,
    });
    click(query(container, '[data-testid="accusation-submit"]'));
    click(query(container, '[data-testid="accusation-confirm-submit"]'));

    const state = useGameStore.getState();
    expect(state.phase).toBe('defeat_accusation');
    // Señalar al culpable con un motivo falso solo concede el crédito parcial.
    expect(state.score).toBe(100);
    expect(container.textContent).toContain('Derrota por acusación incorrecta');

    click(getButton(container, 'Reiniciar partida'));
    expectInitialSession();
  });

  const TIMER_VIEWS: readonly ActiveView[] = [
    'desktop',
    'casefile',
    'evidence',
    'call',
    'accusation',
  ];

  it.each(TIMER_VIEWS)('derrota por tiempo agotado desde la vista %s', (view) => {
    const container = render(<App />);
    click(getButton(container, 'Iniciar partida'));

    if (view !== 'desktop') {
      navigate(container, view);
    }
    if (view === 'call') {
      click(query(container, 'button[data-call-suspect="daniel"]'));
      expect(useGameStore.getState().activeView).toBe('call');
    }

    act(() => {
      vi.advanceTimersByTime(720_500);
    });

    const state = useGameStore.getState();
    expect(state.phase).toBe('defeat_time');
    expect(state.score).toBe(0);
    expect(container.textContent).toContain('Derrota por tiempo agotado');

    click(getButton(container, 'Reiniciar partida'));
    expectInitialSession();
  });
});
