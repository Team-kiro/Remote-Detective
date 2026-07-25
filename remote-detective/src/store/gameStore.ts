/**
 * Store único de la partida (Zustand).
 *
 * La superficie pública es exactamente `GameState` (`GameSessionState` +
 * `GameActions`) del diseño aprobado: no existe `setActiveView('call')`,
 * `processResponse`, `registerStatement`, `triggerConfession` ni `finalizeGame`
 * como acción pública.
 *
 * Sobre la navegación, contradicciones, confesión automática, acusación única,
 * derrota por tiempo, finalización con cálculo único de puntuación, reinicio
 * completo (3.2-3.3) y `askQuestion` con fallback local obligatorio (3.4), la
 * tarea 3.5 conecta el ciclo de vida de `sessionStorage`: guardado de la
 * partida activa tras cada acción significativa, hidratación al crear el store
 * y borrado al finalizar o reiniciar.
 *
 * Requisitos: 2.4-2.5, 3.1-3.3, 6.1-6.11, 7.7-7.9, 8.2-8.10, 9.1-9.6,
 * 10.1-10.4, 11.1-11.6, 12.4-12.9, 13.1-13.11, 14.4, 15.1-15.4, 15.6,
 * 16.1-16.6, 18.1-18.7
 */

import { create } from 'zustand';
import { config } from '@/config';
import { CONTRADICTIONS } from '@/data/contradictions';
import { LOCAL_RESPONSES } from '@/data/localResponses';
import { SCORING_RULES } from '@/data/scoringRules';
import { SOLUTION } from '@/data/solution';
import { STATEMENTS } from '@/data/statements';
import { SUSPECTS } from '@/data/suspects';
import { isStatementId } from '@/data/types';
import { evaluateAccusation } from '@/logic/accusationEngine';
import { shouldTriggerConfession } from '@/logic/confessionEngine';
import { evaluateContradiction } from '@/logic/contradictionEngine';
import { getLocalResponse, MAX_QUESTION_LENGTH } from '@/logic/localResponseEngine';
import { calculateFinalScore } from '@/logic/scoringEngine';
import { calculateTimeRemaining, isTimeExpired } from '@/logic/timerEngine';
import { fetchBedrockResponse } from '@/services/bedrockService';
import { PERSISTENCE_KEY, deserializeState, serializeState } from '@/store/persistence';
import type {
  AccusationInput,
  ActiveView,
  CallHistoryMap,
  ChatMessage,
  ContradictionId,
  EndGamePhase,
  EvidenceId,
  GameSessionState,
  GameState,
  InterrogationRequest,
  InterrogationResponse,
  LocalResponseDef,
  StatementId,
  SuspectId,
  SuspectPressureMap,
  VictoryType,
} from '@/data/types';

/** Paneles que la UI puede abrir directamente; `call` exige `startCall`. */
type NavigableView = Exclude<ActiveView, 'call'>;

/** Longitud máxima aceptada en el texto de una respuesta de interrogación. */
const MAX_RESPONSE_TEXT_LENGTH = 500;

/**
 * Solicitud de interrogación en curso.
 *
 * Se mantiene fuera del estado observable porque un `AbortController` no es
 * serializable ni renderizable. `askQuestion` lo registra al lanzar una
 * petición remota; `startCall`, `endCall`, `resetGame` y `finalizeGame` lo
 * cancelan.
 */
let pendingRequestController: AbortController | null = null;

/** Registra el controlador de la solicitud remota recién lanzada. */
function registerPendingRequest(controller: AbortController): void {
  pendingRequestController = controller;
}

/** Cancela la solicitud pendiente, si existe, y olvida su controlador. */
function cancelPendingRequest(): void {
  if (pendingRequestController !== null) {
    pendingRequestController.abort();
    pendingRequestController = null;
  }
}

// ============================================================================
// Acceso degradable a `sessionStorage`
//
// Todo acceso está envuelto: en modo privado, sin almacenamiento disponible o
// al superar la cuota, la partida continúa exactamente igual pero sin
// persistencia. La persistencia nunca es una condición para jugar.
// ============================================================================

/** Lee la sesión guardada; cualquier fallo se trata como ausencia de datos. */
function readPersistedSession(): string | null {
  try {
    return globalThis.sessionStorage.getItem(PERSISTENCE_KEY);
  } catch {
    // `sessionStorage` inexistente o bloqueado: se juega sin persistencia.
    return null;
  }
}

/** Escribe la sesión guardada; un fallo de cuota o acceso se ignora. */
function writePersistedSession(payload: string): void {
  try {
    globalThis.sessionStorage.setItem(PERSISTENCE_KEY, payload);
  } catch {
    // Cuota agotada o almacenamiento bloqueado: la partida sigue sin persistir.
  }
}

/** Elimina la sesión guardada; un fallo de acceso se ignora. */
function clearPersistedSession(): void {
  try {
    globalThis.sessionStorage.removeItem(PERSISTENCE_KEY);
  } catch {
    // Sin almacenamiento disponible no hay nada que borrar.
  }
}

/**
 * Convierte una respuesta local del catálogo en una candidata con la forma
 * exacta del contrato. Un catálogo sin respuesta devuelve `null`, que el type
 * guard defensivo rechaza más adelante.
 */
function toResponseCandidate(response: LocalResponseDef | undefined): unknown {
  if (response === undefined) {
    return null;
  }

  return { text: response.text, statementId: response.statementId };
}

/** Candidata local completa: respaldo obligatorio de toda interrogación. */
function resolveLocalCandidate(suspectId: SuspectId, question: string): unknown {
  try {
    return toResponseCandidate(getLocalResponse(suspectId, question, LOCAL_RESPONSES));
  } catch {
    // Catálogo corrupto: la revalidación defensiva decidirá el respaldo.
    return null;
  }
}

/** Única respuesta genérica del sospechoso, usada como último respaldo. */
function resolveGenericCandidate(suspectId: SuspectId): unknown {
  return toResponseCandidate(
    LOCAL_RESPONSES.find((response) => response.suspectId === suspectId && response.isGeneric),
  );
}

/**
 * Contrato completo de una respuesta de interrogación: objeto con exactamente
 * `text` y `statementId`, texto no vacío de hasta 500 caracteres y declaración
 * nula o existente y perteneciente al sospechoso interrogado.
 *
 * Cualquier incumplimiento descarta la respuesta íntegra, texto incluido.
 */
function isValidInterrogationResponse(
  value: unknown,
  suspectId: SuspectId,
): value is InterrogationResponse {
  if (typeof value !== 'object' || value === null) {
    return false;
  }

  if (Object.keys(value).length !== 2) {
    return false;
  }

  if (!Object.hasOwn(value, 'text') || !Object.hasOwn(value, 'statementId')) {
    return false;
  }

  const candidate = value as { text: unknown; statementId: unknown };
  if (typeof candidate.text !== 'string') {
    return false;
  }

  if (candidate.text.trim().length === 0 || candidate.text.length > MAX_RESPONSE_TEXT_LENGTH) {
    return false;
  }

  if (candidate.statementId === null) {
    return true;
  }

  if (!isStatementId(candidate.statementId)) {
    return false;
  }

  return STATEMENTS[candidate.statementId].suspectId === suspectId;
}

/** Presión inicial de cada sospechoso, tomada de los datos congelados. */
function createInitialPressure(): SuspectPressureMap {
  const pressure: SuspectPressureMap = { daniel: 0, elena: 0, roberto: 0, sofia: 0 };
  for (const suspect of SUSPECTS) {
    pressure[suspect.id] = suspect.initialPressure;
  }

  return pressure;
}

/** Historial vacío por sospechoso; el historial es persistente entre llamadas. */
function createEmptyCallHistory(): CallHistoryMap {
  return { daniel: [], elena: [], roberto: [], sofia: [] };
}

/** Estado observable de una partida sin comenzar. */
export function createInitialGameSessionState(): GameSessionState {
  return {
    phase: 'title',
    activeView: 'desktop',
    score: 0,
    incorrectAttempts: 0,
    timerEndTimestamp: null,
    discoveredContradictions: new Set<ContradictionId>(),
    suspectPressure: createInitialPressure(),
    accusationUsed: false,
    activeCallSuspect: null,
    callSessionId: null,
    currentRequestId: null,
    callHistory: createEmptyCallHistory(),
    registeredStatements: new Set<StatementId>(),
    lastContradictionFeedback: null,
    isInterrogationLoading: false,
  };
}

/** Identificador interno de sesión de llamada; nunca lo aporta la UI. */
function createCallSessionId(): string {
  return crypto.randomUUID();
}

/**
 * Estado observable inicial del store, hidratado desde `sessionStorage`.
 *
 * Se usa al crear el store, de modo que recargar la página restaura la partida
 * activa sin necesidad de ninguna acción pública adicional: la hidratación no
 * forma parte de la superficie de interrogación y no permite inyectar mensajes,
 * declaraciones ni resultados, porque solo acepta datos ya validados por
 * `deserializeState` contra los catálogos congelados.
 *
 * - El tiempo restante se recalcula siempre con el reloj real a partir de
 *   `timerEndTimestamp`; nunca se guarda ni se restaura un tiempo literal.
 * - Un temporizador expirado hidrata `defeat_time` y descarta la sesión.
 * - Una llamada restaurada recibe un `callSessionId` nuevo; nunca se restauran
 *   ni se reanudan solicitudes, loading, feedback ni controladores.
 * - Datos corruptos, incompletos o ausentes producen una partida nueva.
 */
export function createHydratedGameSessionState(): GameSessionState {
  const initial = createInitialGameSessionState();

  const raw = readPersistedSession();
  if (raw === null) {
    return initial;
  }

  const hydrated = deserializeState(raw);
  if (hydrated === null) {
    clearPersistedSession();
    return initial;
  }

  // El temporizador vencido prevalece: se muestra derrota por tiempo y la
  // sesión guardada deja de tener valor.
  if (hydrated.phase !== 'active') {
    clearPersistedSession();
    return { ...initial, ...hydrated, activeCallSuspect: null };
  }

  return {
    ...initial,
    ...hydrated,
    // Una llamada restaurada abre una sesión nueva; la anterior queda inválida.
    callSessionId: hydrated.activeCallSuspect === null ? null : createCallSessionId(),
    currentRequestId: null,
    lastContradictionFeedback: null,
    isInterrogationLoading: false,
  };
}

/** Limpieza compartida al cerrar una llamada y volver al escritorio. */
const CLOSED_CALL_STATE = {
  activeView: 'desktop',
  activeCallSuspect: null,
  callSessionId: null,
  currentRequestId: null,
  isInterrogationLoading: false,
} as const satisfies Partial<GameSessionState>;

/** Tipo de victoria asociado a cada fase terminal; una derrota no otorga bonus. */
function victoryTypeOf(endPhase: EndGamePhase): VictoryType | null {
  if (endPhase === 'victory_confession') {
    return 'confession';
  }
  if (endPhase === 'victory_accusation') {
    return 'accusation';
  }

  return null;
}

export const useGameStore = create<GameState>((set, get) => {
  /**
   * Guarda la partida activa en `sessionStorage`.
   *
   * Solo escribe partidas con `phase === 'active'` y marca de temporizador
   * válida (lo garantiza `serializeState`), nunca el tiempo restante literal, y
   * nunca mientras hay una solicitud de interrogación pendiente: así no se
   * persiste ningún estado parcial. Tampoco se llama en cada tick del
   * temporizador, sino solo tras las acciones significativas.
   */
  const persistSession = (): void => {
    const state = get();
    if (state.isInterrogationLoading || state.currentRequestId !== null) {
      return;
    }

    const snapshot = serializeState(state);
    if (snapshot === null) {
      return;
    }

    writePersistedSession(JSON.stringify(snapshot));
  };

  /** Navegación entre paneles: solo dentro de una partida activa. */
  const navigateTo = (view: NavigableView): void => {
    set((state) => (state.phase === 'active' ? { activeView: view } : state));
    // La vista navegada forma parte del estado persistido.
    persistSession();
  };

  /**
   * Finalización interna de la partida. No es una acción pública: solo la
   * alcanzan `presentEvidence`, `submitAccusation`, `triggerTimeDefeat` y
   * (tarea 3.4) `askQuestion`.
   *
   * Conserva la guarda `phase === 'active'`, por lo que una segunda
   * finalización no altera el resultado ni recalcula la puntuación. El score
   * final se calcula exactamente una vez con `calculateFinalScore` usando el
   * tiempo restante real, y se limpian llamada, sesión, solicitud, feedback y
   * loading.
   */
  const finalizeGame = (endPhase: EndGamePhase): void => {
    const state = get();
    if (state.phase !== 'active') {
      return;
    }

    const endTimestamp = state.timerEndTimestamp;
    const timeRemainingMs = endTimestamp === null ? 0 : calculateTimeRemaining(endTimestamp);
    const finalScore = calculateFinalScore({
      discoveredContradictions: state.discoveredContradictions,
      contradictionsData: CONTRADICTIONS,
      incorrectAttempts: state.incorrectAttempts,
      victoryType: victoryTypeOf(endPhase),
      timeRemainingMs,
      rules: SCORING_RULES,
    });

    set({
      score: finalScore,
      phase: endPhase,
      activeCallSuspect: null,
      callSessionId: null,
      currentRequestId: null,
      lastContradictionFeedback: null,
      isInterrogationLoading: false,
    });

    cancelPendingRequest();

    // Toda finalización elimina la sesión guardada.
    clearPersistedSession();
  };

  return {
    // Al crear el store se restaura la partida activa guardada, si existe. La
    // hidratación no es una acción pública: la UI no puede inyectar mensajes,
    // declaraciones ni resultados a través de ella.
    ...createHydratedGameSessionState(),

    startGame: () => {
      cancelPendingRequest();
      set({
        ...createInitialGameSessionState(),
        phase: 'active',
        activeView: 'desktop',
        timerEndTimestamp: Date.now() + config.timerDurationMs,
      });
      // La partida se guarda ya al iniciarse, con su marca de fin de temporizador.
      persistSession();
    },

    openCaseFile: () => {
      navigateTo('casefile');
    },

    openEvidence: () => {
      navigateTo('evidence');
    },

    // Abrir la acusación no consume el intento único: `accusationUsed` solo
    // cambia cuando `submitAccusation` confirma (tarea 3.3).
    openAccusation: () => {
      navigateTo('accusation');
    },

    // Cancelar la acusación o salir de cualquier panel conserva el estado de la
    // partida. Si había una llamada abierta, regresar equivale a terminarla.
    returnToDesktop: () => {
      const state = get();
      if (state.phase !== 'active') {
        return;
      }

      if (state.activeView === 'call' || state.activeCallSuspect !== null) {
        cancelPendingRequest();
        set(CLOSED_CALL_STATE);
        persistSession();
        return;
      }

      set({ activeView: 'desktop' });
      // Cancelar la acusación persiste la vista sin consumir el intento.
      persistSession();
    },

    startCall: (suspectId: SuspectId) => {
      if (get().phase !== 'active') {
        return;
      }

      // Una llamada nueva invalida cualquier solicitud de la llamada anterior.
      cancelPendingRequest();
      set({
        activeView: 'call',
        activeCallSuspect: suspectId,
        callSessionId: createCallSessionId(),
        currentRequestId: null,
        isInterrogationLoading: false,
      });

      // Si la presión y las contradicciones obligatorias ya se cumplían antes
      // de la llamada, la confesión se activa al establecerse: el store lo
      // decide con los valores ya actualizados, nunca la UI ni Bedrock.
      const opened = get();
      const openedTimestamp = opened.timerEndTimestamp;
      const isTimerActive = openedTimestamp !== null && !isTimeExpired(openedTimestamp);
      if (
        shouldTriggerConfession(
          suspectId,
          true,
          true,
          isTimerActive,
          opened.suspectPressure[suspectId],
          opened.discoveredContradictions,
          SOLUTION,
        )
      ) {
        // `finalizeGame` ya elimina la sesión guardada.
        finalizeGame('victory_confession');
        return;
      }

      // Se guarda el sospechoso en llamada, nunca la sesión de llamada.
      persistSession();
    },

    endCall: () => {
      if (get().phase !== 'active') {
        return;
      }

      cancelPendingRequest();
      set(CLOSED_CALL_STATE);
      persistSession();
    },

    clearFeedback: () => {
      set((state) => (state.lastContradictionFeedback === null ? state : { lastContradictionFeedback: null }));
    },

    /**
     * Flujo atómico de contradicciones. La UI (y `@dnd-kit/core`) solo entrega
     * la pareja de identificadores: el store decide resultado, puntos, presión,
     * penalización, feedback y una posible confesión.
     */
    presentEvidence: (evidenceId: EvidenceId, statementId: StatementId) => {
      const state = get();
      if (state.phase !== 'active') {
        return;
      }

      // Solo las declaraciones canónicas ya registradas son destino válido.
      if (!state.registeredStatements.has(statementId)) {
        return;
      }

      const endTimestamp = state.timerEndTimestamp;
      if (endTimestamp === null || isTimeExpired(endTimestamp)) {
        get().triggerTimeDefeat();
        return;
      }

      const result = evaluateContradiction(
        evidenceId,
        statementId,
        state.discoveredContradictions,
        CONTRADICTIONS,
      );

      if (result.type === 'valid') {
        const contradiction = result.contradiction;
        const nextDiscovered = new Set(state.discoveredContradictions);
        nextDiscovered.add(contradiction.id);
        const nextPressure: SuspectPressureMap = {
          ...state.suspectPressure,
          [contradiction.suspectId]:
            state.suspectPressure[contradiction.suspectId] + contradiction.pressureIncrease,
        };

        // Un único `set` aplica contradicción, presión, puntos y feedback.
        set({
          discoveredContradictions: nextDiscovered,
          suspectPressure: nextPressure,
          score: state.score + contradiction.points,
          lastContradictionFeedback: {
            type: 'valid',
            explanation: contradiction.explanation,
          },
        });

        // La confesión se evalúa con la presión y el conjunto ya actualizados.
        const calledSuspect = state.activeCallSuspect;
        if (calledSuspect !== null) {
          const confesses = shouldTriggerConfession(
            calledSuspect,
            true,
            true,
            !isTimeExpired(endTimestamp),
            nextPressure[calledSuspect],
            nextDiscovered,
            SOLUTION,
          );

          if (confesses) {
            // `finalizeGame` ya elimina la sesión: no se guarda nada más.
            finalizeGame('victory_confession');
            return;
          }
        }

        // Contradicciones, presión y score nuevos se persisten juntos.
        persistSession();
        return;
      }

      // Repetir una contradicción ya descubierta solo informa: no cambia score,
      // presión ni intentos incorrectos.
      if (result.type === 'already_discovered') {
        set({ lastContradictionFeedback: { type: 'already_discovered' } });
        return;
      }

      // Evidencia relevante para el sospechoso que no prueba la contradicción:
      // se informa sin penalización.
      if (result.type === 'related_insufficient') {
        set({ lastContradictionFeedback: { type: 'related_insufficient' } });
        return;
      }

      set({
        score: Math.max(
          SCORING_RULES.minimumScore,
          state.score - SCORING_RULES.incorrectCombinationPenalty,
        ),
        incorrectAttempts: state.incorrectAttempts + 1,
        lastContradictionFeedback: { type: 'incorrect' },
      });
      // El feedback no se persiste, pero sí el score y los intentos incorrectos.
      persistSession();
    },

    /**
     * Acusación única e irreversible. El intento se consume solo al confirmar,
     * y el resultado lo decide el motor local, nunca la UI.
     */
    submitAccusation: (accusation: AccusationInput) => {
      const state = get();
      if (state.phase !== 'active' || state.accusationUsed) {
        return;
      }

      // El temporizador tiene precedencia sobre la acusación en curso.
      const endTimestamp = state.timerEndTimestamp;
      if (endTimestamp === null || isTimeExpired(endTimestamp)) {
        get().triggerTimeDefeat();
        return;
      }

      set({ accusationUsed: true });

      const result = evaluateAccusation(accusation, SOLUTION);
      finalizeGame(result === 'victory' ? 'victory_accusation' : 'defeat_accusation');
    },

    /** Derrota por tiempo agotado desde cualquier vista de la partida activa. */
    triggerTimeDefeat: () => {
      finalizeGame('defeat_time');
    },

    /** Reinicio completo: todo el estado observable vuelve al inicial. */
    resetGame: () => {
      cancelPendingRequest();
      set(createInitialGameSessionState());

      // Reiniciar elimina la sesión guardada.
      clearPersistedSession();
    },

    /**
     * Interrogación con fallback local obligatorio.
     *
     * La UI entrega únicamente el texto de la pregunta: el identificador de
     * solicitud, los mensajes del historial y el registro de declaraciones se
     * generan internamente. Bedrock solo puede aportar texto y un
     * `statementId` ya existente del sospechoso interrogado; cualquier fallo,
     * timeout o respuesta fuera de contrato se descarta íntegramente y la
     * partida continúa con la respuesta local.
     */
    askQuestion: async (question: string): Promise<void> => {
      // 1. Guardas conjuntas previas: no se crea solicitud, loading, pregunta
      // ni historial antes de superarlas todas.
      const initial = get();
      if (initial.phase !== 'active') {
        return;
      }

      const initialTimestamp = initial.timerEndTimestamp;
      if (initialTimestamp === null) {
        finalizeGame('defeat_time');
        return;
      }
      if (isTimeExpired(initialTimestamp)) {
        finalizeGame('defeat_time');
        return;
      }

      if (
        initial.activeView !== 'call' ||
        initial.activeCallSuspect === null ||
        initial.callSessionId === null
      ) {
        return;
      }

      if (question.trim().length < 1 || question.length > MAX_QUESTION_LENGTH) {
        return;
      }

      // 2. Las guardas permiten capturar los valores no nulos de la llamada.
      const suspect: SuspectId = initial.activeCallSuspect;
      const sessionId: string = initial.callSessionId;
      const reqId = crypto.randomUUID();

      // 3. La pregunta se registra una sola vez, antes de esperar la respuesta.
      const playerMessage: ChatMessage = {
        role: 'player',
        text: question,
        timestamp: Date.now(),
      };
      set((state) => ({
        currentRequestId: reqId,
        isInterrogationLoading: true,
        callHistory: {
          ...state.callHistory,
          [suspect]: [...state.callHistory[suspect], playerMessage],
        },
      }));

      // 4. Candidata local completa, obtenida una sola vez.
      const localCandidate = resolveLocalCandidate(suspect, question);

      // 5-6. Bedrock solo en el modo configurado y solo si cumple el contrato
      // completo; error o timeout conservan la candidata local íntegra.
      let remoteOrLocal: unknown = localCandidate;
      if (config.interrogationMode === 'bedrock' && config.apiUrl !== null) {
        const pending = get();
        const request: InterrogationRequest = {
          suspectId: suspect,
          question,
          gameContext: {
            discoveredContradictionIds: [...pending.discoveredContradictions],
            suspectPressure: pending.suspectPressure[suspect],
          },
        };

        try {
          const bedrockResponse = await fetchBedrockResponse(
            request,
            config,
            registerPendingRequest,
          );
          remoteOrLocal = isValidInterrogationResponse(bedrockResponse, suspect)
            ? bedrockResponse
            : localCandidate;
        } catch {
          remoteOrLocal = localCandidate;
        }
      }

      // 7. Orden obligatorio tras el await: el temporizador se comprueba antes
      // que sospechoso, sesión y solicitud.
      const current = get();
      if (current.phase !== 'active') {
        return;
      }

      const currentTimestamp = current.timerEndTimestamp;
      if (currentTimestamp === null) {
        finalizeGame('defeat_time');
        return;
      }
      if (isTimeExpired(currentTimestamp)) {
        finalizeGame('defeat_time');
        return;
      }

      // Con temporizador válido, una respuesta obsoleta se ignora sin tocar el
      // loading de una solicitud más reciente.
      if (current.activeCallSuspect !== suspect) {
        return;
      }
      if (current.callSessionId !== sessionId) {
        return;
      }
      if (current.currentRequestId !== reqId) {
        return;
      }

      // 8. Revalidación defensiva justo antes de tocar historial/declaraciones.
      let acceptedResponse: InterrogationResponse;
      if (isValidInterrogationResponse(remoteOrLocal, suspect)) {
        acceptedResponse = remoteOrLocal;
      } else {
        const genericCandidate = resolveGenericCandidate(suspect);
        if (!isValidInterrogationResponse(genericCandidate, suspect)) {
          // Sin genérica válida: la solicitud vigente solo termina el loading.
          set((state) =>
            state.currentRequestId === reqId
              ? { currentRequestId: null, isInterrogationLoading: false }
              : state,
          );
          return;
        }
        acceptedResponse = genericCandidate;
      }

      // 9. Único commit final atómico sobre el estado más reciente: no repite la
      // pregunta y conserva los mensajes añadidos concurrentemente.
      set((state) => {
        if (state.currentRequestId !== reqId) {
          return state;
        }

        const suspectMessage: ChatMessage = {
          role: 'suspect',
          text: acceptedResponse.text,
          timestamp: Date.now(),
          ...(acceptedResponse.statementId === null
            ? {}
            : { statementId: acceptedResponse.statementId }),
        };
        const nextRegisteredStatements = new Set(state.registeredStatements);
        if (acceptedResponse.statementId !== null) {
          nextRegisteredStatements.add(acceptedResponse.statementId);
        }

        return {
          callHistory: {
            ...state.callHistory,
            [suspect]: [...state.callHistory[suspect], suspectMessage],
          },
          registeredStatements: nextRegisteredStatements,
          currentRequestId: null,
          isInterrogationLoading: false,
        };
      });

      // 10. El mensaje aceptado del sospechoso y la declaración canónica llegan
      // a `sessionStorage` solo después del commit atómico conjunto: se guarda
      // el estado ya consolidado, nunca uno parcial. Si el commit se descartó
      // por dejar de ser vigente, se guarda el estado real vigente, y si otra
      // solicitud sigue pendiente no se escribe nada.
      persistSession();
    },
  };
});
