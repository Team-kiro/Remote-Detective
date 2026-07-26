/**
 * Motor de acusación final: evalúa la acusación confirmada contra la solución
 * narrativa. Módulo puro, sin imports de React, Zustand ni Bedrock.
 *
 * Requisitos: 12.7-12.9, 14.3, 15.3
 */

import { SCORING_RULES } from '@/data/scoringRules';
import type {
  AccusationInput,
  AccusationResult,
  NarrativeSolution,
  ScoringRules,
} from '@/data/types';

/**
 * Devuelve `'victory'` solo si la acusación coincide en culpable, motivo y
 * método, y las evidencias seleccionadas contienen todas las evidencias
 * requeridas. Se admiten evidencias extra y duplicadas sin relajar las
 * requeridas; cualquier otro caso es `'defeat'`.
 */
export function evaluateAccusation(
  accusation: AccusationInput,
  solution: NarrativeSolution,
): AccusationResult {
  if (accusation.suspectId !== solution.culpritId) {
    return 'defeat';
  }

  if (accusation.motiveId !== solution.motiveId) {
    return 'defeat';
  }

  if (accusation.methodId !== solution.methodId) {
    return 'defeat';
  }

  const selectedEvidence = new Set(accusation.evidenceIds);
  const hasAllRequiredEvidence = solution.requiredEvidenceIds.every((evidenceId) =>
    selectedEvidence.has(evidenceId),
  );

  return hasAllRequiredEvidence ? 'victory' : 'defeat';
}

/**
 * Crédito parcial de una acusación derrotada: los puntos se otorgan solo si el
 * sospechoso señalado era el culpable real.
 *
 * Es deliberadamente el único indicio que devuelve una derrota. El caso tiene
 * una sola solución, así que revelarla convertiría la partida perdida en un
 * spoiler; una puntuación distinta de cero dice «ibas por buen camino» sin
 * nombrar a nadie.
 *
 * ponytail: pista muda hasta que haya más de un caso; entonces conviene
 * detallar qué eje falló en la pantalla final.
 */
export function partialAccusationPoints(
  accusation: AccusationInput,
  solution: NarrativeSolution,
  rules: ScoringRules = SCORING_RULES,
): number {
  if (evaluateAccusation(accusation, solution) === 'victory') {
    return 0;
  }

  return accusation.suspectId === solution.culpritId ? rules.partialSuspectBonus : 0;
}
