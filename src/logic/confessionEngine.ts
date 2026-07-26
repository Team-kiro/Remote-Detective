/**
 * Motor de confesión: decide de forma local y determinista si el culpable
 * confiesa. Módulo puro, sin imports de React, Zustand ni Bedrock.
 *
 * Requisitos: 9.1-9.6, 14.3, 15.2
 */

import type { ContradictionId, NarrativeSolution, SuspectId } from '@/data/types';

/**
 * Devuelve `true` únicamente si se cumple la conjunción completa:
 * partida activa, llamada activa, temporizador activo, el sospechoso en
 * llamada es el culpable, la presión alcanza el umbral y todas las
 * contradicciones obligatorias están descubiertas.
 *
 * Ninguna condición parcial activa la confesión y la decisión no depende de
 * la UI ni de Bedrock.
 */
export function shouldTriggerConfession(
  calledSuspectId: SuspectId,
  isCallActive: boolean,
  isGameActive: boolean,
  isTimerActive: boolean,
  currentPressure: number,
  discoveredContradictions: ReadonlySet<ContradictionId>,
  solution: NarrativeSolution,
): boolean {
  if (!isGameActive || !isCallActive || !isTimerActive) {
    return false;
  }

  if (calledSuspectId !== solution.culpritId) {
    return false;
  }

  if (!Number.isFinite(currentPressure)) {
    return false;
  }

  if (currentPressure < solution.confessionPressureThreshold) {
    return false;
  }

  return solution.mandatoryContradictionIds.every((contradictionId) =>
    discoveredContradictions.has(contradictionId),
  );
}
