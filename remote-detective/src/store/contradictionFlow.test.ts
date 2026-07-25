/**
 * Grupo de pruebas (b) — flujo real del store para contradicciones, presión,
 * confesión y puntuación.
 *
 * Usa el store real y los motores deterministas reales: la UI solo entrega la
 * pareja evidencia/declaración y el store decide resultado, puntos, presión,
 * penalización, feedback, confesión y puntuación final.
 *
 * Requisitos: 8.2-8.9, 9.1-9.6, 11.1-11.6, 15.1-15.2
 */

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { config } from '@/config';
import { CONTRADICTIONS } from '@/data/contradictions';
import { SCORING_RULES } from '@/data/scoringRules';
import { SOLUTION } from '@/data/solution';
import { SUSPECT_IDS } from '@/data/types';
import { createInitialGameSessionState, useGameStore } from '@/store/gameStore';
import type { AppConfig, InterrogationMode } from '@/config';
import type { AccusationInput, StatementId, SuspectId } from '@/data/types';

const DANIEL_STATEMENTS: readonly StatementId[] = [
  'stmt_daniel_arrival',
  'stmt_daniel_office',
  'stmt_daniel_substance',
];

const ALL_STATEMENTS: readonly StatementId[] = [
  ...DANIEL_STATEMENTS,
  'stmt_elena_arrival',
  'stmt_roberto_knowledge',
  'stmt_sofia_witness',
];

const DANIEL_QUESTION = '¿A qué hora llegaste al edificio?';

const CORRECT_ACCUSATION: AccusationInput = {
  suspectId: 'daniel',
  motiveId: 'motive_silence',
  methodId: 'method_poison',
  evidenceIds: ['ev_email', 'ev_camera', 'ev_receipt', 'ev_bottle'],
};

// 150 + 150 + 200 de las tres contradicciones obligatorias de Daniel.
const DANIEL_POINTS = 500;
// Puntos de las seis contradicciones del catálogo.
const ALL_POINTS = 800;
// Duración fija de la partida: 720 000 ms equivalen a 720 s de bonus.
const FULL_SECONDS = config.timerDurationMs / 1_000;

const originalMode: InterrogationMode = config.interrogationMode;
const originalApiUrl: string | null = config.apiUrl;

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

/** Descubre las tres contradicciones obligatorias de Daniel en orden. */
function discoverDanielMandatory(): void {
  useGameStore.getState().presentEvidence('ev_access_log', 'stmt_daniel_arrival');
  useGameStore.getState().presentEvidence('ev_camera', 'stmt_daniel_office');
  useGameStore.getState().presentEvidence('ev_receipt', 'stmt_daniel_substance');
}

/** Activa el modo remoto sin alterar el resto de la configuración aprobada. */
function enableBedrock(): void {
  const mutable: AppConfig = config;
  mutable.interrogationMode = 'bedrock';
  mutable.apiUrl = 'https://example.invalid/prod';
}

beforeEach(() => {
  globalThis.sessionStorage.clear();
  resetStore();
});

afterEach(() => {
  const mutable: AppConfig = config;
  mutable.interrogationMode = originalMode;
  mutable.apiUrl = originalApiUrl;
  vi.unstubAllGlobals();
  vi.useRealTimers();
});

describe('presentEvidence: cada contradicción válida del catálogo', () => {
  it.each([...CONTRADICTIONS])(
    '$id otorga sus puntos y presión de catálogo una sola vez',
    (contradiction) => {
      useGameStore.getState().startGame();
      registerStatements(contradiction.statementId);

      useGameStore.getState().presentEvidence(contradiction.evidenceId, contradiction.statementId);

      const afterFirst = useGameStore.getState();
      expect(afterFirst.discoveredContradictions.has(contradiction.id)).toBe(true);
      expect(afterFirst.discoveredContradictions.size).toBe(1);
      expect(afterFirst.score).toBe(contradiction.points);
      expect(afterFirst.suspectPressure[contradiction.suspectId]).toBe(
        contradiction.pressureIncrease,
      );
      expect(afterFirst.incorrectAttempts).toBe(0);
      expect(afterFirst.lastContradictionFeedback).toEqual({
        type: 'valid',
        explanation: contradiction.explanation,
      });

      for (const suspectId of SUSPECT_IDS) {
        if (suspectId !== contradiction.suspectId) {
          expect(afterFirst.suspectPressure[suspectId]).toBe(0);
        }
      }

      // Repetirla no vuelve a aplicar puntos ni presión.
      useGameStore.getState().presentEvidence(contradiction.evidenceId, contradiction.statementId);

      const afterRepeat = useGameStore.getState();
      expect(afterRepeat.score).toBe(contradiction.points);
      expect(afterRepeat.suspectPressure[contradiction.suspectId]).toBe(
        contradiction.pressureIncrease,
      );
      expect(afterRepeat.discoveredContradictions.size).toBe(1);
      expect(afterRepeat.incorrectAttempts).toBe(0);
      expect(afterRepeat.lastContradictionFeedback).toEqual({ type: 'already_discovered' });
    },
  );

  it('acumula las seis contradicciones con la presión de cada sospechoso', () => {
    useGameStore.getState().startGame();
    registerStatements(...ALL_STATEMENTS);

    for (const contradiction of CONTRADICTIONS) {
      useGameStore.getState().presentEvidence(contradiction.evidenceId, contradiction.statementId);
    }

    const state = useGameStore.getState();
    expect(state.phase).toBe('active');
    expect(state.discoveredContradictions.size).toBe(6);
    expect(state.score).toBe(ALL_POINTS);
    expect(state.suspectPressure).toEqual({ daniel: 100, elena: 20, roberto: 20, sofia: 20 });
    expect(state.incorrectAttempts).toBe(0);
  });
});

describe('presentEvidence: contradicción ya descubierta', () => {
  beforeEach(() => {
    useGameStore.getState().startGame();
    registerStatements(...ALL_STATEMENTS);
  });

  it('repetir las seis contradicciones no altera score, presión ni intentos', () => {
    for (const contradiction of CONTRADICTIONS) {
      useGameStore.getState().presentEvidence(contradiction.evidenceId, contradiction.statementId);
    }
    const before = useGameStore.getState();

    for (const contradiction of CONTRADICTIONS) {
      useGameStore.getState().presentEvidence(contradiction.evidenceId, contradiction.statementId);
    }

    const after = useGameStore.getState();
    expect(after.score).toBe(before.score);
    expect(after.suspectPressure).toEqual(before.suspectPressure);
    expect(after.incorrectAttempts).toBe(before.incorrectAttempts);
    expect(after.discoveredContradictions.size).toBe(6);
    expect(after.lastContradictionFeedback).toEqual({ type: 'already_discovered' });
  });

  it('no revierte una penalización previa ni suma puntos nuevos', () => {
    useGameStore.getState().presentEvidence('ev_access_log', 'stmt_elena_arrival');
    useGameStore.getState().presentEvidence('ev_toxicology', 'stmt_elena_arrival');
    const penalized = useGameStore.getState();

    useGameStore.getState().presentEvidence('ev_access_log', 'stmt_elena_arrival');

    const state = useGameStore.getState();
    expect(state.score).toBe(penalized.score);
    expect(state.incorrectAttempts).toBe(penalized.incorrectAttempts);
    expect(state.suspectPressure.elena).toBe(20);
  });
});

describe('presentEvidence: combinación incorrecta', () => {
  beforeEach(() => {
    useGameStore.getState().startGame();
    registerStatements(...ALL_STATEMENTS);
  });

  it('aplica una única penalización con score mayor, igual y menor que ella', () => {
    useGameStore.getState().presentEvidence('ev_access_log', 'stmt_elena_arrival');
    expect(useGameStore.getState().score).toBe(100);

    // Score (100) mayor que la penalización (50): se resta completa.
    useGameStore.getState().presentEvidence('ev_toxicology', 'stmt_elena_arrival');
    let state = useGameStore.getState();
    expect(state.score).toBe(100 - SCORING_RULES.incorrectCombinationPenalty);
    expect(state.incorrectAttempts).toBe(1);
    expect(state.lastContradictionFeedback).toEqual({ type: 'incorrect' });

    // Score (50) igual que la penalización: queda exactamente en cero.
    useGameStore.getState().presentEvidence('ev_bottle', 'stmt_elena_arrival');
    state = useGameStore.getState();
    expect(state.score).toBe(SCORING_RULES.minimumScore);
    expect(state.incorrectAttempts).toBe(2);

    // Score (0) menor que la penalización: nunca baja de cero.
    useGameStore.getState().presentEvidence('ev_receipt', 'stmt_roberto_knowledge');
    state = useGameStore.getState();
    expect(state.score).toBe(SCORING_RULES.minimumScore);
    expect(state.incorrectAttempts).toBe(3);
    expect(state.lastContradictionFeedback).toEqual({ type: 'incorrect' });

    // Ninguna combinación incorrecta toca presión ni contradicciones.
    expect(state.suspectPressure).toEqual({ daniel: 0, elena: 20, roberto: 0, sofia: 0 });
    expect(state.discoveredContradictions.size).toBe(1);
  });
});

describe('presentEvidence: evidencia relacionada pero insuficiente', () => {
  beforeEach(() => {
    useGameStore.getState().startGame();
    registerStatements(...ALL_STATEMENTS);
  });

  it.each([
    ['ev_bottle', 'stmt_daniel_arrival'],
    ['ev_receipt', 'stmt_daniel_office'],
    ['ev_camera', 'stmt_daniel_substance'],
    ['ev_access_log', 'stmt_roberto_knowledge'],
    ['ev_access_log', 'stmt_sofia_witness'],
  ] as const)('%s sobre %s informa sin penalizar', (evidenceId, statementId) => {
    useGameStore.getState().presentEvidence(evidenceId, statementId);

    const state = useGameStore.getState();
    expect(state.lastContradictionFeedback).toEqual({ type: 'related_insufficient' });
    expect(state.score).toBe(0);
    expect(state.incorrectAttempts).toBe(0);
    expect(state.discoveredContradictions.size).toBe(0);
    expect(state.suspectPressure).toEqual({ daniel: 0, elena: 0, roberto: 0, sofia: 0 });
  });
});

describe('presentEvidence: confesión automática de Daniel', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2025-03-17T20:00:00.000Z'));
    useGameStore.getState().startGame();
    registerStatements(...DANIEL_STATEMENTS);
  });

  it('la tercera contradicción usa la presión y el conjunto recién actualizados', () => {
    useGameStore.getState().startCall('daniel');

    useGameStore.getState().presentEvidence('ev_access_log', 'stmt_daniel_arrival');
    let state = useGameStore.getState();
    expect(state.phase).toBe('active');
    expect(state.suspectPressure.daniel).toBe(30);

    useGameStore.getState().presentEvidence('ev_camera', 'stmt_daniel_office');
    state = useGameStore.getState();
    // Con dos contradicciones la presión sigue por debajo del umbral.
    expect(state.phase).toBe('active');
    expect(state.suspectPressure.daniel).toBe(60);
    expect(state.suspectPressure.daniel).toBeLessThan(SOLUTION.confessionPressureThreshold);
    expect(state.discoveredContradictions.size).toBe(2);

    useGameStore.getState().presentEvidence('ev_receipt', 'stmt_daniel_substance');

    state = useGameStore.getState();
    expect(state.phase).toBe('victory_confession');
    // La presión y el conjunto usados son los posteriores a la actualización.
    expect(state.suspectPressure.daniel).toBe(100);
    expect(state.discoveredContradictions.size).toBe(3);
    // 500 de contradicciones (incluida la tercera) + 500 de bonus + 720 s.
    expect(state.score).toBe(DANIEL_POINTS + SCORING_RULES.confessionBonus + FULL_SECONDS);
    expect(state.activeCallSuspect).toBeNull();
    expect(state.callSessionId).toBeNull();
    expect(state.currentRequestId).toBeNull();
    expect(state.lastContradictionFeedback).toBeNull();
    expect(state.isInterrogationLoading).toBe(false);
  });

  it('no duplica el bonus ni recalcula la puntuación tras la confesión', () => {
    useGameStore.getState().startCall('daniel');
    discoverDanielMandatory();
    const finalScore = useGameStore.getState().score;

    useGameStore.getState().triggerTimeDefeat();
    useGameStore.getState().submitAccusation(CORRECT_ACCUSATION);
    useGameStore.getState().presentEvidence('ev_access_log', 'stmt_daniel_arrival');

    const state = useGameStore.getState();
    expect(state.phase).toBe('victory_confession');
    expect(state.score).toBe(finalScore);
    expect(state.accusationUsed).toBe(false);
  });

  it('convierte el tiempo restante de milisegundos a segundos truncados', () => {
    useGameStore.getState().startCall('daniel');
    vi.advanceTimersByTime(30_500);

    discoverDanielMandatory();

    // Restan 689 500 ms: 689 s completos.
    expect(useGameStore.getState().score).toBe(
      DANIEL_POINTS + SCORING_RULES.confessionBonus + 689,
    );
  });

  it('confiesa al abrir la llamada si las condiciones ya se cumplían', () => {
    discoverDanielMandatory();
    let state = useGameStore.getState();
    expect(state.phase).toBe('active');
    expect(state.suspectPressure.daniel).toBe(100);

    useGameStore.getState().startCall('daniel');

    state = useGameStore.getState();
    expect(state.phase).toBe('victory_confession');
    expect(state.score).toBe(DANIEL_POINTS + SCORING_RULES.confessionBonus + FULL_SECONDS);
    expect(state.activeCallSuspect).toBeNull();
    expect(state.callSessionId).toBeNull();
  });
});

describe('presentEvidence: la confesión exige toda la conjunción', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2025-03-17T20:00:00.000Z'));
    useGameStore.getState().startGame();
    registerStatements(...DANIEL_STATEMENTS);
  });

  it('sin partida activa la tercera contradicción no se evalúa', () => {
    useGameStore.getState().startCall('daniel');
    useGameStore.getState().presentEvidence('ev_access_log', 'stmt_daniel_arrival');
    useGameStore.getState().presentEvidence('ev_camera', 'stmt_daniel_office');
    useGameStore.setState({ phase: 'title' });

    useGameStore.getState().presentEvidence('ev_receipt', 'stmt_daniel_substance');

    const state = useGameStore.getState();
    expect(state.phase).toBe('title');
    expect(state.discoveredContradictions.size).toBe(2);
    expect(state.score).toBe(300);
  });

  it('sin llamada activa las tres contradicciones no provocan confesión', () => {
    useGameStore.getState().startCall('daniel');
    useGameStore.getState().presentEvidence('ev_access_log', 'stmt_daniel_arrival');
    useGameStore.getState().presentEvidence('ev_camera', 'stmt_daniel_office');
    useGameStore.getState().endCall();

    useGameStore.getState().presentEvidence('ev_receipt', 'stmt_daniel_substance');

    const state = useGameStore.getState();
    expect(state.phase).toBe('active');
    expect(state.discoveredContradictions.size).toBe(3);
    expect(state.suspectPressure.daniel).toBe(100);
    expect(state.score).toBe(DANIEL_POINTS);
  });

  it('con el temporizador agotado prevalece la derrota por tiempo', () => {
    useGameStore.getState().startCall('daniel');
    useGameStore.getState().presentEvidence('ev_access_log', 'stmt_daniel_arrival');
    useGameStore.getState().presentEvidence('ev_camera', 'stmt_daniel_office');
    useGameStore.setState({ timerEndTimestamp: Date.now() - 1 });

    useGameStore.getState().presentEvidence('ev_receipt', 'stmt_daniel_substance');

    const state = useGameStore.getState();
    expect(state.phase).toBe('defeat_time');
    expect(state.discoveredContradictions.size).toBe(2);
    // Derrota: puntuación base sin bonus ni tiempo restante.
    expect(state.score).toBe(300);
  });

  it('en llamada con otro sospechoso no hay confesión', () => {
    useGameStore.getState().startCall('elena');

    discoverDanielMandatory();

    const state = useGameStore.getState();
    expect(state.phase).toBe('active');
    expect(state.activeCallSuspect).toBe('elena');
    expect(state.suspectPressure.daniel).toBe(100);
    expect(state.suspectPressure.elena).toBe(0);
    expect(state.score).toBe(DANIEL_POINTS);
  });

  it('sin alcanzar el umbral de presión no hay confesión', () => {
    useGameStore.getState().startCall('daniel');
    useGameStore.getState().presentEvidence('ev_access_log', 'stmt_daniel_arrival');
    useGameStore.getState().presentEvidence('ev_camera', 'stmt_daniel_office');
    useGameStore.setState({
      suspectPressure: { ...useGameStore.getState().suspectPressure, daniel: 0 },
    });

    useGameStore.getState().presentEvidence('ev_receipt', 'stmt_daniel_substance');

    const state = useGameStore.getState();
    expect(state.phase).toBe('active');
    expect(state.suspectPressure.daniel).toBe(40);
    expect(state.suspectPressure.daniel).toBeLessThan(SOLUTION.confessionPressureThreshold);
    expect(state.discoveredContradictions.size).toBe(3);
  });

  it('sin las tres contradicciones obligatorias no hay confesión aunque sobre presión', () => {
    useGameStore.getState().startCall('daniel');
    useGameStore.getState().presentEvidence('ev_access_log', 'stmt_daniel_arrival');
    useGameStore.setState({
      suspectPressure: { ...useGameStore.getState().suspectPressure, daniel: 100 },
    });

    useGameStore.getState().presentEvidence('ev_camera', 'stmt_daniel_office');

    const state = useGameStore.getState();
    expect(state.phase).toBe('active');
    expect(state.suspectPressure.daniel).toBe(130);
    expect(state.discoveredContradictions.size).toBe(2);
  });
});

describe('confesión: no activable desde la UI ni desde Bedrock', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2025-03-17T20:00:00.000Z'));
    useGameStore.getState().startGame();
    registerStatements(...DANIEL_STATEMENTS);
  });

  it('la superficie pública no incluye acciones para confesar ni fabricar resultado', () => {
    const state = useGameStore.getState();
    const actions = Object.entries(state)
      .filter(([, value]) => typeof value === 'function')
      .map(([key]) => key)
      .sort();

    expect(actions).toEqual([
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
    ]);
    for (const forbidden of [
      'triggerConfession',
      'setActiveView',
      'processResponse',
      'registerStatement',
      'setFeedback',
      'setScore',
      'setPressure',
      'finalizeGame',
    ]) {
      expect(actions).not.toContain(forbidden);
    }
  });

  it('ninguna acción pública confiesa con condiciones parciales', async () => {
    useGameStore.getState().startCall('daniel');
    useGameStore.getState().presentEvidence('ev_access_log', 'stmt_daniel_arrival');
    useGameStore.getState().presentEvidence('ev_camera', 'stmt_daniel_office');

    useGameStore.getState().openCaseFile();
    useGameStore.getState().openEvidence();
    useGameStore.getState().openAccusation();
    useGameStore.getState().returnToDesktop();
    useGameStore.getState().clearFeedback();
    useGameStore.getState().startCall('daniel');
    await useGameStore.getState().askQuestion(DANIEL_QUESTION);
    useGameStore.getState().presentEvidence('ev_access_log', 'stmt_daniel_arrival');
    useGameStore.getState().endCall();

    const state = useGameStore.getState();
    expect(state.phase).toBe('active');
    expect(state.score).toBe(300);
    expect(state.suspectPressure.daniel).toBe(60);
    expect(state.discoveredContradictions.size).toBe(2);
  });

  it('una respuesta de Bedrock que dice confesar no cambia fase, score ni presión', async () => {
    enableBedrock();
    const fetchSpy = vi.fn(() =>
      Promise.resolve(
        new Response(
          JSON.stringify({
            text: 'Está bien, lo confieso: yo envenené a Marcos.',
            statementId: 'stmt_daniel_substance',
          }),
          { status: 200, headers: { 'Content-Type': 'application/json' } },
        ),
      ),
    );
    vi.stubGlobal('fetch', fetchSpy);

    useGameStore.getState().startCall('daniel');
    useGameStore.getState().presentEvidence('ev_access_log', 'stmt_daniel_arrival');
    useGameStore.getState().presentEvidence('ev_camera', 'stmt_daniel_office');

    await useGameStore.getState().askQuestion(DANIEL_QUESTION);

    const state = useGameStore.getState();
    expect(fetchSpy).toHaveBeenCalledTimes(1);
    expect(state.phase).toBe('active');
    expect(state.score).toBe(300);
    expect(state.suspectPressure.daniel).toBe(60);
    expect(state.discoveredContradictions.size).toBe(2);
    expect(state.callHistory.daniel.at(-1)?.text).toBe(
      'Está bien, lo confieso: yo envenené a Marcos.',
    );
  });
});

describe('finalizeGame: puntuación final única', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2025-03-17T20:00:00.000Z'));
    useGameStore.getState().startGame();
    registerStatements(...ALL_STATEMENTS);
  });

  it('reemplaza el score acumulado por el cálculo final y no lo acumula', () => {
    // Dos penalizaciones antes de sumar puntos: el score acumulado queda en
    // cero y luego sube a 200, pero el cálculo final recalcula la base.
    useGameStore.getState().presentEvidence('ev_toxicology', 'stmt_daniel_substance');
    useGameStore.getState().presentEvidence('ev_bottle', 'stmt_elena_arrival');
    expect(useGameStore.getState().score).toBe(SCORING_RULES.minimumScore);

    useGameStore.getState().presentEvidence('ev_receipt', 'stmt_daniel_substance');
    expect(useGameStore.getState().score).toBe(200);
    expect(useGameStore.getState().incorrectAttempts).toBe(2);

    useGameStore.getState().triggerTimeDefeat();

    const state = useGameStore.getState();
    expect(state.phase).toBe('defeat_time');
    // 200 de la contradicción menos las dos penalizaciones, sin bonus ni tiempo.
    expect(state.score).toBe(200 - 2 * SCORING_RULES.incorrectCombinationPenalty);
  });

  it('la derrota conserva la base con piso cero y sin bonus de tiempo', () => {
    useGameStore.getState().presentEvidence('ev_access_log', 'stmt_elena_arrival');
    useGameStore.getState().presentEvidence('ev_toxicology', 'stmt_elena_arrival');
    useGameStore.getState().presentEvidence('ev_toxicology', 'stmt_sofia_witness');
    useGameStore.getState().presentEvidence('ev_bottle', 'stmt_sofia_witness');

    useGameStore.getState().triggerTimeDefeat();

    const state = useGameStore.getState();
    expect(state.phase).toBe('defeat_time');
    expect(state.score).toBe(SCORING_RULES.minimumScore);
  });

  it('una segunda finalización no vuelve a calcular ni a sumar bonus', () => {
    useGameStore.getState().presentEvidence('ev_access_log', 'stmt_elena_arrival');
    useGameStore.getState().submitAccusation(CORRECT_ACCUSATION);

    // 100 de contradicción + 300 de bonus + 720 s restantes.
    const expected = 100 + SCORING_RULES.correctAccusationBonus + FULL_SECONDS;
    expect(useGameStore.getState().score).toBe(expected);
    expect(useGameStore.getState().phase).toBe('victory_accusation');

    useGameStore.getState().triggerTimeDefeat();
    useGameStore.getState().submitAccusation({ ...CORRECT_ACCUSATION, suspectId: 'elena' });

    const state = useGameStore.getState();
    expect(state.phase).toBe('victory_accusation');
    expect(state.score).toBe(expected);
  });

  it('el tiempo agotado se cuenta como cero segundos restantes', () => {
    useGameStore.getState().presentEvidence('ev_access_log', 'stmt_elena_arrival');
    vi.advanceTimersByTime(config.timerDurationMs + 5_000);

    useGameStore.getState().triggerTimeDefeat();

    const state = useGameStore.getState();
    expect(state.phase).toBe('defeat_time');
    expect(state.score).toBe(100);
  });
});

describe('feedback de contradicciones: solo lo producen los motores y el store', () => {
  beforeEach(() => {
    useGameStore.getState().startGame();
    registerStatements(...ALL_STATEMENTS);
  });

  it('una declaración no registrada no produce feedback ni cambios', () => {
    registerStatements('stmt_elena_arrival');

    useGameStore.getState().presentEvidence('ev_access_log', 'stmt_daniel_arrival');

    const state = useGameStore.getState();
    expect(state.lastContradictionFeedback).toBeNull();
    expect(state.score).toBe(0);
    expect(state.incorrectAttempts).toBe(0);
    expect(state.discoveredContradictions.size).toBe(0);
  });

  it('el feedback válido reproduce la explicación del catálogo y los demás no llevan texto', () => {
    useGameStore.getState().presentEvidence('ev_access_log', 'stmt_daniel_arrival');
    const valid = useGameStore.getState().lastContradictionFeedback;
    expect(valid?.explanation).toBe(CONTRADICTIONS[0].explanation);

    useGameStore.getState().presentEvidence('ev_access_log', 'stmt_daniel_arrival');
    expect(useGameStore.getState().lastContradictionFeedback?.explanation).toBeUndefined();

    useGameStore.getState().presentEvidence('ev_bottle', 'stmt_daniel_arrival');
    expect(useGameStore.getState().lastContradictionFeedback).toEqual({
      type: 'related_insufficient',
    });

    useGameStore.getState().presentEvidence('ev_toxicology', 'stmt_daniel_arrival');
    expect(useGameStore.getState().lastContradictionFeedback).toEqual({ type: 'incorrect' });
  });

  it('clearFeedback solo puede borrarlo, nunca fabricarlo', () => {
    useGameStore.getState().presentEvidence('ev_access_log', 'stmt_elena_arrival');
    expect(useGameStore.getState().lastContradictionFeedback?.type).toBe('valid');

    useGameStore.getState().clearFeedback();

    const state = useGameStore.getState();
    expect(state.lastContradictionFeedback).toBeNull();
    expect(state.score).toBe(100);
    expect(state.discoveredContradictions.size).toBe(1);
  });
});

describe('presión de sospechosos: solo cambia por contradicciones válidas', () => {
  beforeEach(() => {
    useGameStore.getState().startGame();
    registerStatements(...ALL_STATEMENTS);
  });

  it('preguntar en una llamada no altera la presión ni el score', async () => {
    const suspects: readonly SuspectId[] = SUSPECT_IDS;

    for (const suspectId of suspects) {
      useGameStore.getState().startCall(suspectId);
      await useGameStore.getState().askQuestion(DANIEL_QUESTION);
    }

    const state = useGameStore.getState();
    expect(state.suspectPressure).toEqual({ daniel: 0, elena: 0, roberto: 0, sofia: 0 });
    expect(state.score).toBe(0);
    expect(state.discoveredContradictions.size).toBe(0);
  });
});
