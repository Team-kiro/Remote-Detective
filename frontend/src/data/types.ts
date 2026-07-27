/**
 * Tipos e identificadores estables del dominio de Remote Detective.
 *
 * Módulo puro de datos: no importa React, Zustand, servicios ni componentes.
 * Está organizado en secciones para mantener separados los tipos narrativos,
 * los tipos de estado/store y los modelos de presentación de la UI.
 *
 * Requisitos: 1.1-1.5, 8.6-8.9, 13.1-13.2, 14.1-14.3
 */

// ============================================================================
// 1. Identificadores estables del caso congelado
// ============================================================================

/** Los cuatro sospechosos del caso, en orden de presentación. */
export const SUSPECT_IDS = ['daniel', 'elena', 'roberto', 'sofia'] as const;
export type SuspectId = (typeof SUSPECT_IDS)[number];

/** Las seis evidencias, disponibles desde el inicio de la partida. */
export const EVIDENCE_IDS = [
  'ev_access_log',
  'ev_toxicology',
  'ev_bottle',
  'ev_email',
  'ev_camera',
  'ev_receipt',
] as const;
export type EvidenceId = (typeof EVIDENCE_IDS)[number];

/** Las seis declaraciones canónicas: únicos destinos válidos de una evidencia. */
export const STATEMENT_IDS = [
  'stmt_daniel_arrival',
  'stmt_daniel_office',
  'stmt_daniel_substance',
  'stmt_elena_arrival',
  'stmt_roberto_knowledge',
  'stmt_sofia_witness',
] as const;
export type StatementId = (typeof STATEMENT_IDS)[number];

/** Las seis contradicciones válidas: tres de Daniel y una por cada otro sospechoso. */
export const CONTRADICTION_IDS = [
  'contra_daniel_access',
  'contra_daniel_camera',
  'contra_daniel_receipt',
  'contra_elena_arrival',
  'contra_roberto_info',
  'contra_sofia_witness',
] as const;
export type ContradictionId = (typeof CONTRADICTION_IDS)[number];

/** Opciones de motivo disponibles en la acusación final. */
export const MOTIVE_IDS = [
  'motive_silence',
  'motive_greed',
  'motive_revenge',
  'motive_divorce',
] as const;
export type MotiveId = (typeof MOTIVE_IDS)[number];

/** Opciones de método disponibles en la acusación final. */
export const METHOD_IDS = [
  'method_poison',
  'method_assault',
  'method_hired',
  'method_accident',
] as const;
export type MethodId = (typeof METHOD_IDS)[number];

/** Identificador estable de una respuesta local (incluidas las genéricas). */
export type LocalResponseId = string;

function includesId(ids: readonly string[], value: unknown): boolean {
  return typeof value === 'string' && ids.includes(value);
}

export function isSuspectId(value: unknown): value is SuspectId {
  return includesId(SUSPECT_IDS, value);
}

export function isEvidenceId(value: unknown): value is EvidenceId {
  return includesId(EVIDENCE_IDS, value);
}

export function isStatementId(value: unknown): value is StatementId {
  return includesId(STATEMENT_IDS, value);
}

export function isContradictionId(value: unknown): value is ContradictionId {
  return includesId(CONTRADICTION_IDS, value);
}

export function isMotiveId(value: unknown): value is MotiveId {
  return includesId(MOTIVE_IDS, value);
}

export function isMethodId(value: unknown): value is MethodId {
  return includesId(METHOD_IDS, value);
}

// ============================================================================
// 2. Modelos narrativos
// ============================================================================

/** Metadatos internos de un sospechoso. Nunca se exponen a la UI. */
export interface SuspectInternalMetadata {
  /** Hechos verdaderos del sospechoso. */
  truths: readonly string[];
  /** Mentiras verificables mediante evidencias. Al menos una por sospechoso. */
  lies: readonly string[];
  /** Secretos secundarios que no lo incriminan del asesinato. */
  secrets: readonly string[];
  /** Información que el sospechoso conoce y puede mencionar. */
  knows: readonly string[];
  /** Información que el sospechoso desconoce y no puede mencionar. */
  doesNotKnow: readonly string[];
}

export interface SuspectDef {
  id: SuspectId;
  name: string;
  age: number;
  /** Cargo en la consultora. */
  role: string;
  /** Ruta del retrato o `null` para usar un placeholder. */
  portrait: string | null;
  /** Descripción visible en el expediente. */
  description: string;
  relationship: string;
  personality: string;
  alibi: string;
  apparentMotive: string;
  /** Presión inicial de todo sospechoso al comenzar la partida. */
  initialPressure: 0;
  _internal: SuspectInternalMetadata;
}

export type EvidenceCategory = 'physical' | 'document' | 'digital';

/** Metadatos internos de una evidencia. Nunca se exponen a la UI. */
export interface EvidenceInternalMetadata {
  /** Relevancia narrativa de la evidencia. */
  relevance: string;
  /** Sospechosos con los que la evidencia se relaciona internamente. */
  relatedSuspects: readonly SuspectId[];
}

export interface EvidenceDef {
  id: EvidenceId;
  name: string;
  category: EvidenceCategory;
  description: string;
  /** Información que el jugador puede leer directamente. */
  observableInfo: string;
  /** Ruta de la imagen o `null` para usar un placeholder. */
  image: string | null;
  _internal: EvidenceInternalMetadata;
}

export interface StatementDef {
  id: StatementId;
  suspectId: SuspectId;
  /** Texto mostrado siempre en las tarjetas de declaración registradas. */
  canonicalText: string;
}

export interface Contradiction {
  id: ContradictionId;
  suspectId: SuspectId;
  evidenceId: EvidenceId;
  statementId: StatementId;
  explanation: string;
  pressureIncrease: number;
  points: number;
  /** El MVP no implementa desbloqueo progresivo de declaraciones. */
  unlocksStatement: null;
}

export interface CaseTimelineEntry {
  /** Hora en formato `HH:MM`. */
  time: string;
  event: string;
}

/** Metadatos internos del caso. Nunca se exponen a la UI. */
export interface CaseInternalMetadata {
  culpritId: SuspectId;
  realMotive: string;
}

export interface CaseFileDef {
  title: string;
  victimName: string;
  victimAge: number;
  victimRole: string;
  crimeScene: string;
  approximateTime: string;
  causeOfDeath: string;
  method: string;
  timeline: readonly CaseTimelineEntry[];
  _internal: CaseInternalMetadata;
}

export interface NarrativeSolution {
  culpritId: SuspectId;
  motiveId: MotiveId;
  methodId: MethodId;
  /** Evidencias que la acusación debe incluir obligatoriamente. */
  requiredEvidenceIds: readonly EvidenceId[];
  /** Presión mínima del culpable para que la confesión sea posible. */
  confessionPressureThreshold: number;
  /** Contradicciones obligatorias para la confesión. */
  mandatoryContradictionIds: readonly ContradictionId[];
}

export interface MotiveOptionDef {
  id: MotiveId;
  text: string;
}

export interface MethodOptionDef {
  id: MethodId;
  text: string;
}

export interface LocalResponseDef {
  id: LocalResponseId;
  suspectId: SuspectId;
  /** Intención cubierta por la respuesta, solo para documentación interna. */
  intent: string;
  /**
   * Pregunta sugerida que la UI ofrece como atajo. Presente solo en los temas
   * que se proponen al jugador; el motor la resuelve como cualquier otra
   * entrada de texto, sin trato especial.
   */
  prompt?: string;
  /**
   * Grupos de palabras clave normalizadas. Todos los términos de un grupo
   * deben coincidir; basta un grupo para seleccionar la respuesta.
   */
  keywordGroups: readonly (readonly string[])[];
  text: string;
  /** Declaración canónica que registra la respuesta, si aplica. */
  statementId: StatementId | null;
  priority: number;
  /** Exactamente una respuesta genérica estable por sospechoso. */
  isGeneric: boolean;
}

export interface ScoringRules {
  incorrectCombinationPenalty: number;
  confessionBonus: number;
  correctAccusationBonus: number;
  /**
   * Crédito parcial cuando la acusación falla pero señala al culpable correcto.
   * Es la única pista que recibe el jugador derrotado: el caso no se revela.
   */
  partialSuspectBonus: number;
  timeRemainingFactor: number;
  minimumScore: 0;
}

// ============================================================================
// 3. Estados de juego, acusación, mensajes y resultados
// ============================================================================

export type GamePhase =
  | 'title'
  | 'instructions'
  | 'active'
  | 'victory_accusation'
  | 'victory_confession'
  | 'defeat_time'
  | 'defeat_accusation';

/** Fases terminales con las que `finalizeGame` puede cerrar la partida. */
export type EndGamePhase = Exclude<GamePhase, 'title' | 'instructions' | 'active'>;

/** Paneles navegables dentro de una partida activa. */
export type ActiveView = 'desktop' | 'casefile' | 'evidence' | 'call' | 'accusation';

export type VictoryType = 'accusation' | 'confession';

export interface AccusationInput {
  suspectId: SuspectId;
  motiveId: MotiveId;
  methodId: MethodId;
  /** Al menos una de las seis evidencias; se admiten evidencias extra. */
  evidenceIds: readonly EvidenceId[];
}

export type AccusationResult = 'victory' | 'defeat';

export interface ChatMessage {
  role: 'player' | 'suspect';
  text: string;
  timestamp: number;
  /** Declaración canónica registrada por el mensaje del sospechoso. */
  statementId?: StatementId;
}

/** Presión acumulada de cada sospechoso. */
export type SuspectPressureMap = Record<SuspectId, number>;

/** Historial persistente de mensajes por sospechoso. */
export type CallHistoryMap = Record<SuspectId, ChatMessage[]>;

/**
 * Datos serializables y observables de una partida. Las acciones se mantienen
 * separadas para que persistencia y UI no confundan datos con capacidades.
 */
export interface GameSessionState {
  phase: GamePhase;
  activeView: ActiveView;
  score: number;
  incorrectAttempts: number;
  timerEndTimestamp: number | null;
  discoveredContradictions: Set<ContradictionId>;
  suspectPressure: SuspectPressureMap;
  accusationUsed: boolean;
  activeCallSuspect: SuspectId | null;
  /** Identificador interno de la llamada; nunca lo proporciona la UI. */
  callSessionId: string | null;
  /** Identificador interno de la petición; nunca lo proporciona la UI. */
  currentRequestId: string | null;
  callHistory: CallHistoryMap;
  registeredStatements: Set<StatementId>;
  lastContradictionFeedback: ContradictionFeedbackState | null;
  isInterrogationLoading: boolean;
}

/** Superficie pública mínima del store consumida por la UI. */
export interface GameActions {
  startGame: () => void;
  resetGame: () => void;
  openCaseFile: () => void;
  openEvidence: () => void;
  openAccusation: () => void;
  returnToDesktop: () => void;
  startCall: (suspectId: SuspectId) => void;
  endCall: () => void;
  /** La UI entrega únicamente texto; IDs y mensajes se generan internamente. */
  askQuestion: (question: string) => Promise<void>;
  presentEvidence: (evidenceId: EvidenceId, statementId: StatementId) => void;
  submitAccusation: (accusation: AccusationInput) => void;
  triggerTimeDefeat: () => void;
  clearFeedback: () => void;
}

/** Contrato completo del store, sin dependencia de Zustand ni React. */
export interface GameState extends GameSessionState, GameActions {}

/**
 * Los cuatro resultados posibles de combinar evidencia y declaración.
 * `related_insufficient` describe una evidencia relevante para el sospechoso
 * que no demuestra la contradicción y no aplica penalización.
 */
export type ContradictionOutcome =
  | 'valid'
  | 'already_discovered'
  | 'related_insufficient'
  | 'incorrect';

export type ContradictionResult =
  | { type: 'valid'; contradiction: Contradiction }
  | { type: 'already_discovered' }
  | { type: 'related_insufficient' }
  | { type: 'incorrect' };

/** Feedback de solo lectura para la UI; los cuatro resultados son distinguibles. */
export interface ContradictionFeedbackState {
  type: ContradictionOutcome;
  explanation?: string;
}

// ============================================================================
// 4. Contrato de interrogación (respuestas locales y Bedrock)
// ============================================================================

export interface InterrogationGameContext {
  discoveredContradictionIds: readonly ContradictionId[];
  suspectPressure: number;
}

/** Turno previo de la llamada enviado al backend para dar memoria al modelo. */
export interface InterrogationTurn {
  role: 'player' | 'suspect';
  text: string;
}

export interface InterrogationRequest {
  suspectId: SuspectId;
  /** Pregunta del jugador, entre 1 y 300 caracteres. */
  question: string;
  gameContext: InterrogationGameContext;
  /**
   * Turnos anteriores de la llamada en curso, del más antiguo al más reciente y
   * sin incluir la pregunta actual. Sin esto el modelo trata cada pregunta como
   * aislada y se contradice o repite respuestas ya dadas.
   */
  conversationHistory?: readonly InterrogationTurn[];
}

/** Única forma aceptada de respuesta: texto no vacío de hasta 500 caracteres. */
export interface InterrogationResponse {
  text: string;
  statementId: StatementId | null;
}

// ============================================================================
// 5. Modelos de presentación (UI)
//    Omiten todo metadato interno: relevancia, sospechosos relacionados,
//    contradicción resuelta, culpable y motivo real.
// ============================================================================

export interface SuspectProfileView {
  id: SuspectId;
  name: string;
  age: number;
  role: string;
  portrait: string | null;
  description: string;
  relationship: string;
  apparentMotive: string;
}

export interface EvidenceView {
  id: EvidenceId;
  name: string;
  category: EvidenceCategory;
  description: string;
  observableInfo: string;
  image: string | null;
}

export interface CaseFileView {
  victimName: string;
  victimAge: number;
  victimRole: string;
  crimeScene: string;
  approximateTime: string;
  causeOfDeath: string;
  suspects: readonly SuspectProfileView[];
}

export interface StatementCardView {
  id: StatementId;
  suspectId: SuspectId;
  suspectName: string;
  canonicalText: string;
}
