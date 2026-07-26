import { describe, expect, it } from 'vitest';
import { METHOD_OPTIONS, MOTIVE_OPTIONS } from '@/data/accusationOptions';
import { CASE_FILE, OFFICIAL_TIMELINE } from '@/data/case';
import { CONTRADICTIONS } from '@/data/contradictions';
import { EVIDENCE } from '@/data/evidence';
import { SOLUTION } from '@/data/solution';
import { STATEMENTS } from '@/data/statements';
import { SUSPECTS } from '@/data/suspects';
import {
  CONTRADICTION_IDS,
  EVIDENCE_IDS,
  METHOD_IDS,
  MOTIVE_IDS,
  STATEMENT_IDS,
  SUSPECT_IDS,
  isContradictionId,
  isEvidenceId,
  isStatementId,
  isSuspectId,
} from '@/data/types';

describe('frozen narrative data', () => {
  it('contains exactly the approved suspects, evidence, statements and contradictions', () => {
    expect(SUSPECTS.map(({ id }) => id)).toEqual(SUSPECT_IDS);
    expect(EVIDENCE.map(({ id }) => id)).toEqual(EVIDENCE_IDS);
    expect(Object.keys(STATEMENTS)).toEqual(STATEMENT_IDS);
    expect(CONTRADICTIONS.map(({ id }) => id)).toEqual(CONTRADICTION_IDS);
    expect(SUSPECTS.map(({ initialPressure }) => initialPressure)).toEqual([
      0, 0, 0, 0,
    ]);
  });

  it('keeps every contradiction reference valid and the approved distribution intact', () => {
    const evidenceIds = new Set(EVIDENCE.map(({ id }) => id));
    const suspectIds = new Set(SUSPECTS.map(({ id }) => id));

    for (const contradiction of CONTRADICTIONS) {
      expect(evidenceIds.has(contradiction.evidenceId)).toBe(true);
      expect(suspectIds.has(contradiction.suspectId)).toBe(true);
      expect(STATEMENTS[contradiction.statementId].suspectId).toBe(
        contradiction.suspectId,
      );
      expect(contradiction.unlocksStatement).toBeNull();
    }

    expect(
      CONTRADICTIONS.filter(({ suspectId }) => suspectId === 'daniel'),
    ).toHaveLength(3);
    expect(
      CONTRADICTIONS.filter(({ suspectId }) => suspectId === 'elena'),
    ).toHaveLength(1);
    expect(
      CONTRADICTIONS.filter(({ suspectId }) => suspectId === 'roberto'),
    ).toHaveLength(1);
    expect(
      CONTRADICTIONS.filter(({ suspectId }) => suspectId === 'sofia'),
    ).toHaveLength(1);
  });

  it('preserves the official solution and accusation options', () => {
    expect(SOLUTION).toEqual({
      culpritId: 'daniel',
      motiveId: 'motive_silence',
      methodId: 'method_poison',
      requiredEvidenceIds: [
        'ev_email',
        'ev_camera',
        'ev_receipt',
        'ev_bottle',
      ],
      confessionPressureThreshold: 80,
      mandatoryContradictionIds: [
        'contra_daniel_access',
        'contra_daniel_camera',
        'contra_daniel_receipt',
      ],
    });
    expect(MOTIVE_OPTIONS.map(({ id }) => id)).toEqual(MOTIVE_IDS);
    expect(METHOD_OPTIONS.map(({ id }) => id)).toEqual(METHOD_IDS);
  });

  it('preserves the official case and chronology', () => {
    expect(CASE_FILE.title).toBe('El asesinato de Marcos Linares');
    expect(CASE_FILE._internal.culpritId).toBe('daniel');
    expect(OFFICIAL_TIMELINE).toHaveLength(14);
    expect(OFFICIAL_TIMELINE[0]).toEqual({
      time: '18:00',
      event:
        'Marcos envía correo convocando reunión urgente para las 21:00 con los 4 socios',
    });
    expect(OFFICIAL_TIMELINE.at(-1)).toEqual({
      time: '21:30',
      event: 'Policía precinta la escena',
    });
  });
});

describe('narrative integrity of the frozen case', () => {
  it('keeps the approved counts and unique identifiers in every catalogue', () => {
    expect(SUSPECTS).toHaveLength(4);
    expect(EVIDENCE).toHaveLength(6);
    expect(Object.keys(STATEMENTS)).toHaveLength(6);
    expect(CONTRADICTIONS).toHaveLength(6);

    expect(new Set(SUSPECTS.map(({ id }) => id)).size).toBe(4);
    expect(new Set(EVIDENCE.map(({ id }) => id)).size).toBe(6);
    expect(new Set(Object.values(STATEMENTS).map(({ id }) => id)).size).toBe(6);
    expect(new Set(CONTRADICTIONS.map(({ id }) => id)).size).toBe(6);

    for (const [key, statement] of Object.entries(STATEMENTS)) {
      expect(statement.id).toBe(key);
      expect(isStatementId(statement.id)).toBe(true);
      expect(isSuspectId(statement.suspectId)).toBe(true);
      expect(statement.canonicalText.trim().length).toBeGreaterThan(0);
    }

    for (const contradiction of CONTRADICTIONS) {
      expect(isContradictionId(contradiction.id)).toBe(true);
      expect(isEvidenceId(contradiction.evidenceId)).toBe(true);
      expect(contradiction.explanation.trim().length).toBeGreaterThan(0);
      expect(contradiction.points).toBeGreaterThan(0);
      expect(contradiction.pressureIncrease).toBeGreaterThan(0);
    }
  });

  it('only accepts the six approved statements as contradiction targets', () => {
    const targetedStatements = CONTRADICTIONS.map(({ statementId }) => statementId);

    for (const statementId of targetedStatements) {
      expect(isStatementId(statementId)).toBe(true);
      expect(STATEMENT_IDS).toContain(statementId);
      expect(STATEMENTS[statementId]).toBeDefined();
    }

    expect(new Set(targetedStatements).size).toBe(6);
    for (const statementId of STATEMENT_IDS) {
      expect(targetedStatements).toContain(statementId);
    }
  });

  it('gives Daniel three contradicting statements and one to each innocent suspect', () => {
    const statementsBySuspect = (suspectId: string): number =>
      new Set(
        CONTRADICTIONS.filter(
          (contradiction) => contradiction.suspectId === suspectId,
        ).map(({ statementId }) => statementId),
      ).size;

    expect(statementsBySuspect('daniel')).toBe(3);
    expect(statementsBySuspect('elena')).toBe(1);
    expect(statementsBySuspect('roberto')).toBe(1);
    expect(statementsBySuspect('sofia')).toBe(1);

    for (const suspect of SUSPECTS) {
      expect(suspect._internal.lies.length).toBeGreaterThanOrEqual(1);
    }
  });

  it('keeps every evidence available from the start with observable player info', () => {
    for (const evidence of EVIDENCE) {
      expect(new Set(Object.keys(evidence))).toEqual(
        new Set([
          'id',
          'name',
          'category',
          'description',
          'observableInfo',
          'image',
          '_internal',
        ]),
      );
      expect(evidence.observableInfo.trim().length).toBeGreaterThan(0);
      expect(['physical', 'document', 'digital']).toContain(evidence.category);
    }
  });

  it('resolves the solution exclusively with frozen catalogue data', () => {
    const evidenceIds = new Set(EVIDENCE.map(({ id }) => id));
    const contradictionIds = new Set(CONTRADICTIONS.map(({ id }) => id));

    expect(SOLUTION.culpritId).toBe('daniel');
    expect(SUSPECTS.some(({ id }) => id === SOLUTION.culpritId)).toBe(true);
    expect(MOTIVE_OPTIONS.some(({ id }) => id === SOLUTION.motiveId)).toBe(true);
    expect(METHOD_OPTIONS.some(({ id }) => id === SOLUTION.methodId)).toBe(true);

    expect(SOLUTION.requiredEvidenceIds).toHaveLength(4);
    expect(new Set(SOLUTION.requiredEvidenceIds).size).toBe(4);
    for (const evidenceId of SOLUTION.requiredEvidenceIds) {
      expect(evidenceIds.has(evidenceId)).toBe(true);
    }

    expect(SOLUTION.mandatoryContradictionIds).toHaveLength(3);
    expect(new Set(SOLUTION.mandatoryContradictionIds).size).toBe(3);
    for (const contradictionId of SOLUTION.mandatoryContradictionIds) {
      expect(contradictionIds.has(contradictionId)).toBe(true);
      const contradiction = CONTRADICTIONS.find(({ id }) => id === contradictionId);
      expect(contradiction?.suspectId).toBe('daniel');
    }

    const danielPressure = CONTRADICTIONS.filter(
      ({ suspectId }) => suspectId === 'daniel',
    ).reduce((total, { pressureIncrease }) => total + pressureIncrease, 0);
    expect(danielPressure).toBeGreaterThanOrEqual(SOLUTION.confessionPressureThreshold);
  });

  it('documents a logical sequence of at least three deduction steps', () => {
    const steps = CONTRADICTIONS.map((contradiction) => ({
      evidenceId: contradiction.evidenceId,
      statementId: contradiction.statementId,
      suspectId: contradiction.suspectId,
      incriminatesCulprit: contradiction.suspectId === SOLUTION.culpritId,
    }));

    const incriminating = steps.filter(({ incriminatesCulprit }) => incriminatesCulprit);
    const discarding = steps.filter(({ incriminatesCulprit }) => !incriminatesCulprit);

    expect(incriminating.length).toBeGreaterThanOrEqual(3);
    expect(new Set(discarding.map(({ suspectId }) => suspectId)).size).toBe(3);

    const pairs = steps.map(({ evidenceId, statementId }) => `${evidenceId}|${statementId}`);
    expect(new Set(pairs).size).toBe(steps.length);

    for (const step of steps) {
      const evidence = EVIDENCE.find(({ id }) => id === step.evidenceId);
      expect(evidence).toBeDefined();
      expect(evidence?.observableInfo.trim().length).toBeGreaterThan(0);
      expect(STATEMENTS[step.statementId].suspectId).toBe(step.suspectId);
    }
  });
});
