/**
 * Identificadores estables del dominio compartidos entre frontend y backend.
 * Duplicados intencionalmente: el backend es un paquete independiente y no
 * importa código del frontend.
 *
 * Requisitos: 17.1-17.4
 */

/** Los cuatro sospechosos del caso. */
export const SUSPECT_IDS = ['daniel', 'elena', 'roberto', 'sofia'] as const;
export type SuspectId = (typeof SUSPECT_IDS)[number];

/** Las seis declaraciones canónicas. */
export const STATEMENT_IDS = [
  'stmt_daniel_arrival',
  'stmt_daniel_office',
  'stmt_daniel_substance',
  'stmt_elena_arrival',
  'stmt_roberto_knowledge',
  'stmt_sofia_witness',
] as const;
export type StatementId = (typeof STATEMENT_IDS)[number];

/** Las seis contradicciones válidas. */
export const CONTRADICTION_IDS = [
  'contra_daniel_access',
  'contra_daniel_camera',
  'contra_daniel_receipt',
  'contra_elena_arrival',
  'contra_roberto_info',
  'contra_sofia_witness',
] as const;
export type ContradictionId = (typeof CONTRADICTION_IDS)[number];

/** Contexto de la partida incluido en cada solicitud. */
export interface InterrogationGameContext {
  discoveredContradictionIds: ContradictionId[];
  /** Número finito ≥ 0. El backend normaliza valores inválidos con un error 400. */
  suspectPressure: number;
}

/** Cuerpo de la solicitud POST /interrogate. */
export interface InterrogationRequest {
  suspectId: SuspectId;
  /** Texto entre 1 y 300 caracteres. */
  question: string;
  gameContext: InterrogationGameContext;
}

/** Cuerpo de la respuesta 200. */
export interface InterrogationResponse {
  /** Texto no vacío de hasta 500 caracteres. */
  text: string;
  /** Declaración canónica del sospechoso o null. */
  statementId: StatementId | null;
}

export function isSuspectId(value: unknown): value is SuspectId {
  return typeof value === 'string' && (SUSPECT_IDS as readonly string[]).includes(value);
}

export function isStatementId(value: unknown): value is StatementId {
  return typeof value === 'string' && (STATEMENT_IDS as readonly string[]).includes(value);
}

export function isContradictionId(value: unknown): value is ContradictionId {
  return typeof value === 'string' && (CONTRADICTION_IDS as readonly string[]).includes(value);
}
