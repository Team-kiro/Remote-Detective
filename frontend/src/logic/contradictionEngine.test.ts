/**
 * Grupo de pruebas (b) — clasificación determinista de contradicciones.
 *
 * Cubre los cuatro resultados posibles con las seis contradicciones congeladas:
 * válida con sus puntos y presión de catálogo, ya descubierta, relacionada pero
 * insuficiente e incorrecta. El motor es puro: no aplica cambios de estado ni
 * muta sus argumentos.
 *
 * Requisitos: 8.2-8.9, 11.1-11.3, 11.6, 15.1
 */

import { describe, expect, it } from 'vitest';
import { CONTRADICTIONS } from '@/data/contradictions';
import { EVIDENCE } from '@/data/evidence';
import { STATEMENTS } from '@/data/statements';
import { evaluateContradiction } from '@/logic/contradictionEngine';
import type { ContradictionId, EvidenceId, StatementId } from '@/data/types';

const NONE = new Set<ContradictionId>();

/**
 * Combinaciones cuya evidencia es relevante para el sospechoso que hizo la
 * declaración, pero que no demuestran ninguna contradicción del catálogo.
 */
const RELATED_BUT_INSUFFICIENT: readonly (readonly [EvidenceId, StatementId])[] = [
  ['ev_bottle', 'stmt_daniel_arrival'],
  ['ev_receipt', 'stmt_daniel_office'],
  ['ev_camera', 'stmt_daniel_substance'],
  ['ev_access_log', 'stmt_daniel_office'],
  ['ev_email', 'stmt_daniel_substance'],
  ['ev_access_log', 'stmt_roberto_knowledge'],
  ['ev_access_log', 'stmt_sofia_witness'],
];

/** Combinaciones sin relación alguna con el sospechoso de la declaración. */
const INCORRECT: readonly (readonly [EvidenceId, StatementId])[] = [
  ['ev_toxicology', 'stmt_daniel_arrival'],
  ['ev_toxicology', 'stmt_elena_arrival'],
  ['ev_toxicology', 'stmt_sofia_witness'],
  ['ev_bottle', 'stmt_elena_arrival'],
  ['ev_bottle', 'stmt_sofia_witness'],
  ['ev_receipt', 'stmt_roberto_knowledge'],
  ['ev_email', 'stmt_sofia_witness'],
  ['ev_camera', 'stmt_roberto_knowledge'],
];

describe('evaluateContradiction: contradicción válida', () => {
  it('reconoce las seis contradicciones válidas con sus puntos y presión de catálogo', () => {
    for (const contradiction of CONTRADICTIONS) {
      const result = evaluateContradiction(
        contradiction.evidenceId,
        contradiction.statementId,
        NONE,
      );

      expect(result.type).toBe('valid');
      if (result.type === 'valid') {
        expect(result.contradiction.id).toBe(contradiction.id);
        expect(result.contradiction.suspectId).toBe(contradiction.suspectId);
        expect(result.contradiction.points).toBe(contradiction.points);
        expect(result.contradiction.pressureIncrease).toBe(contradiction.pressureIncrease);
        expect(result.contradiction.explanation).toBe(contradiction.explanation);
      }
    }
  });

  it('devuelve la contradicción válida aunque otras ya estén descubiertas', () => {
    const others = new Set<ContradictionId>([
      'contra_elena_arrival',
      'contra_roberto_info',
      'contra_sofia_witness',
    ]);

    const result = evaluateContradiction('ev_receipt', 'stmt_daniel_substance', others);

    expect(result.type).toBe('valid');
    if (result.type === 'valid') {
      expect(result.contradiction.id).toBe('contra_daniel_receipt');
      expect(result.contradiction.points).toBe(200);
      expect(result.contradiction.pressureIncrease).toBe(40);
    }
  });
});

describe('evaluateContradiction: contradicción ya descubierta', () => {
  it('cada contradicción se reconoce como válida una sola vez', () => {
    for (const contradiction of CONTRADICTIONS) {
      const discovered = new Set<ContradictionId>([contradiction.id]);

      const repeated = evaluateContradiction(
        contradiction.evidenceId,
        contradiction.statementId,
        discovered,
      );

      expect(repeated).toEqual({ type: 'already_discovered' });
    }
  });

  it('no aporta puntos, presión ni explicación al repetirse', () => {
    const discovered = new Set<ContradictionId>(['contra_daniel_access']);

    const result = evaluateContradiction('ev_access_log', 'stmt_daniel_arrival', discovered);

    expect(result).toEqual({ type: 'already_discovered' });
    expect(Object.keys(result)).toEqual(['type']);
  });
});

describe('evaluateContradiction: evidencia relacionada pero insuficiente', () => {
  it.each(RELATED_BUT_INSUFFICIENT)(
    '%s sobre %s es relevante para el sospechoso pero no demuestra la mentira',
    (evidenceId, statementId) => {
      const result = evaluateContradiction(evidenceId, statementId, NONE);

      expect(result).toEqual({ type: 'related_insufficient' });

      // Confirma la razón: la evidencia sí se relaciona con ese sospechoso.
      const evidence = EVIDENCE.find((candidate) => candidate.id === evidenceId);
      const suspectId = STATEMENTS[statementId].suspectId;
      expect(evidence?._internal.relatedSuspects).toContain(suspectId);
    },
  );
});

describe('evaluateContradiction: combinación incorrecta', () => {
  it.each(INCORRECT)('%s sobre %s no guarda relación con el sospechoso', (evidenceId, statementId) => {
    const result = evaluateContradiction(evidenceId, statementId, NONE);

    expect(result).toEqual({ type: 'incorrect' });

    const evidence = EVIDENCE.find((candidate) => candidate.id === evidenceId);
    const suspectId = STATEMENTS[statementId].suspectId;
    expect(evidence?._internal.relatedSuspects).not.toContain(suspectId);
  });
});

describe('evaluateContradiction: pureza', () => {
  it('no muta el conjunto de contradicciones descubiertas ni los datos del caso', () => {
    const discovered = new Set<ContradictionId>(['contra_elena_arrival']);

    evaluateContradiction('ev_camera', 'stmt_daniel_office', discovered);
    evaluateContradiction('ev_access_log', 'stmt_elena_arrival', discovered);
    evaluateContradiction('ev_toxicology', 'stmt_daniel_arrival', discovered);

    expect([...discovered]).toEqual(['contra_elena_arrival']);
    expect(CONTRADICTIONS).toHaveLength(6);
  });

  it('es determinista: la misma entrada produce siempre el mismo resultado', () => {
    const discovered = new Set<ContradictionId>();

    expect(evaluateContradiction('ev_access_log', 'stmt_daniel_arrival', discovered)).toEqual(
      evaluateContradiction('ev_access_log', 'stmt_daniel_arrival', discovered),
    );
    expect(evaluateContradiction('ev_toxicology', 'stmt_elena_arrival', discovered)).toEqual(
      evaluateContradiction('ev_toxicology', 'stmt_elena_arrival', discovered),
    );
  });
});
