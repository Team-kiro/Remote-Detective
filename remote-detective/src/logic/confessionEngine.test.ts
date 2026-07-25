/**
 * Grupo de pruebas (b) — conjunción completa de la confesión.
 *
 * Cada condición se varía individualmente sobre una configuración que sí
 * confiesa, de modo que ninguna combinación parcial active la confesión:
 * partida activa, llamada activa, temporizador activo, sospechoso culpable,
 * presión mínima y las tres contradicciones obligatorias.
 *
 * Requisitos: 9.1, 9.3, 9.6, 15.2
 */

import { describe, expect, it } from 'vitest';
import { SOLUTION } from '@/data/solution';
import { SUSPECT_IDS } from '@/data/types';
import { shouldTriggerConfession } from '@/logic/confessionEngine';
import type { ContradictionId, SuspectId } from '@/data/types';

const allMandatory: ReadonlySet<ContradictionId> = new Set(SOLUTION.mandatoryContradictionIds);

function callConfession(
  overrides: Partial<{
    suspectId: SuspectId;
    isCallActive: boolean;
    isGameActive: boolean;
    isTimerActive: boolean;
    pressure: number;
    discovered: ReadonlySet<ContradictionId>;
  }> = {},
): boolean {
  const args = {
    suspectId: SOLUTION.culpritId,
    isCallActive: true,
    isGameActive: true,
    isTimerActive: true,
    pressure: SOLUTION.confessionPressureThreshold,
    discovered: allMandatory,
    ...overrides,
  };

  return shouldTriggerConfession(
    args.suspectId,
    args.isCallActive,
    args.isGameActive,
    args.isTimerActive,
    args.pressure,
    args.discovered,
    SOLUTION,
  );
}

describe('shouldTriggerConfession: conjunción completa', () => {
  it('confiesa cuando se cumplen todas las condiciones', () => {
    expect(callConfession()).toBe(true);
    expect(callConfession({ pressure: SOLUTION.confessionPressureThreshold + 20 })).toBe(true);
    expect(callConfession({ pressure: 100 })).toBe(true);
  });

  it('confiesa igualmente con contradicciones adicionales descubiertas', () => {
    expect(
      callConfession({
        discovered: new Set<ContradictionId>([
          ...allMandatory,
          'contra_elena_arrival',
          'contra_roberto_info',
          'contra_sofia_witness',
        ]),
      }),
    ).toBe(true);
  });
});

describe('shouldTriggerConfession: cada condición por separado', () => {
  it('exige una partida activa', () => {
    expect(callConfession({ isGameActive: false })).toBe(false);
  });

  it('exige una llamada activa', () => {
    expect(callConfession({ isCallActive: false })).toBe(false);
  });

  it('exige un temporizador activo', () => {
    expect(callConfession({ isTimerActive: false })).toBe(false);
  });

  it('exige que el sospechoso en llamada sea el culpable', () => {
    for (const suspectId of SUSPECT_IDS) {
      expect(callConfession({ suspectId })).toBe(suspectId === SOLUTION.culpritId);
    }
  });

  it('exige alcanzar el umbral de presión', () => {
    expect(callConfession({ pressure: SOLUTION.confessionPressureThreshold - 1 })).toBe(false);
    expect(callConfession({ pressure: 0 })).toBe(false);
    expect(callConfession({ pressure: -10 })).toBe(false);
    expect(callConfession({ pressure: Number.NaN })).toBe(false);
    expect(callConfession({ pressure: Number.POSITIVE_INFINITY })).toBe(false);
  });

  it('exige las tres contradicciones obligatorias, no un subconjunto', () => {
    expect(callConfession({ discovered: new Set<ContradictionId>() })).toBe(false);

    for (const missing of SOLUTION.mandatoryContradictionIds) {
      const partial = new Set<ContradictionId>(
        SOLUTION.mandatoryContradictionIds.filter((id) => id !== missing),
      );

      expect(partial.size).toBe(2);
      expect(callConfession({ discovered: partial })).toBe(false);
    }
  });

  it('no confiesa con presión suficiente pero contradicciones de otros sospechosos', () => {
    expect(
      callConfession({
        pressure: 100,
        discovered: new Set<ContradictionId>([
          'contra_elena_arrival',
          'contra_roberto_info',
          'contra_sofia_witness',
        ]),
      }),
    ).toBe(false);
  });

  it('no confiesa cuando fallan varias condiciones a la vez', () => {
    expect(callConfession({ isCallActive: false, pressure: 0 })).toBe(false);
    expect(
      callConfession({
        suspectId: 'elena',
        discovered: new Set<ContradictionId>(),
        isTimerActive: false,
      }),
    ).toBe(false);
  });
});
