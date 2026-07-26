/**
 * Prueba mínima de la traducción de un drop a la pareja `(evidenceId,
 * statementId)` que la UI entrega a `presentEvidence`.
 *
 * Un drop fuera de una declaración, o sobre un identificador ajeno a los datos
 * congelados, se cancela sin evaluar: la UI nunca fabrica el resultado. Los
 * flujos completos de pointer/keyboard y los cuatro feedbacks pertenecen al
 * grupo de pruebas 4.7.
 *
 * Requisitos: 8.1-8.2, 8.10
 */

import { describe, expect, it } from 'vitest';
import { resolveDrop } from '@/components/call/contradictionDrop';
import { EVIDENCE_VIEWS } from '@/data/viewModels';

describe('resolveDrop', () => {
  it('devuelve la pareja congelada cuando la evidencia cae sobre una declaración', () => {
    expect(resolveDrop('ev_access_log', 'stmt_daniel_arrival', EVIDENCE_VIEWS)).toEqual({
      evidenceId: 'ev_access_log',
      statementId: 'stmt_daniel_arrival',
    });
  });

  it('cancela el drop fuera de cualquier declaración', () => {
    expect(resolveDrop('ev_access_log', undefined, EVIDENCE_VIEWS)).toBeNull();
  });

  it('cancela el drop sobre identificadores ajenos a los datos narrativos', () => {
    expect(resolveDrop('ev_access_log', 'stmt_inventado', EVIDENCE_VIEWS)).toBeNull();
    expect(resolveDrop('ev_inventada', 'stmt_daniel_arrival', EVIDENCE_VIEWS)).toBeNull();
  });
});
