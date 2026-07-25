/**
 * Grupo de pruebas (b) — puntuación determinista.
 *
 * Cubre la puntuación base, la penalización única por combinación incorrecta
 * con piso cero (puntos mayores, iguales y menores que la penalización), la
 * conversión de milisegundos a segundos, el tiempo negativo tratado como cero,
 * el bonus único por tipo de victoria y la idempotencia del cálculo final.
 *
 * Requisitos: 11.1-11.5, 15.1
 */

import { describe, expect, it } from 'vitest';
import { CONTRADICTIONS } from '@/data/contradictions';
import { SCORING_RULES } from '@/data/scoringRules';
import {
  calculateBaseScore,
  calculateFinalScore,
  remainingSecondsFromMs,
} from '@/logic/scoringEngine';
import type { ContradictionId } from '@/data/types';

const DANIEL_MANDATORY = new Set<ContradictionId>([
  'contra_daniel_access',
  'contra_daniel_camera',
  'contra_daniel_receipt',
]);

// 150 + 150 + 200
const DANIEL_POINTS = 500;

const ALL_CONTRADICTIONS = new Set<ContradictionId>(CONTRADICTIONS.map((c) => c.id));

// 150 + 150 + 200 + 100 + 100 + 100
const ALL_POINTS = 800;

describe('calculateBaseScore', () => {
  it('suma exactamente los puntos de catálogo de cada contradicción descubierta', () => {
    for (const contradiction of CONTRADICTIONS) {
      const single = new Set<ContradictionId>([contradiction.id]);

      expect(calculateBaseScore(single, CONTRADICTIONS, 0)).toBe(contradiction.points);
    }

    expect(calculateBaseScore(ALL_CONTRADICTIONS, CONTRADICTIONS, 0)).toBe(ALL_POINTS);
    expect(calculateBaseScore(new Set<ContradictionId>(), CONTRADICTIONS, 0)).toBe(0);
  });

  it('resta una sola penalización por cada combinación incorrecta', () => {
    expect(calculateBaseScore(DANIEL_MANDATORY, CONTRADICTIONS, 1)).toBe(
      DANIEL_POINTS - SCORING_RULES.incorrectCombinationPenalty,
    );
    expect(calculateBaseScore(DANIEL_MANDATORY, CONTRADICTIONS, 2)).toBe(
      DANIEL_POINTS - 2 * SCORING_RULES.incorrectCombinationPenalty,
    );
    expect(calculateBaseScore(DANIEL_MANDATORY, CONTRADICTIONS, 3)).toBe(
      DANIEL_POINTS - 3 * SCORING_RULES.incorrectCombinationPenalty,
    );
  });

  it('mantiene el piso cero con puntos mayores, iguales y menores que las penalizaciones', () => {
    const elena = new Set<ContradictionId>(['contra_elena_arrival']);

    // 100 > 50: la penalización se aplica completa.
    expect(calculateBaseScore(elena, CONTRADICTIONS, 1)).toBe(50);
    // 100 === 100: el resultado queda exactamente en cero.
    expect(calculateBaseScore(elena, CONTRADICTIONS, 2)).toBe(0);
    // 100 < 150: el exceso no produce puntuación negativa.
    expect(calculateBaseScore(elena, CONTRADICTIONS, 3)).toBe(SCORING_RULES.minimumScore);
    expect(calculateBaseScore(elena, CONTRADICTIONS, 50)).toBe(SCORING_RULES.minimumScore);
    expect(calculateBaseScore(new Set<ContradictionId>(), CONTRADICTIONS, 1)).toBe(
      SCORING_RULES.minimumScore,
    );
  });

  it('ignora recuentos de intentos no válidos en lugar de sumar puntos', () => {
    expect(calculateBaseScore(DANIEL_MANDATORY, CONTRADICTIONS, -3)).toBe(DANIEL_POINTS);
    expect(calculateBaseScore(DANIEL_MANDATORY, CONTRADICTIONS, Number.NaN)).toBe(DANIEL_POINTS);
    expect(calculateBaseScore(DANIEL_MANDATORY, CONTRADICTIONS, 1.9)).toBe(
      DANIEL_POINTS - SCORING_RULES.incorrectCombinationPenalty,
    );
  });
});

describe('remainingSecondsFromMs', () => {
  it('convierte milisegundos a segundos truncando la fracción', () => {
    expect(remainingSecondsFromMs(0)).toBe(0);
    expect(remainingSecondsFromMs(999)).toBe(0);
    expect(remainingSecondsFromMs(1_000)).toBe(1);
    expect(remainingSecondsFromMs(1_999)).toBe(1);
    expect(remainingSecondsFromMs(125_600)).toBe(125);
    expect(remainingSecondsFromMs(720_000)).toBe(720);
  });

  it('trata el tiempo negativo o no finito como cero', () => {
    expect(remainingSecondsFromMs(-1)).toBe(0);
    expect(remainingSecondsFromMs(-30_000)).toBe(0);
    expect(remainingSecondsFromMs(Number.NaN)).toBe(0);
    expect(remainingSecondsFromMs(Number.POSITIVE_INFINITY)).toBe(0);
  });
});

describe('calculateFinalScore', () => {
  it('suma bonus de confesión y segundos restantes una sola vez', () => {
    const score = calculateFinalScore({
      discoveredContradictions: DANIEL_MANDATORY,
      contradictionsData: CONTRADICTIONS,
      incorrectAttempts: 1,
      victoryType: 'confession',
      timeRemainingMs: 125_600,
    });

    expect(score).toBe(
      DANIEL_POINTS -
        SCORING_RULES.incorrectCombinationPenalty +
        SCORING_RULES.confessionBonus +
        125 * SCORING_RULES.timeRemainingFactor,
    );
  });

  it('usa el bonus de acusación correcta y trata el tiempo negativo como cero', () => {
    const score = calculateFinalScore({
      discoveredContradictions: DANIEL_MANDATORY,
      contradictionsData: CONTRADICTIONS,
      incorrectAttempts: 0,
      victoryType: 'accusation',
      timeRemainingMs: -5_000,
    });

    expect(score).toBe(DANIEL_POINTS + SCORING_RULES.correctAccusationBonus);
  });

  it('aplica un único bonus por victoria aunque se descubran las seis contradicciones', () => {
    const score = calculateFinalScore({
      discoveredContradictions: ALL_CONTRADICTIONS,
      contradictionsData: CONTRADICTIONS,
      incorrectAttempts: 0,
      victoryType: 'confession',
      timeRemainingMs: 60_000,
    });

    expect(score).toBe(ALL_POINTS + SCORING_RULES.confessionBonus + 60);
  });

  it('incluye la última contradicción descubierta en la puntuación final', () => {
    const withTwo = calculateFinalScore({
      discoveredContradictions: new Set<ContradictionId>([
        'contra_daniel_access',
        'contra_daniel_camera',
      ]),
      contradictionsData: CONTRADICTIONS,
      incorrectAttempts: 0,
      victoryType: 'confession',
      timeRemainingMs: 0,
    });
    const withThree = calculateFinalScore({
      discoveredContradictions: DANIEL_MANDATORY,
      contradictionsData: CONTRADICTIONS,
      incorrectAttempts: 0,
      victoryType: 'confession',
      timeRemainingMs: 0,
    });

    expect(withThree - withTwo).toBe(200);
  });

  it('no otorga bonus ni tiempo en una derrota y mantiene el piso cero', () => {
    const withPoints = calculateFinalScore({
      discoveredContradictions: DANIEL_MANDATORY,
      contradictionsData: CONTRADICTIONS,
      incorrectAttempts: 1,
      victoryType: null,
      timeRemainingMs: 300_000,
    });
    const floored = calculateFinalScore({
      discoveredContradictions: new Set<ContradictionId>(['contra_sofia_witness']),
      contradictionsData: CONTRADICTIONS,
      incorrectAttempts: 4,
      victoryType: null,
      timeRemainingMs: 60_000,
    });

    expect(withPoints).toBe(DANIEL_POINTS - SCORING_RULES.incorrectCombinationPenalty);
    expect(floored).toBe(SCORING_RULES.minimumScore);
  });

  it('es idempotente: repetir el cálculo con el mismo estado no acumula bonus', () => {
    const state = {
      discoveredContradictions: DANIEL_MANDATORY,
      contradictionsData: CONTRADICTIONS,
      incorrectAttempts: 0,
      victoryType: 'confession' as const,
      timeRemainingMs: 30_000,
    };

    const first = calculateFinalScore(state);
    const second = calculateFinalScore(state);
    const third = calculateFinalScore(state);

    expect(second).toBe(first);
    expect(third).toBe(first);
    expect(first).toBe(DANIEL_POINTS + SCORING_RULES.confessionBonus + 30);
  });
});
