/**
 * Pruebas mínimas de render y navegación del HUD persistente, el escritorio, el
 * expediente, el panel de evidencias (tarea 4.2), el formulario de acusación
 * con su confirmación (tarea 4.3) y el sistema de llamadas (tarea 4.4).
 *
 * Las pruebas exhaustivas de superficie pública y flujos UI pertenecen al grupo
 * 4.7.
 *
 * Requisitos: 3.1-3.3, 4.1-4.3, 5.1-5.5, 6.1-6.11, 7.8, 10.1-10.2, 12.1-12.9, 13.6
 */

import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { GameScreen } from '@/components/screens/GameScreen';
import { CASE_FILE } from '@/data/case';
import { EVIDENCE } from '@/data/evidence';
import { SUSPECTS } from '@/data/suspects';
import { STATEMENTS } from '@/data/statements';
import { SOLUTION } from '@/data/solution';
import { EVIDENCE_VIEWS, SUSPECT_PROFILE_VIEWS } from '@/data/viewModels';
import { createInitialGameSessionState, useGameStore } from '@/store/gameStore';
import { PERSISTENCE_KEY } from '@/store/persistence';

interface MountedTree {
  root: Root;
  container: HTMLDivElement;
}

const mounted: MountedTree[] = [];

beforeAll(() => {
  (
    globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT?: boolean }
  ).IS_REACT_ACT_ENVIRONMENT = true;
});

beforeEach(() => {
  useGameStore.setState(createInitialGameSessionState());
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

/** Activa una partida con la marca de temporizador indicada. */
function activateGame(remainingMs: number): void {
  useGameStore.setState({
    phase: 'active',
    activeView: 'desktop',
    timerEndTimestamp: Date.now() + remainingMs,
  });
}

function renderGameScreen(): HTMLDivElement {
  const container = document.createElement('div');
  document.body.append(container);
  const root = createRoot(container);
  mounted.push({ root, container });

  act(() => {
    root.render(<GameScreen />);
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

function navigate(container: HTMLElement, view: string): void {
  click(query(container, `nav button[data-view="${view}"]`));
}

/** Marca una opción del tablero de caso disparando el evento nativo. */
function choose(container: HTMLElement, selector: string): void {
  const input = query(container, selector) as HTMLInputElement;
  act(() => {
    input.click();
  });
}

/** Completa el tablero con la acusación indicada. */
function fillAccusation(
  container: HTMLElement,
  suspectId: string,
  motiveId: string,
  methodId: string,
  evidenceIds: readonly string[],
): void {
  choose(container, `input[data-suspect-choice="${suspectId}"]`);
  choose(container, `input[data-motive-choice="${motiveId}"]`);
  choose(container, `input[data-method-choice="${methodId}"]`);
  for (const evidenceId of evidenceIds) {
    choose(container, `input[data-evidence-choice="${evidenceId}"]`);
  }
}

describe('GameScreen: HUD persistente', () => {
  it('muestra el temporizador en mm:ss y la puntuación en todas las vistas activas', () => {
    vi.useFakeTimers();
    activateGame(125_000);
    useGameStore.setState({ score: 350 });

    const container = renderGameScreen();

    expect(query(container, '[data-testid="hud-timer"]').textContent).toContain('02:05');
    expect(query(container, '[data-testid="hud-score"]').textContent).toContain('350');

    for (const view of ['casefile', 'evidence', 'accusation', 'call']) {
      navigate(container, view);
      expect(query(container, '[data-testid="hud-timer"]').textContent).toContain('02:0');
      expect(query(container, '[data-testid="hud-score"]').textContent).toContain('350');
    }
  });

  it('marca el temporizador como crítico por debajo de dos minutos', () => {
    vi.useFakeTimers();
    activateGame(125_000);

    const container = renderGameScreen();
    expect(query(container, '[data-testid="hud-timer"]').dataset.critical).toBe('false');

    act(() => {
      vi.advanceTimersByTime(10_000);
    });

    const timer = query(container, '[data-testid="hud-timer"]');
    expect(timer.dataset.critical).toBe('true');
    expect(timer.textContent).toContain('01:55');
  });

  it('provoca la derrota por tiempo cuando el temporizador llega a cero', () => {
    vi.useFakeTimers();
    activateGame(1_000);

    const container = renderGameScreen();
    expect(useGameStore.getState().phase).toBe('active');

    act(() => {
      vi.advanceTimersByTime(1_500);
    });

    expect(useGameStore.getState().phase).toBe('defeat_time');
    expect(container.querySelector('[data-testid="hud-timer"]')).not.toBeNull();
  });
});

describe('GameScreen: navegación', () => {
  it('abre expediente, evidencias, llamadas y acusación, y regresa al escritorio', () => {
    activateGame(600_000);
    const container = renderGameScreen();

    expect(query(container, 'nav button[data-view="desktop"]').getAttribute('aria-current')).toBe(
      'page',
    );

    navigate(container, 'casefile');
    expect(useGameStore.getState().activeView).toBe('casefile');
    expect(container.textContent).toContain('Expediente del caso');

    navigate(container, 'evidence');
    expect(useGameStore.getState().activeView).toBe('evidence');
    expect(container.textContent).toContain('Selecciona una evidencia');

    navigate(container, 'accusation');
    expect(useGameStore.getState().activeView).toBe('accusation');
    expect(useGameStore.getState().accusationUsed).toBe(false);
    expect(container.textContent).toContain('Acusación final');

    navigate(container, 'call');
    expect(useGameStore.getState().activeView).toBe('desktop');
    expect(container.textContent).toContain('Sistema de llamadas');
    expect(query(container, 'nav button[data-view="call"]').getAttribute('aria-current')).toBe(
      'page',
    );

    click(query(container, 'main button'));
    expect(useGameStore.getState().activeView).toBe('desktop');
    expect(container.textContent).toContain('Escritorio');
  });
});

describe('GameScreen: escritorio, expediente y evidencias', () => {
  it('muestra el resumen del caso en el escritorio', () => {
    activateGame(600_000);
    const container = renderGameScreen();

    const text = container.textContent;
    expect(text).toContain(CASE_FILE.title);
    expect(text).toContain(CASE_FILE.victimName);
    expect(text).toContain(CASE_FILE.crimeScene);
    expect(text).toContain(CASE_FILE.causeOfDeath);
  });

  it('muestra víctima, crimen y los cuatro perfiles en el expediente', () => {
    activateGame(600_000);
    const container = renderGameScreen();

    navigate(container, 'casefile');

    const text = container.textContent;
    expect(text).toContain(CASE_FILE.victimName);
    expect(text).toContain(CASE_FILE.causeOfDeath);
    for (const suspect of SUSPECT_PROFILE_VIEWS) {
      expect(text).toContain(suspect.name);
      expect(text).toContain(suspect.relationship);
      expect(text).toContain(suspect.apparentMotive);
    }
    expect(container.querySelectorAll('[data-suspect]')).toHaveLength(4);
  });

  it('lista las seis evidencias y muestra el detalle con imagen accesible', () => {
    activateGame(600_000);
    const container = renderGameScreen();

    navigate(container, 'evidence');
    expect(container.querySelectorAll('button[data-evidence]')).toHaveLength(6);

    const first = EVIDENCE_VIEWS[0];
    if (first === undefined) {
      throw new Error('El catálogo de evidencias está vacío.');
    }

    click(query(container, `button[data-evidence="${first.id}"]`));

    const detail = query(container, `[data-selected-evidence="${first.id}"]`);
    expect(detail.textContent).toContain(first.name);
    expect(detail.textContent).toContain(first.description);
    expect(detail.textContent).toContain(first.observableInfo);
    // Con recurso disponible se renderiza la fotografía; sin él, el placeholder
    // accesible. Ninguna de las dos ramas puede quedar vacía o rota.
    const visual = query(detail, 'img, [role="img"]');
    const description =
      visual.getAttribute('alt') ?? visual.getAttribute('aria-label') ?? '';
    expect(description).toContain(first.name);
    expect(query(container, `button[data-evidence="${first.id}"]`).getAttribute('aria-pressed')).toBe(
      'true',
    );
  });

  it('mantiene visible la recomendación de jugar desde una computadora', () => {
    activateGame(600_000);
    const container = renderGameScreen();

    // El aviso vive en el DOM y solo lo oculta la media query >= 1024px, de modo
    // que la recomendación no depende de estado ni de JavaScript.
    const notice = query(container, '[data-testid="desktop-recommendation"]');
    expect(notice.textContent).toContain('1024');
    expect(notice.textContent).toContain('computadora');
  });

  it('presenta a los cuatro sospechosos con su retrato', () => {
    activateGame(600_000);
    const container = renderGameScreen();

    navigate(container, 'casefile');

    for (const suspect of SUSPECT_PROFILE_VIEWS) {
      const card = query(container, `[data-suspect="${suspect.id}"]`);
      const visual = query(card, 'img, [role="img"]');
      const description =
        visual.getAttribute('alt') ?? visual.getAttribute('aria-label') ?? '';
      expect(description).toContain(suspect.name);
    }
  });
});

describe('GameScreen: acusación final', () => {
  it('impide el envío mientras falten campos e indica cuáles', () => {
    activateGame(600_000);
    const container = renderGameScreen();
    navigate(container, 'accusation');

    const submit = query(container, '[data-testid="accusation-submit"]') as HTMLButtonElement;
    expect(submit.disabled).toBe(true);
    expect(query(container, '#accusation-status').textContent).toContain('sospechoso');
    expect(container.querySelectorAll('input[data-evidence-choice]')).toHaveLength(6);

    choose(container, `input[data-suspect-choice="${SOLUTION.culpritId}"]`);
    expect(query(container, '#accusation-status').textContent).not.toContain('sospechoso');
    expect(
      (query(container, '[data-testid="accusation-submit"]') as HTMLButtonElement).disabled,
    ).toBe(true);

    fillAccusation(container, SOLUTION.culpritId, SOLUTION.motiveId, SOLUTION.methodId, [
      SOLUTION.requiredEvidenceIds[0],
    ]);
    expect(
      (query(container, '[data-testid="accusation-submit"]') as HTMLButtonElement).disabled,
    ).toBe(false);
    expect(container.querySelector('[data-testid="accusation-confirm"]')).toBeNull();
  });

  it('cancelar la confirmación vuelve al escritorio sin consumir el intento', () => {
    activateGame(600_000);
    const container = renderGameScreen();
    navigate(container, 'accusation');

    fillAccusation(container, SOLUTION.culpritId, SOLUTION.motiveId, SOLUTION.methodId, [
      ...SOLUTION.requiredEvidenceIds,
    ]);
    click(query(container, '[data-testid="accusation-submit"]'));
    const confirmation = query(container, '[data-testid="accusation-confirm"]');
    const description = query(container, `#${confirmation.getAttribute('aria-describedby') ?? ''}`);
    expect(confirmation.hasAttribute('aria-modal')).toBe(false);
    expect(description.textContent).toContain('Esta decisión es definitiva.');

    click(query(container, '[data-testid="accusation-cancel"]'));

    const state = useGameStore.getState();
    expect(state.accusationUsed).toBe(false);
    expect(state.phase).toBe('active');
    expect(state.activeView).toBe('desktop');
  });

  it('confirmar entrega la acusación al store, que decide victoria o derrota', () => {
    activateGame(600_000);
    const container = renderGameScreen();
    navigate(container, 'accusation');

    fillAccusation(container, SOLUTION.culpritId, SOLUTION.motiveId, SOLUTION.methodId, [
      ...SOLUTION.requiredEvidenceIds,
    ]);
    click(query(container, '[data-testid="accusation-submit"]'));
    click(query(container, '[data-testid="accusation-confirm-submit"]'));

    expect(useGameStore.getState().phase).toBe('victory_accusation');
    expect(useGameStore.getState().accusationUsed).toBe(true);
  });

  it('con el intento consumido no admite nuevos envíos', () => {
    activateGame(600_000);
    useGameStore.setState({ accusationUsed: true });
    const container = renderGameScreen();
    navigate(container, 'accusation');

    const submit = query(container, '[data-testid="accusation-submit"]') as HTMLButtonElement;
    expect(submit.disabled).toBe(true);
    expect(
      (
        query(
          container,
          `input[data-suspect-choice="${SOLUTION.culpritId}"]`,
        ) as HTMLInputElement
      ).closest('fieldset')?.disabled,
    ).toBe(true);
    expect(query(container, '#accusation-status').textContent).toContain('única acusación');
  });
});

describe('GameScreen: sistema de llamadas', () => {
  /** Escribe en un campo controlado por React disparando el evento nativo. */
  function typeQuestion(container: HTMLElement, value: string): void {
    const textarea = query(container, '#call-question') as HTMLTextAreaElement;
    act(() => {
      // Un `value` asignado directamente no notifica al rastreador de React.
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

  /** Localiza el botón de terminar llamada por su texto visible. */
  function clickEndCall(container: HTMLElement): HTMLElement {
    const button = [...container.querySelectorAll('button')].find(
      (candidate) => candidate.textContent === 'Terminar llamada',
    );
    if (button === undefined) {
      throw new Error('No se encontró el botón de terminar llamada.');
    }

    return button;
  }

  it('muestra los cuatro sospechosos y abre la llamada con `startCall`', () => {
    activateGame(600_000);
    const container = renderGameScreen();
    navigate(container, 'call');

    expect(container.querySelectorAll('button[data-call-suspect]')).toHaveLength(4);
    expect(container.querySelector('[data-testid="call-local-mode"]')).not.toBeNull();

    act(() => {
      useGameStore.setState({ suspectPressure: { daniel: 40, elena: 0, roberto: 0, sofia: 0 } });
    });
    click(query(container, 'button[data-call-suspect="daniel"]'));

    expect(useGameStore.getState().activeView).toBe('call');
    expect(useGameStore.getState().activeCallSuspect).toBe('daniel');

    const header = query(container, '[data-active-call="daniel"]');
    expect(header.textContent).toContain('Daniel');
    expect(query(header, '[data-pressure="daniel"]').textContent).toContain('40');
  });

  it('mantiene deshabilitado el envío sin texto y con solo espacios', () => {
    activateGame(600_000);
    const container = renderGameScreen();
    navigate(container, 'call');
    click(query(container, 'button[data-call-suspect="daniel"]'));

    const send = (): HTMLButtonElement =>
      query(container, '[data-testid="call-send"]') as HTMLButtonElement;
    expect(send().disabled).toBe(true);
    expect(query(container, '#call-question-status').textContent).toContain('Elige un tema');

    typeQuestion(container, '    ');
    expect(send().disabled).toBe(true);

    typeQuestion(container, '¿Dónde estabas?');
    expect(send().disabled).toBe(false);
    expect((query(container, '#call-question') as HTMLTextAreaElement).maxLength).toBe(300);
  });

  it('registra la pregunta, la respuesta y la declaración canónica del store', async () => {
    activateGame(600_000);
    const container = renderGameScreen();
    navigate(container, 'call');
    click(query(container, 'button[data-call-suspect="daniel"]'));

    typeQuestion(container, '¿A qué hora llegaste al edificio?');
    await submitQuestion(container);

    const state = useGameStore.getState();
    const history = state.callHistory.daniel;
    expect(history).toHaveLength(2);
    expect(state.isInterrogationLoading).toBe(false);

    const rendered = query(container, '[data-testid="call-history"]').textContent;
    expect(rendered).toContain('¿A qué hora llegaste al edificio?');
    expect(rendered).toContain(history[1]?.text ?? '');

    expect(state.registeredStatements.has('stmt_daniel_arrival')).toBe(true);
    expect(query(container, '[data-statement="stmt_daniel_arrival"]').textContent).toContain(
      STATEMENTS.stmt_daniel_arrival.canonicalText,
    );
  });

  it('conserva el historial por sospechoso al terminar y reabrir la llamada', async () => {
    activateGame(600_000);
    const container = renderGameScreen();
    navigate(container, 'call');
    click(query(container, 'button[data-call-suspect="daniel"]'));

    typeQuestion(container, '¿A qué hora llegaste al edificio?');
    await submitQuestion(container);

    click(clickEndCall(container));

    expect(useGameStore.getState().activeCallSuspect).toBeNull();
    expect(useGameStore.getState().activeView).toBe('desktop');

    click(query(container, 'button[data-call-suspect="elena"]'));
    expect(query(container, '[data-testid="call-history"]').textContent).toBe('');

    click(clickEndCall(container));
    click(query(container, 'button[data-call-suspect="daniel"]'));

    expect(query(container, '[data-testid="call-history"]').textContent).toContain(
      '¿A qué hora llegaste al edificio?',
    );
  });
});

describe('GameScreen: metadatos internos', () => {
  it('no expone metadatos internos en los view models', () => {
    for (const view of EVIDENCE_VIEWS) {
      expect(Object.hasOwn(view, '_internal')).toBe(false);
    }
    for (const view of SUSPECT_PROFILE_VIEWS) {
      expect(Object.hasOwn(view, '_internal')).toBe(false);
    }
  });

  it('no renderiza culpable, motivo real, mentiras ni secretos', () => {
    activateGame(600_000);
    const container = renderGameScreen();

    const collectText = (): string => container.textContent;
    const internalTexts: string[] = [
      CASE_FILE._internal.realMotive,
      ...SUSPECTS.flatMap((suspect) => [
        ...suspect._internal.lies,
        ...suspect._internal.secrets,
        ...suspect._internal.truths,
      ]),
    ];

    for (const view of ['casefile', 'evidence'] as const) {
      navigate(container, view);
      const rendered = collectText();
      for (const internalText of internalTexts) {
        expect(rendered).not.toContain(internalText);
      }
    }

    navigate(container, 'evidence');
    for (const evidence of EVIDENCE) {
      click(query(container, `button[data-evidence="${evidence.id}"]`));
      const detail = query(container, `[data-selected-evidence="${evidence.id}"]`);
      for (const relatedSuspect of evidence._internal.relatedSuspects) {
        expect(detail.dataset.relatedSuspects).toBeUndefined();
        expect(detail.getAttribute('data-suspect')).not.toBe(relatedSuspect);
      }
    }
  });
});
