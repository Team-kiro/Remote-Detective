/**
 * Grupo de pruebas (c) — flujo real del store para acusación, temporizador,
 * finalización y reinicio.
 *
 * Usa el store real y los motores deterministas reales: la UI solo entrega un
 * `AccusationInput` o pide la derrota por tiempo, y el store decide resultado,
 * puntuación final, limpieza y reinicio. El tiempo se controla con fake timers
 * para que toda puntuación dependiente del temporizador sea determinista.
 *
 * Requisitos: 9.4-9.5, 10.1-10.4, 11.4-11.5, 12.4-12.9, 13.7, 13.9-13.11,
 * 15.3-15.4, 15.6, 18.5
 */

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { config } from '@/config';
import { EVIDENCE_IDS, METHOD_IDS, MOTIVE_IDS, SUSPECT_IDS } from '@/data/types';
import { SCORING_RULES } from '@/data/scoringRules';
import { SOLUTION } from '@/data/solution';
import { calculateTimeRemaining, timeRemainingSeconds } from '@/logic/timerEngine';
import { createInitialGameSessionState, useGameStore } from '@/store/gameStore';
import { PERSISTENCE_KEY } from '@/store/persistence';
import type {
  AccusationInput,
  ActiveView,
  EndGamePhase,
  EvidenceId,
  StatementId,
} from '@/data/types';

/** Reloj fijo de referencia: toda puntuación por tiempo queda determinista. */
const NOW = new Date('2025-03-17T20:00:00.000Z').getTime();

/** Duración fija de la partida convertida a segundos de bonus. */
const FULL_SECONDS = config.timerDurationMs / 1_000;

const DANIEL_QUESTION = '¿A qué hora llegaste al edificio?';

/** Acusación que coincide exactamente con la solución narrativa congelada. */
const CORRECT_ACCUSATION: AccusationInput = {
  suspectId: SOLUTION.culpritId,
  motiveId: SOLUTION.motiveId,
  methodId: SOLUTION.methodId,
  evidenceIds: SOLUTION.requiredEvidenceIds,
};

/** Acusación confirmada que falla solo en el culpable. */
const WRONG_ACCUSATION: AccusationInput = { ...CORRECT_ACCUSATION, suspectId: 'elena' };

/** Pareja evidencia/declaración de cada contradicción obligatoria de Daniel. */
const DANIEL_MANDATORY: readonly { evidenceId: EvidenceId; statementId: StatementId }[] = [
  { evidenceId: 'ev_access_log', statementId: 'stmt_daniel_arrival' },
  { evidenceId: 'ev_camera', statementId: 'stmt_daniel_office' },
  { evidenceId: 'ev_receipt', statementId: 'stmt_daniel_substance' },
];

/** 150 + 150 + 200 de las tres contradicciones obligatorias de Daniel. */
const DANIEL_POINTS = 500;

/** 100 puntos de la contradicción de Elena, usada como base sin confesión. */
const ELENA_POINTS = 100;

function resetStore(): void {
  useGameStore.setState(createInitialGameSessionState());
}

/**
 * Registra declaraciones canónicas sin pasar por `askQuestion`: el registro es
 * interno y ninguna acción pública permite fabricarlo desde la UI.
 */
function registerStatements(...statementIds: readonly StatementId[]): void {
  useGameStore.setState({ registeredStatements: new Set(statementIds) });
}

/** Marca de fin del temporizador de la partida activa. */
function requireTimerEnd(): number {
  const timerEndTimestamp = useGameStore.getState().timerEndTimestamp;
  if (timerEndTimestamp === null) {
    throw new Error('se esperaba una partida activa con temporizador');
  }

  return timerEndTimestamp;
}

/** Fuerza un temporizador ya vencido sin tocar el resto del estado. */
function expireTimer(): void {
  useGameStore.setState({ timerEndTimestamp: Date.now() - 1 });
}

/** Deja pendiente el estado transitorio que toda finalización debe limpiar. */
function pollutePendingState(): void {
  useGameStore.setState({
    isInterrogationLoading: true,
    currentRequestId: 'req-obsoleto',
    lastContradictionFeedback: { type: 'incorrect' },
  });
}

/** Formato `mm:ss` derivado de los segundos restantes del temporizador. */
function formatMmSs(totalSeconds: number): string {
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;

  return `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
}

function readPersisted(): string | null {
  return globalThis.sessionStorage.getItem(PERSISTENCE_KEY);
}

beforeEach(() => {
  vi.useFakeTimers();
  vi.setSystemTime(NOW);
  globalThis.sessionStorage.clear();
  resetStore();
});

afterEach(() => {
  vi.unstubAllGlobals();
  vi.useRealTimers();
});

describe('submitAccusation: evaluación interna desde AccusationInput', () => {
  beforeEach(() => {
    useGameStore.getState().startGame();
    useGameStore.getState().openAccusation();
  });

  it('una acusación correcta gana la partida y expone el score final', () => {
    useGameStore.getState().submitAccusation(CORRECT_ACCUSATION);

    const state = useGameStore.getState();
    expect(state.phase).toBe('victory_accusation');
    expect(state.accusationUsed).toBe(true);
    expect(state.score).toBe(SCORING_RULES.correctAccusationBonus + FULL_SECONDS);
  });

  it.each(SUSPECT_IDS.filter((suspectId) => suspectId !== SOLUTION.culpritId))(
    'un culpable incorrecto (%s) pierde la partida',
    (suspectId) => {
      useGameStore.getState().submitAccusation({ ...CORRECT_ACCUSATION, suspectId });

      const state = useGameStore.getState();
      expect(state.phase).toBe('defeat_accusation');
      expect(state.accusationUsed).toBe(true);
      expect(state.score).toBe(SCORING_RULES.minimumScore);
    },
  );

  it.each(MOTIVE_IDS.filter((motiveId) => motiveId !== SOLUTION.motiveId))(
    'un motivo incorrecto (%s) pierde la partida pero conserva el crédito parcial',
    (motiveId) => {
      useGameStore.getState().submitAccusation({ ...CORRECT_ACCUSATION, motiveId });

      expect(useGameStore.getState().phase).toBe('defeat_accusation');
      expect(useGameStore.getState().score).toBe(SCORING_RULES.partialSuspectBonus);
    },
  );

  it.each(METHOD_IDS.filter((methodId) => methodId !== SOLUTION.methodId))(
    'un método incorrecto (%s) pierde la partida pero conserva el crédito parcial',
    (methodId) => {
      useGameStore.getState().submitAccusation({ ...CORRECT_ACCUSATION, methodId });

      expect(useGameStore.getState().phase).toBe('defeat_accusation');
      expect(useGameStore.getState().score).toBe(SCORING_RULES.partialSuspectBonus);
    },
  );

  it.each([...SOLUTION.requiredEvidenceIds])(
    'omitir la evidencia requerida %s pierde la partida',
    (missingEvidenceId) => {
      const evidenceIds = SOLUTION.requiredEvidenceIds.filter(
        (evidenceId) => evidenceId !== missingEvidenceId,
      );

      useGameStore.getState().submitAccusation({ ...CORRECT_ACCUSATION, evidenceIds });

      expect(useGameStore.getState().phase).toBe('defeat_accusation');
      expect(evidenceIds).toHaveLength(SOLUTION.requiredEvidenceIds.length - 1);
    },
  );

  it('acepta evidencias extra sin relajar las requeridas', () => {
    useGameStore.getState().submitAccusation({
      ...CORRECT_ACCUSATION,
      evidenceIds: [...EVIDENCE_IDS],
    });

    const state = useGameStore.getState();
    expect(state.phase).toBe('victory_accusation');
    expect(state.score).toBe(SCORING_RULES.correctAccusationBonus + FULL_SECONDS);
  });

  it('incluye las contradicciones descubiertas en el score de la victoria', () => {
    registerStatements('stmt_elena_arrival');
    useGameStore.getState().presentEvidence('ev_access_log', 'stmt_elena_arrival');
    expect(useGameStore.getState().score).toBe(ELENA_POINTS);

    useGameStore.getState().submitAccusation(CORRECT_ACCUSATION);

    expect(useGameStore.getState().score).toBe(
      ELENA_POINTS + SCORING_RULES.correctAccusationBonus + FULL_SECONDS,
    );
  });
});

describe('submitAccusation: intento único y superficie pública', () => {
  beforeEach(() => {
    useGameStore.getState().startGame();
  });

  it('abrir la acusación no consume el intento', () => {
    useGameStore.getState().openAccusation();

    const state = useGameStore.getState();
    expect(state.activeView).toBe('accusation');
    expect(state.accusationUsed).toBe(false);
    expect(state.phase).toBe('active');
  });

  it('cancelar la acusación tantas veces como quiera no consume el intento', () => {
    for (let attempt = 0; attempt < 3; attempt += 1) {
      useGameStore.getState().openAccusation();
      useGameStore.getState().returnToDesktop();

      const state = useGameStore.getState();
      expect(state.activeView).toBe('desktop');
      expect(state.accusationUsed).toBe(false);
      expect(state.phase).toBe('active');
      expect(state.score).toBe(0);
    }

    useGameStore.getState().submitAccusation(CORRECT_ACCUSATION);
    expect(useGameStore.getState().accusationUsed).toBe(true);
  });

  it('una acusación correcta confirmada es irreversible', () => {
    useGameStore.getState().submitAccusation(CORRECT_ACCUSATION);
    const scoreAfterFirst = useGameStore.getState().score;

    useGameStore.getState().submitAccusation(WRONG_ACCUSATION);

    const state = useGameStore.getState();
    expect(state.phase).toBe('victory_accusation');
    expect(state.score).toBe(scoreAfterFirst);
    expect(state.accusationUsed).toBe(true);
  });

  it('una acusación incorrecta confirmada no puede corregirse', () => {
    useGameStore.getState().submitAccusation(WRONG_ACCUSATION);

    useGameStore.getState().submitAccusation(CORRECT_ACCUSATION);

    const state = useGameStore.getState();
    expect(state.phase).toBe('defeat_accusation');
    expect(state.score).toBe(SCORING_RULES.minimumScore);
    expect(state.accusationUsed).toBe(true);
  });

  it('la UI no puede entregar el resultado calculado ni fabricar la finalización', () => {
    const keys = Object.keys(useGameStore.getState());

    expect(keys).not.toContain('finalizeGame');
    expect(keys).not.toContain('setPhase');
    expect(keys).not.toContain('setScore');
    expect(keys).not.toContain('setAccusationResult');
    expect(keys).not.toContain('setActiveView');
    // `submitAccusation` solo acepta la selección del jugador: sospechoso,
    // motivo, método y evidencias. Nunca un resultado ni una puntuación.
    expect(Object.keys(CORRECT_ACCUSATION).sort()).toEqual([
      'evidenceIds',
      'methodId',
      'motiveId',
      'suspectId',
    ]);
  });
});

describe('temporizador: cálculo del tiempo restante y formato derivable', () => {
  it('arranca con la duración configurada y permite derivar mm:ss', () => {
    useGameStore.getState().startGame();

    const timerEndTimestamp = requireTimerEnd();
    expect(timerEndTimestamp).toBe(NOW + config.timerDurationMs);
    expect(calculateTimeRemaining(timerEndTimestamp)).toBe(config.timerDurationMs);
    expect(formatMmSs(timeRemainingSeconds(timerEndTimestamp))).toBe('12:00');

    vi.advanceTimersByTime(300_000);
    expect(calculateTimeRemaining(timerEndTimestamp)).toBe(420_000);
    expect(formatMmSs(timeRemainingSeconds(timerEndTimestamp))).toBe('07:00');

    vi.advanceTimersByTime(419_000);
    expect(formatMmSs(timeRemainingSeconds(timerEndTimestamp))).toBe('00:01');

    vi.advanceTimersByTime(2_000);
    expect(calculateTimeRemaining(timerEndTimestamp)).toBe(0);
    expect(formatMmSs(timeRemainingSeconds(timerEndTimestamp))).toBe('00:00');
  });
});

interface ViewCase {
  view: ActiveView;
  open: () => void;
}

const VIEW_CASES: readonly ViewCase[] = [
  {
    view: 'desktop',
    open: () => {
      useGameStore.getState().returnToDesktop();
    },
  },
  {
    view: 'casefile',
    open: () => {
      useGameStore.getState().openCaseFile();
    },
  },
  {
    view: 'evidence',
    open: () => {
      useGameStore.getState().openEvidence();
    },
  },
  {
    view: 'call',
    open: () => {
      useGameStore.getState().startCall('elena');
    },
  },
  {
    view: 'accusation',
    open: () => {
      useGameStore.getState().openAccusation();
    },
  },
];

describe('temporizador: expiración detectada desde cualquier vista activa', () => {
  it.each(VIEW_CASES)(
    'la expiración en la vista $view termina la partida como derrota por tiempo',
    ({ view, open }) => {
      useGameStore.getState().startGame();
      registerStatements('stmt_elena_arrival');
      useGameStore.getState().presentEvidence('ev_access_log', 'stmt_elena_arrival');
      const timerEndTimestamp = requireTimerEnd();

      open();
      expect(useGameStore.getState().activeView).toBe(view);

      vi.advanceTimersByTime(config.timerDurationMs);
      useGameStore.getState().triggerTimeDefeat();

      const state = useGameStore.getState();
      expect(state.phase).toBe('defeat_time');
      // Derrota: score base sin bonus ni segundos restantes.
      expect(state.score).toBe(ELENA_POINTS);
      // El temporizador queda detenido mostrando su marca de fin.
      expect(state.timerEndTimestamp).toBe(timerEndTimestamp);
      expect(calculateTimeRemaining(timerEndTimestamp)).toBe(0);
    },
  );

  it('presentar una evidencia con el temporizador vencido termina por tiempo', () => {
    useGameStore.getState().startGame();
    registerStatements('stmt_elena_arrival');
    useGameStore.getState().openEvidence();
    expireTimer();

    useGameStore.getState().presentEvidence('ev_access_log', 'stmt_elena_arrival');

    const state = useGameStore.getState();
    expect(state.phase).toBe('defeat_time');
    expect(state.discoveredContradictions.size).toBe(0);
    expect(state.score).toBe(SCORING_RULES.minimumScore);
  });

  it('interrogar con el temporizador vencido termina por tiempo sin registrar nada', async () => {
    useGameStore.getState().startGame();
    useGameStore.getState().startCall('daniel');
    expireTimer();

    await useGameStore.getState().askQuestion(DANIEL_QUESTION);

    const state = useGameStore.getState();
    expect(state.phase).toBe('defeat_time');
    expect(state.callHistory.daniel).toEqual([]);
    expect(state.registeredStatements.size).toBe(0);
    expect(state.isInterrogationLoading).toBe(false);
    expect(state.activeCallSuspect).toBeNull();
  });
});

describe('temporizador: timestamp nulo o expirado produce defeat_time seguro', () => {
  beforeEach(() => {
    useGameStore.getState().startGame();
  });

  it('un timestamp nulo termina la partida sin errores al pedir la derrota', () => {
    useGameStore.setState({ timerEndTimestamp: null });

    useGameStore.getState().triggerTimeDefeat();

    const state = useGameStore.getState();
    expect(state.phase).toBe('defeat_time');
    expect(state.score).toBe(SCORING_RULES.minimumScore);
  });

  it('un timestamp nulo termina la partida al presentar evidencia', () => {
    registerStatements('stmt_elena_arrival');
    useGameStore.setState({ timerEndTimestamp: null });

    useGameStore.getState().presentEvidence('ev_access_log', 'stmt_elena_arrival');

    expect(useGameStore.getState().phase).toBe('defeat_time');
    expect(useGameStore.getState().discoveredContradictions.size).toBe(0);
  });

  it('un timestamp nulo termina la partida al interrogar', async () => {
    useGameStore.getState().startCall('daniel');
    useGameStore.setState({ timerEndTimestamp: null });

    await useGameStore.getState().askQuestion(DANIEL_QUESTION);

    const state = useGameStore.getState();
    expect(state.phase).toBe('defeat_time');
    expect(state.callHistory.daniel).toEqual([]);
    expect(state.isInterrogationLoading).toBe(false);
  });

  it.each([
    { label: 'nulo', apply: () => { useGameStore.setState({ timerEndTimestamp: null }); } },
    { label: 'expirado', apply: expireTimer },
  ])(
    'el temporizador $label prevalece sobre la acusación en curso',
    ({ apply }) => {
      useGameStore.getState().openAccusation();
      apply();

      useGameStore.getState().submitAccusation(CORRECT_ACCUSATION);

      const state = useGameStore.getState();
      expect(state.phase).toBe('defeat_time');
      // El intento no se consume: la partida terminó antes de evaluarla.
      expect(state.accusationUsed).toBe(false);
      expect(state.score).toBe(SCORING_RULES.minimumScore);
    },
  );

  it('el temporizador expirado prevalece sobre la confesión en curso', () => {
    registerStatements(...DANIEL_MANDATORY.map((pair) => pair.statementId));
    useGameStore.getState().startCall('daniel');
    useGameStore.getState().presentEvidence('ev_access_log', 'stmt_daniel_arrival');
    useGameStore.getState().presentEvidence('ev_camera', 'stmt_daniel_office');
    expect(useGameStore.getState().phase).toBe('active');

    expireTimer();
    useGameStore.getState().presentEvidence('ev_receipt', 'stmt_daniel_substance');

    const state = useGameStore.getState();
    expect(state.phase).toBe('defeat_time');
    expect(state.discoveredContradictions.size).toBe(2);
    // Sin bonus de confesión ni tiempo restante: solo las dos contradicciones.
    expect(state.score).toBe(300);
  });
});

interface EndScenario {
  phase: EndGamePhase;
  expectedScore: number;
  setup: () => void;
  run: () => void;
}

const END_SCENARIOS: readonly EndScenario[] = [
  {
    phase: 'victory_accusation',
    expectedScore: SCORING_RULES.correctAccusationBonus + FULL_SECONDS,
    setup: () => {
      useGameStore.getState().startCall('elena');
    },
    run: () => {
      useGameStore.getState().submitAccusation(CORRECT_ACCUSATION);
    },
  },
  {
    phase: 'defeat_accusation',
    expectedScore: SCORING_RULES.minimumScore,
    setup: () => {
      useGameStore.getState().startCall('elena');
    },
    run: () => {
      useGameStore.getState().submitAccusation(WRONG_ACCUSATION);
    },
  },
  {
    phase: 'defeat_time',
    expectedScore: SCORING_RULES.minimumScore,
    setup: () => {
      useGameStore.getState().startCall('elena');
    },
    run: () => {
      useGameStore.getState().triggerTimeDefeat();
    },
  },
  {
    phase: 'victory_confession',
    expectedScore: DANIEL_POINTS + SCORING_RULES.confessionBonus + FULL_SECONDS,
    setup: () => {
      registerStatements(...DANIEL_MANDATORY.map((pair) => pair.statementId));
      useGameStore.getState().startCall('daniel');
      useGameStore.getState().presentEvidence('ev_access_log', 'stmt_daniel_arrival');
      useGameStore.getState().presentEvidence('ev_camera', 'stmt_daniel_office');
    },
    run: () => {
      useGameStore.getState().presentEvidence('ev_receipt', 'stmt_daniel_substance');
    },
  },
];

describe('finalización: temporizador detenido, score único y limpieza', () => {
  it.each(END_SCENARIOS)(
    '$phase detiene el temporizador, calcula el score una vez y limpia el estado transitorio',
    ({ phase, expectedScore, setup, run }) => {
      useGameStore.getState().startGame();
      const timerEndTimestamp = requireTimerEnd();
      setup();
      pollutePendingState();

      run();

      const state = useGameStore.getState();
      expect(state.phase).toBe(phase);
      expect(state.score).toBe(expectedScore);
      expect(state.activeCallSuspect).toBeNull();
      expect(state.callSessionId).toBeNull();
      expect(state.currentRequestId).toBeNull();
      expect(state.lastContradictionFeedback).toBeNull();
      expect(state.isInterrogationLoading).toBe(false);
      // El temporizador se detiene conservando la marca del momento de cierre.
      expect(state.timerEndTimestamp).toBe(timerEndTimestamp);
      expect(readPersisted()).toBeNull();

      // Una segunda finalización, incluso con el tiempo ya vencido, no altera
      // el resultado ni recalcula la puntuación.
      vi.advanceTimersByTime(config.timerDurationMs * 2);
      useGameStore.getState().triggerTimeDefeat();
      useGameStore.getState().submitAccusation(CORRECT_ACCUSATION);
      useGameStore.getState().startCall('daniel');

      const after = useGameStore.getState();
      expect(after.phase).toBe(phase);
      expect(after.score).toBe(expectedScore);
      expect(after.activeCallSuspect).toBeNull();
      expect(after.timerEndTimestamp).toBe(timerEndTimestamp);
    },
  );
});

describe('resetGame: restauración completa y limpieza de sessionStorage', () => {
  it('restaura todo el estado mutable poblado y borra la sesión guardada', async () => {
    useGameStore.getState().startGame();
    registerStatements('stmt_daniel_arrival');
    useGameStore.getState().startCall('daniel');
    await useGameStore.getState().askQuestion(DANIEL_QUESTION);
    useGameStore.getState().presentEvidence('ev_access_log', 'stmt_daniel_arrival');
    useGameStore.getState().presentEvidence('ev_toxicology', 'stmt_daniel_arrival');
    useGameStore.getState().openAccusation();
    pollutePendingState();

    const populated = useGameStore.getState();
    expect(populated.phase).toBe('active');
    expect(populated.activeView).toBe('accusation');
    expect(populated.score).toBeGreaterThan(0);
    expect(populated.incorrectAttempts).toBe(1);
    expect(populated.discoveredContradictions.size).toBe(1);
    expect(populated.registeredStatements.size).toBeGreaterThan(0);
    expect(populated.suspectPressure.daniel).toBeGreaterThan(0);
    expect(populated.callHistory.daniel.length).toBeGreaterThan(0);
    expect(populated.timerEndTimestamp).not.toBeNull();
    expect(readPersisted()).not.toBeNull();

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
    expect(readPersisted()).toBeNull();
  });

  it('reiniciar tras una acusación confirmada devuelve el intento y el estado inicial', () => {
    useGameStore.getState().startGame();
    useGameStore.getState().submitAccusation(WRONG_ACCUSATION);
    expect(useGameStore.getState().accusationUsed).toBe(true);

    useGameStore.getState().resetGame();

    const state = useGameStore.getState();
    expect(state.phase).toBe('title');
    expect(state.accusationUsed).toBe(false);
    expect(state.score).toBe(0);
    expect(state.timerEndTimestamp).toBeNull();
    expect(readPersisted()).toBeNull();
  });

  it('permite comenzar una partida nueva completa después del reinicio', () => {
    useGameStore.getState().startGame();
    useGameStore.getState().submitAccusation(WRONG_ACCUSATION);
    useGameStore.getState().resetGame();

    useGameStore.getState().startGame();

    const state = useGameStore.getState();
    expect(state.phase).toBe('active');
    expect(state.activeView).toBe('desktop');
    expect(state.timerEndTimestamp).toBe(NOW + config.timerDurationMs);
    expect(state.accusationUsed).toBe(false);
    expect(readPersisted()).not.toBeNull();
  });
});
