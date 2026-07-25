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
