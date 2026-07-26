/**
 * Pruebas mínimas de render y navegación del HUD persistente, el escritorio, el
 * expediente, el panel de evidencias (tarea 4.2) y el formulario de acusación
 * con su confirmación (tarea 4.3).
 *
 * Las pruebas exhaustivas de superficie pública y flujos UI pertenecen al grupo
 * 4.7.
 *
 * Requisitos: 3.1-3.3, 4.1-4.3, 5.1-5.5, 10.1-10.2, 12.1-12.9, 13.6
 */

import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { GameScreen } from '@/components/screens/GameScreen';
import { CASE_FILE } from '@/data/case';
import { EVIDENCE } from '@/data/evidence';
import { SUSPECTS } from '@/data/suspects';
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

/** Selecciona un valor en un `select` nativo del formulario de acusación. */
function selectOption(container: HTMLElement, selector: string, value: string): void {
  const select = query(container, selector) as HTMLSelectElement;
  act(() => {
    select.value = value;
    select.dispatchEvent(new Event('change', { bubbles: true }));
  });
}

/** Completa el formulario con la acusación indicada. */
function fillAccusation(
  container: HTMLElement,
  suspectId: string,
  motiveId: string,
  methodId: string,
  evidenceIds: readonly string[],
): void {
  selectOption(container, '#accusation-suspect', suspectId);
  selectOption(container, '#accusation-motive', motiveId);
  selectOption(container, '#accusation-method', methodId);
  for (const evidenceId of evidenceIds) {
    click(query(container, `input[data-evidence-choice="${evidenceId}"]`));
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

  it('lista las seis evidencias y muestra el detalle con placeholder accesible', () => {
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
    expect(query(detail, '[role="img"]').getAttribute('aria-label')).toContain(first.name);
    expect(query(container, `button[data-evidence="${first.id}"]`).getAttribute('aria-pressed')).toBe(
      'true',
    );
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

    selectOption(container, '#accusation-suspect', SOLUTION.culpritId);
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
    expect(container.querySelector('[data-testid="accusation-confirm"]')).not.toBeNull();

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
    expect((query(container, '#accusation-suspect') as HTMLSelectElement).disabled).toBe(true);
    expect(query(container, '#accusation-status').textContent).toContain('única acusación');
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
