/**
 * Pruebas de render e interacción de la composición principal y de las
 * pantallas de título, instrucciones, partida y fin de partida (tarea 4.1).
 *
 * Las pruebas exhaustivas de superficie pública y flujos UI pertenecen al
 * grupo 4.7.
 *
 * Requisitos: 2.1-2.5, 13.1, 13.9-13.11
 */

import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { App } from '@/App';
import { PERSISTENCE_KEY } from '@/store/persistence';
import type { EndGamePhase } from '@/data/types';
import { createInitialGameSessionState, useGameStore } from '@/store/gameStore';

interface MountedTree {
  root: Root;
  container: HTMLDivElement;
}

const mounted: MountedTree[] = [];

beforeAll(() => {
  (globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT?: boolean })
    .IS_REACT_ACT_ENVIRONMENT = true;
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
  sessionStorage.removeItem(PERSISTENCE_KEY);
});

function renderApp(): HTMLDivElement {
  const container = document.createElement('div');
  document.body.append(container);
  const root = createRoot(container);
  mounted.push({ root, container });

  act(() => {
    root.render(<App />);
  });

  return container;
}

function getButton(container: HTMLElement, label: string): HTMLButtonElement {
  const match = [...container.querySelectorAll('button')].find(
    (button) => button.textContent.trim() === label,
  );

  if (match === undefined) {
    throw new Error(`No se encontró el botón "${label}".`);
  }

  return match;
}

function click(element: HTMLElement): void {
  act(() => {
    element.dispatchEvent(new MouseEvent('click', { bubbles: true }));
  });
}

function headingText(container: HTMLElement): string {
  const heading = container.querySelector('h1');
  if (heading === null) {
    throw new Error('La pantalla no tiene encabezado principal.');
  }

  return heading.textContent.trim();
}

describe('App: pantalla inicial', () => {
  it('muestra el título, el subtítulo y las acciones aprobadas', () => {
    const container = renderApp();

    expect(headingText(container)).toBe('REMOTE DETECTIVE');
    expect(container.textContent).toContain('Solve the case before time runs out.');
    expect(getButton(container, 'Iniciar partida')).toBeInstanceOf(HTMLButtonElement);
    expect(getButton(container, 'Cómo jugar')).toBeInstanceOf(HTMLButtonElement);
  });

  it('inicia la partida y el temporizador al activar el botón de inicio', () => {
    const container = renderApp();

    click(getButton(container, 'Iniciar partida'));

    const state = useGameStore.getState();
    expect(state.phase).toBe('active');
    expect(state.activeView).toBe('desktop');
    expect(state.timerEndTimestamp).not.toBeNull();
    expect(headingText(container)).toBe('REMOTE DETECTIVE');
    expect(container.querySelector('[aria-label="Panel activo de la partida"]')).not.toBeNull();
  });
});

describe('App: instrucciones', () => {
  it('describe objetivo, evidencias, interrogatorio, contradicciones y acusación', () => {
    const container = renderApp();

    click(getButton(container, 'Cómo jugar'));

    expect(headingText(container)).toBe('Cómo jugar');
    const sections = [...container.querySelectorAll('h2')].map((heading) =>
      heading.textContent.trim(),
    );
    expect(sections).toEqual([
      'Objetivo',
      'Inspeccionar evidencias',
      'Interrogar sospechosos',
      'Detectar contradicciones',
      'Acusación final',
    ]);
    expect(container.textContent).toContain('Arrastra una evidencia sobre una declaración');
  });

  it('permite regresar a la pantalla inicial sin iniciar la partida', () => {
    const container = renderApp();

    click(getButton(container, 'Cómo jugar'));
    click(getButton(container, 'Volver a la pantalla inicial'));

    expect(headingText(container)).toBe('REMOTE DETECTIVE');
    expect(useGameStore.getState().phase).toBe('title');
    expect(useGameStore.getState().timerEndTimestamp).toBeNull();
  });
});

describe('App: fin de partida', () => {
  const TERMINAL_CASES: readonly { phase: EndGamePhase; outcome: string; heading: string }[] = [
    {
      phase: 'victory_accusation',
      outcome: 'Victoria',
      heading: 'Victoria por acusación correcta',
    },
    { phase: 'victory_confession', outcome: 'Victoria', heading: 'Victoria por confesión' },
    { phase: 'defeat_time', outcome: 'Derrota', heading: 'Derrota por tiempo agotado' },
    {
      phase: 'defeat_accusation',
      outcome: 'Derrota',
      heading: 'Derrota por acusación incorrecta',
    },
  ];

  it.each(TERMINAL_CASES)(
    'muestra resultado, tipo y score final en $phase',
    ({ phase, outcome, heading }) => {
      useGameStore.setState({ phase, score: 725 });

      const container = renderApp();

      expect(headingText(container)).toBe(heading);
      expect(container.textContent).toContain(outcome);
      expect(container.querySelector('[data-testid="final-score"]')?.textContent).toContain('725');
      expect(getButton(container, 'Reiniciar partida')).toBeInstanceOf(HTMLButtonElement);
    },
  );

  it('reinicia la partida y vuelve a la pantalla inicial', () => {
    useGameStore.setState({
      phase: 'defeat_accusation',
      score: 400,
      incorrectAttempts: 2,
      accusationUsed: true,
    });
    const container = renderApp();

    click(getButton(container, 'Reiniciar partida'));

    const state = useGameStore.getState();
    expect(state.phase).toBe('title');
    expect(state.score).toBe(0);
    expect(state.incorrectAttempts).toBe(0);
    expect(state.accusationUsed).toBe(false);
    expect(headingText(container)).toBe('REMOTE DETECTIVE');
  });
});
