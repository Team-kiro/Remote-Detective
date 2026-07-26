/**
 * Pruebas del estado inicial, navegación (tarea 3.2) y de los flujos de
 * contradicciones, confesión, acusación, derrota por tiempo, finalización y
 * reinicio (tarea 3.3). La interrogación asíncrona y la persistencia
 * pertenecen a las tareas 3.4-3.7.
 *
 * Requisitos: 2.4-2.5, 3.1-3.3, 6.1-6.2, 6.9-6.11, 8.2-8.10, 9.1-9.6,
 * 10.1-10.4, 11.1-11.6, 12.4-12.9, 13.1-13.11, 15.1-15.4, 15.6
 */

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { config } from '@/config';
import { SCORING_RULES } from '@/data/scoringRules';
import { SUSPECT_IDS } from '@/data/types';
import type { AccusationInput, StatementId } from '@/data/types';
import { createInitialGameSessionState, useGameStore } from '@/store/gameStore';

function resetStore(): void {
  useGameStore.setState(createInitialGameSessionState());
}

/**
 * Registra declaraciones canónicas sin pasar por `askQuestion` (tarea 3.4):
 * el registro es interno y la UI nunca puede provocarlo.
 */
function registerStatements(...statementIds: readonly StatementId[]): void {
  useGameStore.setState({ registeredStatements: new Set(statementIds) });
}

const CORRECT_ACCUSATION: AccusationInput = {
  suspectId: 'daniel',
  motiveId: 'motive_silence',
  methodId: 'method_poison',
  evidenceIds: ['ev_email', 'ev_camera', 'ev_receipt', 'ev_bottle'],
};

describe('gameStore: estado inicial', () => {
  beforeEach(resetStore);

  it('arranca en la pantalla inicial sin partida en curso', () => {
    const state = useGameStore.getState();

    expect(state.phase).toBe('title');
    expect(state.activeView).toBe('desktop');
    expect(state.score).toBe(0);
    expect(state.incorrectAttempts).toBe(0);
    expect(state.timerEndTimestamp).toBeNull();
    expect(state.accusationUsed).toBe(false);
    expect(state.discoveredContradictions.size).toBe(0);
    expect(state.registeredStatements.size).toBe(0);
    expect(state.lastContradictionFeedback).toBeNull();
    expect(state.isInterrogationLoading).toBe(false);
  });

  it('inicia con presión cero e historial vacío para los cuatro sospechosos', () => {
    const state = useGameStore.getState();

    for (const suspectId of SUSPECT_IDS) {
      expect(state.suspectPressure[suspectId]).toBe(0);
      expect(state.callHistory[suspectId]).toEqual([]);
    }
  });

  it('no expone ninguna acción prohibida por el diseño', () => {
    const keys = Object.keys(useGameStore.getState());

    expect(keys).not.toContain('setActiveView');
    expect(keys).not.toContain('processResponse');
    expect(keys).not.toContain('registerStatement');
    expect(keys).not.toContain('triggerConfession');
  });
});

describe('gameStore: inicio de partida', () => {
  beforeEach(resetStore);

  it('activa la partida en el escritorio y arranca el temporizador', () => {
    const before = Date.now();
    useGameStore.getState().startGame();
    const after = Date.now();

    const state = useGameStore.getState();
    expect(state.phase).toBe('active');
    expect(state.activeView).toBe('desktop');
    expect(state.timerEndTimestamp).not.toBeNull();
    expect(state.timerEndTimestamp).toBeGreaterThanOrEqual(before + config.timerDurationMs);
    expect(state.timerEndTimestamp).toBeLessThanOrEqual(after + config.timerDurationMs);
  });
});

describe('gameStore: navegación entre paneles', () => {
  beforeEach(() => {
    resetStore();
    useGameStore.getState().startGame();
  });

  it('abre expediente, evidencias y acusación conservando el estado de la partida', () => {
    const timerEndTimestamp = useGameStore.getState().timerEndTimestamp;

    useGameStore.getState().openCaseFile();
    expect(useGameStore.getState().activeView).toBe('casefile');

    useGameStore.getState().openEvidence();
    expect(useGameStore.getState().activeView).toBe('evidence');

    useGameStore.getState().openAccusation();
    expect(useGameStore.getState().activeView).toBe('accusation');

    const state = useGameStore.getState();
    expect(state.phase).toBe('active');
    expect(state.timerEndTimestamp).toBe(timerEndTimestamp);
    expect(state.score).toBe(0);
  });

  it('abrir la acusación no consume el intento único', () => {
    useGameStore.getState().openAccusation();

    expect(useGameStore.getState().accusationUsed).toBe(false);
  });

  it('cancelar la acusación regresa al escritorio sin consumir el intento', () => {
    useGameStore.getState().openAccusation();
    useGameStore.getState().returnToDesktop();

    const state = useGameStore.getState();
    expect(state.activeView).toBe('desktop');
    expect(state.accusationUsed).toBe(false);
  });

  it('ignora la navegación fuera de una partida activa', () => {
    resetStore();

    useGameStore.getState().openCaseFile();
    useGameStore.getState().openEvidence();
    useGameStore.getState().openAccusation();
    useGameStore.getState().returnToDesktop();

    const state = useGameStore.getState();
    expect(state.phase).toBe('title');
    expect(state.activeView).toBe('desktop');
  });
});

describe('gameStore: apertura y cierre de llamadas', () => {
  beforeEach(() => {
    resetStore();
    useGameStore.getState().startGame();
  });

  it('startCall es la única vía para abrir la vista de llamada y genera sesión', () => {
    useGameStore.getState().startCall('daniel');

    const state = useGameStore.getState();
    expect(state.activeView).toBe('call');
    expect(state.activeCallSuspect).toBe('daniel');
    expect(state.callSessionId).not.toBeNull();
    expect(state.currentRequestId).toBeNull();
    expect(state.isInterrogationLoading).toBe(false);
  });

  it('cada llamada genera un identificador de sesión distinto', () => {
    useGameStore.getState().startCall('daniel');
    const firstSession = useGameStore.getState().callSessionId;

    useGameStore.getState().startCall('elena');
    const secondSession = useGameStore.getState().callSessionId;

    expect(secondSession).not.toBeNull();
    expect(secondSession).not.toBe(firstSession);
    expect(useGameStore.getState().activeCallSuspect).toBe('elena');
  });

  it('endCall limpia la llamada y regresa al escritorio', () => {
    useGameStore.getState().startCall('roberto');
    useGameStore.getState().endCall();

    const state = useGameStore.getState();
    expect(state.activeView).toBe('desktop');
    expect(state.activeCallSuspect).toBeNull();
    expect(state.callSessionId).toBeNull();
    expect(state.currentRequestId).toBeNull();
    expect(state.isInterrogationLoading).toBe(false);
  });

  it('regresar al escritorio desde una llamada la termina', () => {
    useGameStore.getState().startCall('sofia');
    useGameStore.getState().returnToDesktop();

    const state = useGameStore.getState();
    expect(state.activeView).toBe('desktop');
    expect(state.activeCallSuspect).toBeNull();
    expect(state.callSessionId).toBeNull();
  });

  it('no abre llamadas fuera de una partida activa', () => {
    resetStore();

    useGameStore.getState().startCall('daniel');

    const state = useGameStore.getState();
    expect(state.activeView).toBe('desktop');
    expect(state.activeCallSuspect).toBeNull();
    expect(state.callSessionId).toBeNull();
  });

  it('el temporizador sigue corriendo en la vista de llamada', () => {
    const timerEndTimestamp = useGameStore.getState().timerEndTimestamp;

    useGameStore.getState().startCall('daniel');

    expect(useGameStore.getState().timerEndTimestamp).toBe(timerEndTimestamp);
  });
});

describe('gameStore: feedback', () => {
  beforeEach(resetStore);

  it('clearFeedback deja el feedback en null', () => {
    useGameStore.setState({ lastContradictionFeedback: { type: 'already_discovered' } });

    useGameStore.getState().clearFeedback();

    expect(useGameStore.getState().lastContradictionFeedback).toBeNull();
  });
});

describe('gameStore: presentEvidence', () => {
  beforeEach(() => {
    resetStore();
    useGameStore.getState().startGame();
    registerStatements('stmt_daniel_arrival', 'stmt_elena_arrival');
  });

  it('ignora la presentación fuera de una partida activa', () => {
    resetStore();
    registerStatements('stmt_daniel_arrival');

    useGameStore.getState().presentEvidence('ev_access_log', 'stmt_daniel_arrival');

    const state = useGameStore.getState();
    expect(state.score).toBe(0);
    expect(state.discoveredContradictions.size).toBe(0);
    expect(state.lastContradictionFeedback).toBeNull();
  });

  it('ignora declaraciones que no están registradas', () => {
    useGameStore.getState().presentEvidence('ev_receipt', 'stmt_daniel_substance');

    const state = useGameStore.getState();
    expect(state.score).toBe(0);
    expect(state.discoveredContradictions.size).toBe(0);
    expect(state.lastContradictionFeedback).toBeNull();
  });

  it('aplica puntos, presión y explicación en una contradicción válida', () => {
    useGameStore.getState().presentEvidence('ev_access_log', 'stmt_daniel_arrival');

    const state = useGameStore.getState();
    expect(state.discoveredContradictions.has('contra_daniel_access')).toBe(true);
    expect(state.score).toBe(150);
    expect(state.suspectPressure.daniel).toBe(30);
    expect(state.incorrectAttempts).toBe(0);
    expect(state.lastContradictionFeedback?.type).toBe('valid');
    expect(state.lastContradictionFeedback?.explanation).toContain('19:30');
  });

  it('repetir una contradicción descubierta solo informa', () => {
    useGameStore.getState().presentEvidence('ev_access_log', 'stmt_daniel_arrival');
    useGameStore.getState().presentEvidence('ev_access_log', 'stmt_daniel_arrival');

    const state = useGameStore.getState();
    expect(state.score).toBe(150);
    expect(state.suspectPressure.daniel).toBe(30);
    expect(state.incorrectAttempts).toBe(0);
    expect(state.lastContradictionFeedback).toEqual({ type: 'already_discovered' });
  });

  it('una evidencia relacionada pero insuficiente no penaliza', () => {
    useGameStore.getState().presentEvidence('ev_bottle', 'stmt_daniel_arrival');

    const state = useGameStore.getState();
    expect(state.score).toBe(0);
    expect(state.incorrectAttempts).toBe(0);
    expect(state.lastContradictionFeedback).toEqual({ type: 'related_insufficient' });
  });

  it('una combinación incorrecta penaliza una vez con piso cero', () => {
    useGameStore.getState().presentEvidence('ev_toxicology', 'stmt_daniel_arrival');

    let state = useGameStore.getState();
    expect(state.score).toBe(SCORING_RULES.minimumScore);
    expect(state.incorrectAttempts).toBe(1);
    expect(state.lastContradictionFeedback).toEqual({ type: 'incorrect' });

    useGameStore.getState().presentEvidence('ev_access_log', 'stmt_elena_arrival');
    useGameStore.getState().presentEvidence('ev_toxicology', 'stmt_elena_arrival');

    state = useGameStore.getState();
    expect(state.score).toBe(100 - SCORING_RULES.incorrectCombinationPenalty);
    expect(state.incorrectAttempts).toBe(2);
  });

  it('con temporizador expirado provoca derrota por tiempo sin evaluar', () => {
    useGameStore.setState({ timerEndTimestamp: Date.now() - 1 });

    useGameStore.getState().presentEvidence('ev_access_log', 'stmt_daniel_arrival');

    const state = useGameStore.getState();
    expect(state.phase).toBe('defeat_time');
    expect(state.discoveredContradictions.size).toBe(0);
  });

  it('con temporizador nulo provoca derrota por tiempo', () => {
    useGameStore.setState({ timerEndTimestamp: null });

    useGameStore.getState().presentEvidence('ev_access_log', 'stmt_daniel_arrival');

    expect(useGameStore.getState().phase).toBe('defeat_time');
  });

  it('el aviso muere con la llamada que lo produjo', () => {
    useGameStore.getState().startCall('daniel');
    useGameStore.getState().presentEvidence('ev_bottle', 'stmt_daniel_arrival');
    expect(useGameStore.getState().lastContradictionFeedback).not.toBeNull();

    useGameStore.getState().endCall();

    expect(useGameStore.getState().lastContradictionFeedback).toBeNull();
  });

  it('llamar a otro sospechoso no arrastra el aviso de la llamada anterior', () => {
    useGameStore.getState().startCall('daniel');
    useGameStore.getState().presentEvidence('ev_bottle', 'stmt_daniel_arrival');

    useGameStore.getState().startCall('elena');

    expect(useGameStore.getState().lastContradictionFeedback).toBeNull();
  });
});

describe('gameStore: confesión automática', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2025-03-17T20:00:00.000Z'));
    resetStore();
    useGameStore.getState().startGame();
    registerStatements('stmt_daniel_arrival', 'stmt_daniel_office', 'stmt_daniel_substance');
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('la tercera contradicción obligatoria durante la llamada finaliza en victoria por confesión', () => {
    useGameStore.getState().startCall('daniel');

    useGameStore.getState().presentEvidence('ev_access_log', 'stmt_daniel_arrival');
    useGameStore.getState().presentEvidence('ev_camera', 'stmt_daniel_office');
    expect(useGameStore.getState().phase).toBe('active');

    useGameStore.getState().presentEvidence('ev_receipt', 'stmt_daniel_substance');

    const state = useGameStore.getState();
    expect(state.phase).toBe('victory_confession');
    expect(state.discoveredContradictions.size).toBe(3);
    expect(state.suspectPressure.daniel).toBe(100);
    // 500 de contradicciones + 500 de bonus + 720 s restantes
    expect(state.score).toBe(1720);
    expect(state.activeCallSuspect).toBeNull();
    expect(state.callSessionId).toBeNull();
    expect(state.lastContradictionFeedback).toBeNull();
    expect(state.isInterrogationLoading).toBe(false);
  });

  it('sin llamada activa las tres contradicciones no provocan confesión', () => {
    useGameStore.getState().presentEvidence('ev_access_log', 'stmt_daniel_arrival');
    useGameStore.getState().presentEvidence('ev_camera', 'stmt_daniel_office');
    useGameStore.getState().presentEvidence('ev_receipt', 'stmt_daniel_substance');

    const state = useGameStore.getState();
    expect(state.phase).toBe('active');
    expect(state.score).toBe(500);
  });
});

describe('gameStore: submitAccusation', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2025-03-17T20:00:00.000Z'));
    resetStore();
    useGameStore.getState().startGame();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('una acusación correcta gana la partida y consume el intento', () => {
    useGameStore.getState().submitAccusation(CORRECT_ACCUSATION);

    const state = useGameStore.getState();
    expect(state.phase).toBe('victory_accusation');
    expect(state.accusationUsed).toBe(true);
    // 0 de contradicciones + 300 de bonus + 720 s restantes
    expect(state.score).toBe(1020);
  });

  it('una acusación incorrecta pierde la partida', () => {
    useGameStore.getState().submitAccusation({ ...CORRECT_ACCUSATION, suspectId: 'elena' });

    const state = useGameStore.getState();
    expect(state.phase).toBe('defeat_accusation');
    expect(state.accusationUsed).toBe(true);
    expect(state.score).toBe(0);
  });

  it('una segunda acusación no altera el resultado', () => {
    useGameStore.getState().submitAccusation({ ...CORRECT_ACCUSATION, suspectId: 'sofia' });
    const scoreAfterFirst = useGameStore.getState().score;

    useGameStore.getState().submitAccusation(CORRECT_ACCUSATION);

    const state = useGameStore.getState();
    expect(state.phase).toBe('defeat_accusation');
    expect(state.score).toBe(scoreAfterFirst);
  });

  it('el temporizador expirado prevalece sobre la acusación', () => {
    useGameStore.setState({ timerEndTimestamp: Date.now() - 1 });

    useGameStore.getState().submitAccusation(CORRECT_ACCUSATION);

    const state = useGameStore.getState();
    expect(state.phase).toBe('defeat_time');
    expect(state.accusationUsed).toBe(false);
  });
});

describe('gameStore: derrota por tiempo y finalización', () => {
  beforeEach(() => {
    resetStore();
    useGameStore.getState().startGame();
    registerStatements('stmt_elena_arrival');
  });

  it('la derrota por tiempo conserva la puntuación base sin bonus', () => {
    useGameStore.getState().presentEvidence('ev_access_log', 'stmt_elena_arrival');

    useGameStore.getState().triggerTimeDefeat();

    const state = useGameStore.getState();
    expect(state.phase).toBe('defeat_time');
    expect(state.score).toBe(100);
  });

  it('finalizar limpia llamada, solicitud, feedback y loading una sola vez', () => {
    useGameStore.getState().startCall('daniel');
    useGameStore.setState({
      isInterrogationLoading: true,
      currentRequestId: 'req-1',
      lastContradictionFeedback: { type: 'incorrect' },
    });

    useGameStore.getState().triggerTimeDefeat();

    const state = useGameStore.getState();
    expect(state.phase).toBe('defeat_time');
    expect(state.activeCallSuspect).toBeNull();
    expect(state.callSessionId).toBeNull();
    expect(state.currentRequestId).toBeNull();
    expect(state.lastContradictionFeedback).toBeNull();
    expect(state.isInterrogationLoading).toBe(false);

    useGameStore.getState().triggerTimeDefeat();
    expect(useGameStore.getState().phase).toBe('defeat_time');
    expect(useGameStore.getState().score).toBe(state.score);
  });

  it('no acepta acciones de partida después de finalizar', () => {
    useGameStore.getState().triggerTimeDefeat();

    useGameStore.getState().startCall('daniel');
    useGameStore.getState().openEvidence();
    useGameStore.getState().presentEvidence('ev_access_log', 'stmt_elena_arrival');
    useGameStore.getState().submitAccusation(CORRECT_ACCUSATION);

    const state = useGameStore.getState();
    expect(state.phase).toBe('defeat_time');
    expect(state.activeCallSuspect).toBeNull();
    expect(state.accusationUsed).toBe(false);
    expect(state.discoveredContradictions.size).toBe(0);
  });
});

describe('gameStore: resetGame', () => {
  beforeEach(resetStore);

  it('restaura el estado inicial completo', () => {
    useGameStore.getState().startGame();
    registerStatements('stmt_elena_arrival');
    useGameStore.getState().startCall('elena');
    useGameStore.getState().presentEvidence('ev_access_log', 'stmt_elena_arrival');
    useGameStore.getState().presentEvidence('ev_toxicology', 'stmt_elena_arrival');
    useGameStore.setState({
      isInterrogationLoading: true,
      currentRequestId: 'req-1',
      callHistory: {
        ...useGameStore.getState().callHistory,
        elena: [{ role: 'player', text: 'Hola', timestamp: Date.now() }],
      },
    });

    useGameStore.getState().resetGame();

    const state = useGameStore.getState();
    expect(state.phase).toBe('title');
    expect(state.activeView).toBe('desktop');
    expect(state.score).toBe(0);
    expect(state.incorrectAttempts).toBe(0);
    expect(state.timerEndTimestamp).toBeNull();
    expect(state.discoveredContradictions.size).toBe(0);
    expect(state.registeredStatements.size).toBe(0);
    expect(state.accusationUsed).toBe(false);
    expect(state.activeCallSuspect).toBeNull();
    expect(state.callSessionId).toBeNull();
    expect(state.currentRequestId).toBeNull();
    expect(state.lastContradictionFeedback).toBeNull();
    expect(state.isInterrogationLoading).toBe(false);
    for (const suspectId of SUSPECT_IDS) {
      expect(state.suspectPressure[suspectId]).toBe(0);
      expect(state.callHistory[suspectId]).toEqual([]);
    }
  });
});
