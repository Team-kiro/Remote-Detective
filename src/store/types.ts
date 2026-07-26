/**
 * Tipos de persistencia del store.
 *
 * Módulo puro: no importa React, Zustand ni servicios. Solo describe la forma
 * serializable de una partida activa y los datos hidratados que el store
 * combina con sus acciones.
 *
 * Requisitos: 14.1, 18.1-18.7
 */

import type {
  ActiveView,
  CallHistoryMap,
  ContradictionId,
  GamePhase,
  StatementId,
  SuspectId,
  SuspectPressureMap,
} from '@/data/types';

/** Versión del formato persistido. Cualquier otra versión se descarta. */
export const PERSISTENCE_VERSION = 1;

/** Clave única usada en `sessionStorage`. */
export const PERSISTENCE_KEY = 'remote-detective:session:v1';

/**
 * Estado serializable de una partida activa.
 *
 * No persiste `callSessionId`, `currentRequestId`, `lastContradictionFeedback`,
 * `isInterrogationLoading` ni ningún `AbortController`: son estados
 * transitorios que se regeneran o se anulan al hidratar.
 */
export interface PersistedGameState {
  version: typeof PERSISTENCE_VERSION;
  phase: GamePhase;
  activeView: ActiveView;
  score: number;
  incorrectAttempts: number;
  /** Marca de fin del temporizador en ms; nunca el tiempo restante literal. */
  timerEndTimestamp: number;
  discoveredContradictions: ContradictionId[];
  suspectPressure: SuspectPressureMap;
  registeredStatements: StatementId[];
  callHistory: CallHistoryMap;
  accusationUsed: boolean;
  activeCallSuspect: SuspectId | null;
}

/**
 * Datos ya validados y coherentes listos para mezclarse con las acciones del
 * store. No incluye identificadores de sesión ni de solicitud: la sesión de
 * llamada se regenera en el store y las solicitudes nunca se reanudan.
 */
export interface HydratedGameData {
  phase: GamePhase;
  activeView: ActiveView;
  score: number;
  incorrectAttempts: number;
  timerEndTimestamp: number;
  discoveredContradictions: Set<ContradictionId>;
  suspectPressure: SuspectPressureMap;
  registeredStatements: Set<StatementId>;
  callHistory: CallHistoryMap;
  accusationUsed: boolean;
  activeCallSuspect: SuspectId | null;
}
