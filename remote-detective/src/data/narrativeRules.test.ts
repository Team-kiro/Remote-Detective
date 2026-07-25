import { describe, expect, it } from 'vitest';
import { LOCAL_RESPONSES } from '@/data/localResponses';
import { SCORING_RULES } from '@/data/scoringRules';
import { STATEMENTS } from '@/data/statements';
import { SUSPECT_IDS } from '@/data/types';

describe('local narrative responses', () => {
  it('defines five specific responses and exactly one generic per suspect', () => {
    expect(LOCAL_RESPONSES).toHaveLength(24);
    expect(new Set(LOCAL_RESPONSES.map(({ id }) => id)).size).toBe(24);

    for (const suspectId of SUSPECT_IDS) {
      const responses = LOCAL_RESPONSES.filter(
        (response) => response.suspectId === suspectId,
      );
      const specific = responses.filter(({ isGeneric }) => !isGeneric);
      const generic = responses.filter(({ isGeneric }) => isGeneric);

      expect(specific.length).toBeGreaterThanOrEqual(5);
      expect(generic).toHaveLength(1);
      expect(generic[0]).toMatchObject({
        id: `resp_${suspectId}_generic`,
        keywordGroups: [],
        statementId: null,
        priority: 0,
      });
      expect(generic[0]?.text.trim().length ?? 0).toBeGreaterThan(0);

      for (const response of specific) {
        expect(response.text.trim().length).toBeGreaterThan(0);
        expect(response.keywordGroups.length).toBeGreaterThan(0);
        for (const group of response.keywordGroups) {
          expect(group.length).toBeGreaterThan(0);
          for (const term of group) {
            expect(term).toBe(term.toLowerCase());
            expect(term.normalize('NFD').replace(/[\u0300-\u036f]/g, '')).toBe(term);
          }
        }
      }
    }
  });

  it('uses only approved statement IDs belonging to the same suspect', () => {
    const statementResponses = LOCAL_RESPONSES.filter(
      (response) => response.statementId !== null,
    );

    expect(statementResponses.map(({ statementId }) => statementId)).toEqual([
      'stmt_daniel_arrival',
      'stmt_daniel_office',
      'stmt_daniel_substance',
      'stmt_elena_arrival',
      'stmt_roberto_knowledge',
      'stmt_sofia_witness',
    ]);

    for (const response of statementResponses) {
      expect(STATEMENTS[response.statementId].suspectId).toBe(
        response.suspectId,
      );
      expect(response.priority).toBe(10);
      expect(response.keywordGroups.length).toBeGreaterThan(0);
    }
  });
});

describe('scoring rules', () => {
  it('preserves the approved deterministic values', () => {
    expect(SCORING_RULES).toEqual({
      incorrectCombinationPenalty: 50,
      confessionBonus: 500,
      correctAccusationBonus: 300,
      timeRemainingFactor: 1,
      minimumScore: 0,
    });
  });
});
