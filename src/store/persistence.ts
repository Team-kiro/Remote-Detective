/**
 * Serialización y validación de la persistencia de sesión.
 *
 * Módulo puro: no importa React, Zustand ni servicios, y no accede a
 * `sessionStorage` (eso corresponde al ciclo de vida del store). Convierte
 * `Set` a array al guardar, array a `Set` al restaurar, valida estrictamente
 * versión, tipos e IDs narrativos contra los catálogos congelados y corrige las
 * combinaciones incoherentes de llamada/vista.
 *
 * Requisitos: 10.3, 13.7, 14.1, 18.1-18.7
 */

import { STATEMENTS } from '@/data/statements';
import {
  SUSPECT_IDS,
  isContradictionId,
  isStatementId,
  isSuspectId,
  type ActiveView,
  type CallHistoryMap,
  type ChatMessage,
  type ContradictionId,
  type GameSessionState,
  type StatementId,
  type SuspectId,
  type SuspectPressureMap,
} from '@/data/types';
import { isTimeExpired } from '@/logic/timerEngine';
import {
  PERSISTENCE_VERSION,
  type HydratedGameData,
  type PersistedGameState,
} from '@/store/types';

export { PERSISTENCE_KEY, PERSISTENCE_VERSION } from '@/store/types';
export type { HydratedGameData, PersistedGameState } from '@/store/types';

/** Longitud máxima aceptada para el texto de un mensaje del historial. */
const MAX_MESSAGE_LENGTH = 500;

/** Claves exactas que debe tener un estado persistido válido. */
const PERSISTED_KEYS = [
  'version',
  'phase',
  'activeView',
  'score',
  'incorrectAttempts',
  'timerEndTimestamp',
  'discoveredContradictions',
  'suspectPressure',
  'registeredStatements',
  'callHistory',
  'accusationUsed',
  'activeCallSuspect',
] as const satisfies readonly (keyof PersistedGameState)[];

/** Claves exactas que puede tener un mensaje del historial. */
const MESSAGE_KEYS = ['role', 'text', 'timestamp', 'statementId'] as const;

/** Mapa exhaustivo de vistas navegables, usado como validador de IDs de vista. */
const ACTIVE_VIEWS: Record<ActiveView, true> = {
  desktop: true,
  casefile: true,
  evidence: true,
  call: true,
  accusation: true,
};

function isUnknownArray(value: unknown): value is readonly unknown[] {
  return Array.isArray(value);
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !isUnknownArray(value);
}

function isActiveView(value: unknown): value is ActiveView {
  return typeof value === 'string' && Object.hasOwn(ACTIVE_VIEWS, value);
}

function isNonNegativeInteger(value: unknown): value is number {
  return typeof value === 'number' && Number.isInteger(value) && value >= 0;
}

function isNonNegativeFinite(value: unknown): value is number {
  return typeof value === 'number' && Number.isFinite(value) && value >= 0;
}

function hasExactKeys(record: Record<string, unknown>, keys: readonly string[]): boolean {
  return (
    Object.keys(record).length === keys.length &&
    keys.every((key) => Object.hasOwn(record, key))
  );
}

/** Valida una lista de IDs narrativos sin repeticiones y la convierte en `Set`. */
function parseIdSet<T extends string>(
  value: unknown,
  isValidId: (candidate: unknown) => candidate is T,
): Set<T> | null {
  if (!isUnknownArray(value)) {
    return null;
  }

  const result = new Set<T>();
  for (const entry of value) {
    if (!isValidId(entry) || result.has(entry)) {
      return null;
    }
    result.add(entry);
  }

  return result;
}

function parsePressureMap(value: unknown): SuspectPressureMap | null {
  if (!isRecord(value) || !hasExactKeys(value, SUSPECT_IDS)) {
    return null;
  }

  const pressure: SuspectPressureMap = { daniel: 0, elena: 0, roberto: 0, sofia: 0 };
  for (const suspectId of SUSPECT_IDS) {
    const raw = value[suspectId];
    if (!isNonNegativeFinite(raw)) {
      return null;
    }
    pressure[suspectId] = raw;
  }

  return pressure;
}

function parseMessage(value: unknown, suspectId: SuspectId): ChatMessage | null {
  if (!isRecord(value)) {
    return null;
  }

  const keys = Object.keys(value);
  const knownKeys: readonly string[] = MESSAGE_KEYS;
  if (keys.some((key) => !knownKeys.includes(key))) {
    return null;
  }

  const { role, text, timestamp } = value;
  if (role !== 'player' && role !== 'suspect') {
    return null;
  }
  if (typeof text !== 'string' || text.length === 0 || text.length > MAX_MESSAGE_LENGTH) {
    return null;
  }
  if (!isNonNegativeFinite(timestamp)) {
    return null;
  }

  if (!Object.hasOwn(value, 'statementId') || value.statementId === undefined) {
    return { role, text, timestamp };
  }

  // Solo un mensaje del sospechoso puede registrar una declaración canónica,
  // y esa declaración debe pertenecer a ese mismo sospechoso.
  const statementId: unknown = value.statementId;
  if (role !== 'suspect' || !isStatementId(statementId)) {
    return null;
  }
  if (STATEMENTS[statementId].suspectId !== suspectId) {
    return null;
  }

  return { role, text, timestamp, statementId };
}

function parseCallHistory(value: unknown): CallHistoryMap | null {
  if (!isRecord(value) || !hasExactKeys(value, SUSPECT_IDS)) {
    return null;
  }

  const history: CallHistoryMap = { daniel: [], elena: [], roberto: [], sofia: [] };
  for (const suspectId of SUSPECT_IDS) {
    const rawMessages = value[suspectId];
    if (!isUnknownArray(rawMessages)) {
      return null;
    }

    const messages: ChatMessage[] = [];
    for (const rawMessage of rawMessages) {
      const message = parseMessage(rawMessage, suspectId);
      if (message === null) {
        return null;
      }
      messages.push(message);
    }
    history[suspectId] = messages;
  }

  return history;
}

function cloneMessage(message: ChatMessage): ChatMessage {
  return message.statementId === undefined
    ? { role: message.role, text: message.text, timestamp: message.timestamp }
    : {
        role: message.role,
        text: message.text,
        timestamp: message.timestamp,
        statementId: message.statementId,
      };
}

function cloneCallHistory(history: CallHistoryMap): CallHistoryMap {
  return {
    daniel: history.daniel.map(cloneMessage),
    elena: history.elena.map(cloneMessage),
    roberto: history.roberto.map(cloneMessage),
    sofia: history.sofia.map(cloneMessage),
  };
}

/**
 * Convierte una partida activa en su forma serializable.
 *
 * Devuelve `null` cuando la partida no debe persistirse: solo tiene sentido
 * guardar partidas con `phase === 'active'` y una marca de temporizador válida.
 * Los `Set` se guardan como arrays y no se incluye ningún dato transitorio.
 */
export function serializeState(state: GameSessionState): PersistedGameState | null {
  if (state.phase !== 'active') {
    return null;
  }

  const timerEndTimestamp = state.timerEndTimestamp;
  if (timerEndTimestamp === null || !Number.isFinite(timerEndTimestamp)) {
    return null;
  }

  return {
    version: PERSISTENCE_VERSION,
    phase: state.phase,
    activeView: state.activeView,
    score: state.score,
    incorrectAttempts: state.incorrectAttempts,
    timerEndTimestamp,
    discoveredContradictions: [...state.discoveredContradictions],
    suspectPressure: { ...state.suspectPressure },
    registeredStatements: [...state.registeredStatements],
    callHistory: cloneCallHistory(state.callHistory),
    accusationUsed: state.accusationUsed,
    activeCallSuspect: state.activeCallSuspect,
  };
}

/**
 * Valida y restaura un estado persistido.
 *
 * Acepta el valor ya parseado o la cadena JSON cruda. Devuelve `null` ante
 * cualquier dato corrupto, incompleto, de versión desconocida o con IDs que no
 * existan en los catálogos congelados, de modo que el store pueda iniciar una
 * partida nueva. Nunca restaura `callSessionId`, `currentRequestId`, feedback,
 * loading ni controladores: la sesión de llamada se regenera en el store.
 */
export function deserializeState(raw: unknown): HydratedGameData | null {
  const parsed = parseRaw(raw);
  if (!isRecord(parsed) || !hasExactKeys(parsed, PERSISTED_KEYS)) {
    return null;
  }

  if (parsed.version !== PERSISTENCE_VERSION) {
    return null;
  }

  // Solo se persisten partidas activas: cualquier otra fase es incoherente.
  if (parsed.phase !== 'active') {
    return null;
  }

  if (!isActiveView(parsed.activeView)) {
    return null;
  }

  if (!isNonNegativeInteger(parsed.score) || !isNonNegativeInteger(parsed.incorrectAttempts)) {
    return null;
  }

  const timerEndTimestamp = parsed.timerEndTimestamp;
  if (!isNonNegativeFinite(timerEndTimestamp)) {
    return null;
  }

  if (typeof parsed.accusationUsed !== 'boolean') {
    return null;
  }

  const discoveredContradictions = parseIdSet<ContradictionId>(
    parsed.discoveredContradictions,
    isContradictionId,
  );
  if (discoveredContradictions === null) {
    return null;
  }

  const registeredStatements = parseIdSet<StatementId>(
    parsed.registeredStatements,
    isStatementId,
  );
  if (registeredStatements === null) {
    return null;
  }

  const suspectPressure = parsePressureMap(parsed.suspectPressure);
  if (suspectPressure === null) {
    return null;
  }

  const callHistory = parseCallHistory(parsed.callHistory);
  if (callHistory === null) {
    return null;
  }

  const rawSuspect = parsed.activeCallSuspect;
  if (rawSuspect !== null && typeof rawSuspect !== 'string') {
    return null;
  }

  const base = {
    score: parsed.score,
    incorrectAttempts: parsed.incorrectAttempts,
    timerEndTimestamp,
    discoveredContradictions,
    suspectPressure,
    registeredStatements,
    callHistory,
    accusationUsed: parsed.accusationUsed,
  };

  // El temporizador expirado prevalece sobre cualquier vista o llamada guardada.
  if (isTimeExpired(timerEndTimestamp)) {
    return {
      ...base,
      phase: 'defeat_time',
      activeView: 'desktop',
      activeCallSuspect: null,
    };
  }

  const { activeView, activeCallSuspect } = reconcileCall(parsed.activeView, rawSuspect);

  return { ...base, phase: 'active', activeView, activeCallSuspect };
}

function parseRaw(raw: unknown): unknown {
  if (typeof raw !== 'string') {
    return raw;
  }

  try {
    const parsed: unknown = JSON.parse(raw);
    return parsed;
  } catch {
    return null;
  }
}

/**
 * Corrige las combinaciones incoherentes de vista y sospechoso en llamada:
 * un sospechoso inexistente o una llamada sin sospechoso vuelven al escritorio,
 * y un sospechoso fuera de la vista de llamada se anula.
 */
function reconcileCall(
  activeView: ActiveView,
  rawSuspect: string | null,
): { activeView: ActiveView; activeCallSuspect: SuspectId | null } {
  if (rawSuspect !== null && !isSuspectId(rawSuspect)) {
    return { activeView: 'desktop', activeCallSuspect: null };
  }

  if (activeView === 'call' && rawSuspect === null) {
    return { activeView: 'desktop', activeCallSuspect: null };
  }

  if (activeView !== 'call' && rawSuspect !== null) {
    return { activeView, activeCallSuspect: null };
  }

  return { activeView, activeCallSuspect: rawSuspect };
}
