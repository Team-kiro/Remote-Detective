import { describe, expect, it } from 'vitest';
import {
  CONTRADICTION_IDS,
  EVIDENCE_IDS,
  METHOD_IDS,
  MOTIVE_IDS,
  STATEMENT_IDS,
  SUSPECT_IDS,
  isContradictionId,
  isEvidenceId,
  isMethodId,
  isMotiveId,
  isStatementId,
  isSuspectId,
} from '@/data/types';

describe('stable domain identifiers', () => {
  it('exposes the frozen identifier sets required by the case model', () => {
    expect(SUSPECT_IDS).toHaveLength(4);
    expect(EVIDENCE_IDS).toHaveLength(6);
    expect(STATEMENT_IDS).toHaveLength(6);
    expect(CONTRADICTION_IDS).toHaveLength(6);
    expect(MOTIVE_IDS).toHaveLength(4);
    expect(METHOD_IDS).toHaveLength(4);
  });

  it('accepts known identifiers and rejects unknown or non-string values', () => {
    expect(isSuspectId('daniel')).toBe(true);
    expect(isEvidenceId('ev_camera')).toBe(true);
    expect(isStatementId('stmt_sofia_witness')).toBe(true);
    expect(isContradictionId('contra_roberto_info')).toBe(true);
    expect(isMotiveId('motive_silence')).toBe(true);
    expect(isMethodId('method_poison')).toBe(true);

    expect(isSuspectId('unknown')).toBe(false);
    expect(isEvidenceId(null)).toBe(false);
    expect(isStatementId(1)).toBe(false);
    expect(isContradictionId({})).toBe(false);
    expect(isMotiveId(undefined)).toBe(false);
    expect(isMethodId('method_unknown')).toBe(false);
  });
});
