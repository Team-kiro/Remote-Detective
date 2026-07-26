import type { ScoringRules } from '@/data/types';

/** Reglas numéricas deterministas aprobadas para la puntuación del MVP. */
export const SCORING_RULES = {
  incorrectCombinationPenalty: 50,
  confessionBonus: 500,
  correctAccusationBonus: 300,
  timeRemainingFactor: 1,
  minimumScore: 0,
} as const satisfies ScoringRules;
