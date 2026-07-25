import { describe, expect, it } from 'vitest';
import { SOLUTION } from '@/data/solution';
import { EVIDENCE_IDS, METHOD_IDS, MOTIVE_IDS, SUSPECT_IDS } from '@/data/types';
import type { AccusationInput } from '@/data/types';
import { evaluateAccusation } from '@/logic/accusationEngine';

const correctAccusation: AccusationInput = {
  suspectId: SOLUTION.culpritId,
  motiveId: SOLUTION.motiveId,
  methodId: SOLUTION.methodId,
  evidenceIds: SOLUTION.requiredEvidenceIds,
};

describe('evaluateAccusation', () => {
  it('returns victory for the exact solution', () => {
    expect(evaluateAccusation(correctAccusation, SOLUTION)).toBe('victory');
  });

  it('accepts extra evidence beyond the required set', () => {
    expect(
      evaluateAccusation(
        {
          ...correctAccusation,
          evidenceIds: [...SOLUTION.requiredEvidenceIds, 'ev_access_log', 'ev_toxicology'],
        },
        SOLUTION,
      ),
    ).toBe('victory');
  });

  it('returns defeat when culprit, motive or method is wrong', () => {
    expect(evaluateAccusation({ ...correctAccusation, suspectId: 'elena' }, SOLUTION)).toBe(
      'defeat',
    );
    expect(evaluateAccusation({ ...correctAccusation, motiveId: 'motive_greed' }, SOLUTION)).toBe(
      'defeat',
    );
    expect(
      evaluateAccusation({ ...correctAccusation, methodId: 'method_assault' }, SOLUTION),
    ).toBe('defeat');
  });

  it('returns defeat when required evidence is incomplete', () => {
    expect(
      evaluateAccusation(
        { ...correctAccusation, evidenceIds: SOLUTION.requiredEvidenceIds.slice(1) },
        SOLUTION,
      ),
    ).toBe('defeat');
    expect(
      evaluateAccusation({ ...correctAccusation, evidenceIds: ['ev_access_log'] }, SOLUTION),
    ).toBe('defeat');
  });
});

describe('evaluateAccusation: cobertura exhaustiva de la solución congelada', () => {
  it.each(SUSPECT_IDS.filter((suspectId) => suspectId !== SOLUTION.culpritId))(
    'derrota con el culpable incorrecto %s',
    (suspectId) => {
      expect(evaluateAccusation({ ...correctAccusation, suspectId }, SOLUTION)).toBe('defeat');
    },
  );

  it.each(MOTIVE_IDS.filter((motiveId) => motiveId !== SOLUTION.motiveId))(
    'derrota con el motivo incorrecto %s',
    (motiveId) => {
      expect(evaluateAccusation({ ...correctAccusation, motiveId }, SOLUTION)).toBe('defeat');
    },
  );

  it.each(METHOD_IDS.filter((methodId) => methodId !== SOLUTION.methodId))(
    'derrota con el método incorrecto %s',
    (methodId) => {
      expect(evaluateAccusation({ ...correctAccusation, methodId }, SOLUTION)).toBe('defeat');
    },
  );

  it.each([...SOLUTION.requiredEvidenceIds])(
    'derrota si falta la evidencia requerida %s',
    (missingEvidenceId) => {
      const evidenceIds = SOLUTION.requiredEvidenceIds.filter(
        (evidenceId) => evidenceId !== missingEvidenceId,
      );

      expect(evaluateAccusation({ ...correctAccusation, evidenceIds }, SOLUTION)).toBe('defeat');
    },
  );

  it('derrota sin evidencias seleccionadas', () => {
    expect(evaluateAccusation({ ...correctAccusation, evidenceIds: [] }, SOLUTION)).toBe('defeat');
  });

  it('victoria con las seis evidencias, en cualquier orden y con duplicados', () => {
    expect(
      evaluateAccusation({ ...correctAccusation, evidenceIds: [...EVIDENCE_IDS] }, SOLUTION),
    ).toBe('victory');
    expect(
      evaluateAccusation(
        { ...correctAccusation, evidenceIds: [...SOLUTION.requiredEvidenceIds].reverse() },
        SOLUTION,
      ),
    ).toBe('victory');
    expect(
      evaluateAccusation(
        {
          ...correctAccusation,
          evidenceIds: [...SOLUTION.requiredEvidenceIds, ...SOLUTION.requiredEvidenceIds],
        },
        SOLUTION,
      ),
    ).toBe('victory');
  });

  it('evalúa únicamente desde AccusationInput, sin mutarlo y de forma repetible', () => {
    const input: AccusationInput = Object.freeze({
      ...correctAccusation,
      evidenceIds: Object.freeze([...SOLUTION.requiredEvidenceIds]),
    });

    expect(evaluateAccusation(input, SOLUTION)).toBe('victory');
    expect(evaluateAccusation(input, SOLUTION)).toBe('victory');
    expect(input.evidenceIds).toEqual(SOLUTION.requiredEvidenceIds);
  });
});
