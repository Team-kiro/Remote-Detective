/**
 * Motor determinista de contradicciones.
 *
 * Función pura: evalúa la combinación evidencia/declaración exclusivamente
 * contra los datos locales congelados. No importa React, Zustand ni Bedrock,
 * no muta sus argumentos y no aplica cambios de estado: solo clasifica el
 * resultado para que el store decida puntos, presión y penalización.
 *
 * Requisitos: 8.2-8.9, 11.1-11.3, 11.6, 14.3, 15.1
 */

import { CONTRADICTIONS } from '@/data/contradictions';
import { EVIDENCE } from '@/data/evidence';
import { STATEMENTS } from '@/data/statements';
import type {
  Contradiction,
  ContradictionId,
  ContradictionResult,
  EvidenceDef,
  EvidenceId,
  StatementDef,
  StatementId,
} from '@/data/types';

/** Catálogos locales usados para clasificar combinaciones sin contradicción. */
export interface ContradictionEngineData {
  evidence: readonly EvidenceDef[];
  statements: readonly StatementDef[];
}

const STATEMENT_LIST: readonly StatementDef[] = Object.values(STATEMENTS);

const DEFAULT_ENGINE_DATA: ContradictionEngineData = {
  evidence: EVIDENCE,
  statements: STATEMENT_LIST,
};

function findContradiction(
  evidenceId: EvidenceId,
  statementId: StatementId,
  contradictions: readonly Contradiction[],
): Contradiction | undefined {
  return contradictions.find(
    (candidate) =>
      candidate.evidenceId === evidenceId && candidate.statementId === statementId,
  );
}

/**
 * Una evidencia es "relacionada pero insuficiente" cuando es relevante para el
 * sospechoso que hizo la declaración, pero no demuestra ninguna contradicción
 * sobre ella. Este resultado nunca aplica penalización.
 */
function isRelatedButInsufficient(
  evidenceId: EvidenceId,
  statementId: StatementId,
  data: ContradictionEngineData,
): boolean {
  const statement = data.statements.find((candidate) => candidate.id === statementId);
  if (statement === undefined) {
    return false;
  }

  const evidence = data.evidence.find((candidate) => candidate.id === evidenceId);
  if (evidence === undefined) {
    return false;
  }

  return evidence._internal.relatedSuspects.includes(statement.suspectId);
}

/**
 * Clasifica la combinación de una evidencia con una declaración canónica.
 *
 * - `valid`: contradicción del catálogo aún no descubierta (otorga puntos y presión).
 * - `already_discovered`: misma contradicción repetida (no otorga puntos ni presión).
 * - `related_insufficient`: evidencia relevante para el sospechoso, sin penalización.
 * - `incorrect`: combinación sin relación, sujeta a la penalización única.
 */
export function evaluateContradiction(
  evidenceId: EvidenceId,
  statementId: StatementId,
  discoveredContradictions: ReadonlySet<ContradictionId>,
  contradictions: readonly Contradiction[] = CONTRADICTIONS,
  data: ContradictionEngineData = DEFAULT_ENGINE_DATA,
): ContradictionResult {
  const contradiction = findContradiction(evidenceId, statementId, contradictions);

  if (contradiction !== undefined) {
    if (discoveredContradictions.has(contradiction.id)) {
      return { type: 'already_discovered' };
    }
    return { type: 'valid', contradiction };
  }

  if (isRelatedButInsufficient(evidenceId, statementId, data)) {
    return { type: 'related_insufficient' };
  }

  return { type: 'incorrect' };
}
