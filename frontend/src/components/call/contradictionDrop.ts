/**
 * Traducción de un drop de `@dnd-kit/core` a la pareja de identificadores
 * congelados que la UI entrega a `presentEvidence`.
 *
 * Vive fuera del componente para poder probarse sin montar la llamada. No
 * evalúa nada: el resultado, la presión, la puntuación y la confesión son
 * decisión exclusiva del store.
 *
 * Requisitos: 8.1-8.2, 8.10
 */

import type { UniqueIdentifier } from '@dnd-kit/core';
import { STATEMENTS } from '@/data/statements';
import type { EvidenceId, EvidenceView, StatementDef, StatementId } from '@/data/types';

const STATEMENT_LIST: readonly StatementDef[] = Object.values(STATEMENTS);

export interface ContradictionDrop {
  evidenceId: EvidenceId;
  statementId: StatementId;
}

/**
 * Devuelve `null` cuando la evidencia se suelta fuera de una declaración o
 * cuando alguno de los identificadores no pertenece a los datos narrativos: en
 * ambos casos la acción se cancela sin evaluar ninguna combinación.
 */
export function resolveDrop(
  activeId: UniqueIdentifier,
  overId: UniqueIdentifier | undefined,
  evidence: readonly EvidenceView[],
): ContradictionDrop | null {
  const droppedEvidence = evidence.find((item) => item.id === activeId);
  const targetStatement = STATEMENT_LIST.find((statement) => statement.id === overId);
  if (droppedEvidence === undefined || targetStatement === undefined) {
    return null;
  }

  return { evidenceId: droppedEvidence.id, statementId: targetStatement.id };
}
