/**
 * Motor determinista de puntuación.
 *
 * Función pura: calcula la puntuación final una sola vez a partir de las
 * contradicciones descubiertas, los intentos incorrectos, el tipo de victoria y
 * el tiempo restante. No importa React, Zustand ni Bedrock y no muta el estado
 * recibido; el store es el único responsable de invocarla una única vez.
 *
 * Requisitos: 11.1-11.6, 14.3, 15.1
 */

import { SCORING_RULES } from '@/data/scoringRules';
import type {
  Contradiction,
  ContradictionId,
  ScoringRules,
  VictoryType,
} from '@/data/types';

/** Entrada de solo lectura para el cálculo final de puntuación. */
export interface FinalScoreInput {
  discoveredContradictions: ReadonlySet<ContradictionId>;
  contradictionsData: readonly Contradiction[];
  incorrectAttempts: number;
  victoryType: VictoryType | null;
  timeRemainingMs: number;
  /** Crédito parcial ya calculado por el motor de acusación; cero por defecto. */
  partialCredit?: number;
  rules?: ScoringRules;
}

function safeCount(value: number): number {
  if (!Number.isFinite(value) || value <= 0) {
    return 0;
  }
  return Math.floor(value);
}

/**
 * Puntos acumulados por las contradicciones descubiertas. Cada contradicción se
 * cuenta una sola vez porque el conjunto de descubiertas no admite duplicados.
 */
function discoveredPoints(
  discovered: ReadonlySet<ContradictionId>,
  contradictionsData: readonly Contradiction[],
): number {
  return contradictionsData.reduce(
    (total, contradiction) =>
      discovered.has(contradiction.id) ? total + contradiction.points : total,
    0,
  );
}

/** Bonus único por el tipo de victoria; una derrota no otorga bonus. */
function victoryBonus(victoryType: VictoryType | null, rules: ScoringRules): number {
  if (victoryType === 'confession') {
    return rules.confessionBonus;
  }
  if (victoryType === 'accusation') {
    return rules.correctAccusationBonus;
  }
  return 0;
}

/**
 * Puntuación base: puntos descubiertos menos la penalización por cada
 * combinación incorrecta, con piso en `rules.minimumScore` (cero).
 */
export function calculateBaseScore(
  discovered: ReadonlySet<ContradictionId>,
  contradictionsData: readonly Contradiction[],
  incorrectAttempts: number,
  rules: ScoringRules = SCORING_RULES,
): number {
  const penalties = safeCount(incorrectAttempts) * rules.incorrectCombinationPenalty;
  const raw = discoveredPoints(discovered, contradictionsData) - penalties;
  return Math.max(rules.minimumScore, raw);
}

/** Segundos restantes derivados de milisegundos; los valores negativos son cero. */
export function remainingSecondsFromMs(timeRemainingMs: number): number {
  return safeCount(timeRemainingMs / 1000);
}

/**
 * Puntuación final: base + crédito parcial + bonus de victoria + segundos
 * restantes por factor.
 *
 * El cálculo es idempotente: la misma entrada produce siempre el mismo valor y
 * no acumula bonus internamente. El tiempo restante solo puntúa en victoria.
 */
export function calculateFinalScore(state: FinalScoreInput): number {
  const rules = state.rules ?? SCORING_RULES;
  const partialCredit = safeCount(state.partialCredit ?? 0);

  const baseScore =
    calculateBaseScore(
      state.discoveredContradictions,
      state.contradictionsData,
      state.incorrectAttempts,
      rules,
    ) + partialCredit;

  if (state.victoryType === null) {
    return Math.max(rules.minimumScore, baseScore);
  }

  const timeBonus = remainingSecondsFromMs(state.timeRemainingMs) * rules.timeRemainingFactor;
  const finalScore = baseScore + victoryBonus(state.victoryType, rules) + timeBonus;

  return Math.max(rules.minimumScore, finalScore);
}
