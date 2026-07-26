/**
 * Pruebas del validador de solicitudes y respuestas del contrato backend.
 * Grupo (g): contrato backend — tarea 6.4.
 *
 * Cubre:
 * - Request válido (camino feliz)
 * - Sospechoso desconocido
 * - Pregunta vacía o mayor a 300 caracteres
 * - Contexto ausente o mal tipado
 * - Cuerpo excedido (> 8 KB)
 * - IDs de contradicción desconocidos
 * - Presión no numérica, infinita, negativa o ausente
 * - Respuesta 4xx con identificación del campo inválido
 * - Salida válida y salidas fuera de contrato (JSON inválido, campos extra,
 *   tipos incorrectos, texto vacío, texto > 500, ID desconocido, ID de otro sospechoso)
 *
 * Requisitos: 15.7, 16.2-16.4, 17.2-17.4
 */

import {
  validateRequest,
  validateBodySize,
  validateResponse,
  MAX_BODY_BYTES,
  MAX_QUESTION_LENGTH,
  MAX_RESPONSE_TEXT_LENGTH,
} from '../validator';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Cuerpo mínimo válido serializado a JSON. */
function validBody(overrides: Record<string, unknown> = {}): string {
  const base = {
    suspectId: 'daniel',
    question: '¿A qué hora llegaste al edificio?',
    gameContext: {
      discoveredContradictionIds: ['contra_daniel_access'],
      suspectPressure: 10,
    },
    ...overrides,
  };
  return JSON.stringify(base);
}

// ---------------------------------------------------------------------------
// validateBodySize
// ---------------------------------------------------------------------------

describe('validateBodySize', () => {
  it('acepta un cuerpo dentro del límite', () => {
    expect(validateBodySize(validBody())).toBeNull();
  });

  it('rechaza un cuerpo que supera MAX_BODY_BYTES', () => {
    const oversized = 'x'.repeat(MAX_BODY_BYTES + 1);
    const error = validateBodySize(oversized);
    expect(error).not.toBeNull();
    expect(error?.field).toBe('body');
  });

  it('acepta exactamente MAX_BODY_BYTES bytes', () => {
    const exact = 'x'.repeat(MAX_BODY_BYTES);
    expect(validateBodySize(exact)).toBeNull();
  });
});

// ---------------------------------------------------------------------------
// validateRequest — cuerpo y JSON
// ---------------------------------------------------------------------------

describe('validateRequest — formato de cuerpo', () => {
  it('acepta un request completamente válido', () => {
    const result = validateRequest(validBody());
    expect(result.valid).toBe(true);
    if (result.valid) {
      expect(result.request.suspectId).toBe('daniel');
      expect(result.request.question).toBe('¿A qué hora llegaste al edificio?');
      expect(result.request.gameContext.suspectPressure).toBe(10);
    }
  });

  it('rechaza JSON malformado con campo body', () => {
    const result = validateRequest('{no-es-json}');
    expect(result.valid).toBe(false);
    if (!result.valid) expect(result.error.field).toBe('body');
  });

  it('rechaza un array JSON en lugar de objeto', () => {
    const result = validateRequest('["daniel"]');
    expect(result.valid).toBe(false);
    if (!result.valid) expect(result.error.field).toBe('body');
  });

  it('rechaza un cuerpo superior a MAX_BODY_BYTES con campo body', () => {
    const oversized = JSON.stringify({ suspectId: 'd', question: 'x'.repeat(MAX_BODY_BYTES) });
    const result = validateRequest(oversized);
    expect(result.valid).toBe(false);
    if (!result.valid) expect(result.error.field).toBe('body');
  });
});

// ---------------------------------------------------------------------------
// validateRequest — suspectId
// ---------------------------------------------------------------------------

describe('validateRequest — suspectId', () => {
  it('rechaza sospechoso desconocido con campo suspectId', () => {
    const result = validateRequest(validBody({ suspectId: 'desconocido' }));
    expect(result.valid).toBe(false);
    if (!result.valid) expect(result.error.field).toBe('suspectId');
  });

  it('rechaza suspectId ausente con campo suspectId', () => {
    const body = JSON.stringify({
      question: 'Hola',
      gameContext: { discoveredContradictionIds: [], suspectPressure: 0 },
    });
    const result = validateRequest(body);
    expect(result.valid).toBe(false);
    if (!result.valid) expect(result.error.field).toBe('suspectId');
  });

  it('acepta los cuatro sospechosos conocidos', () => {
    for (const id of ['daniel', 'elena', 'roberto', 'sofia']) {
      const result = validateRequest(validBody({ suspectId: id }));
      expect(result.valid).toBe(true);
    }
  });
});

// ---------------------------------------------------------------------------
// validateRequest — question
// ---------------------------------------------------------------------------

describe('validateRequest — question', () => {
  it('rechaza pregunta vacía con campo question', () => {
    const result = validateRequest(validBody({ question: '' }));
    expect(result.valid).toBe(false);
    if (!result.valid) expect(result.error.field).toBe('question');
  });

  it('rechaza pregunta de exactamente 301 caracteres con campo question', () => {
    const result = validateRequest(validBody({ question: 'a'.repeat(MAX_QUESTION_LENGTH + 1) }));
    expect(result.valid).toBe(false);
    if (!result.valid) expect(result.error.field).toBe('question');
  });

  it('acepta pregunta de exactamente 300 caracteres', () => {
    const result = validateRequest(validBody({ question: 'a'.repeat(MAX_QUESTION_LENGTH) }));
    expect(result.valid).toBe(true);
  });

  it('rechaza pregunta de tipo no-string con campo question', () => {
    const result = validateRequest(validBody({ question: 42 }));
    expect(result.valid).toBe(false);
    if (!result.valid) expect(result.error.field).toBe('question');
  });
});

// ---------------------------------------------------------------------------
// validateRequest — gameContext
// ---------------------------------------------------------------------------

describe('validateRequest — gameContext', () => {
  it('rechaza gameContext ausente con campo gameContext', () => {
    const body = JSON.stringify({ suspectId: 'daniel', question: 'Hola' });
    const result = validateRequest(body);
    expect(result.valid).toBe(false);
    if (!result.valid) expect(result.error.field).toBe('gameContext');
  });

  it('rechaza gameContext de tipo string con campo gameContext', () => {
    const result = validateRequest(validBody({ gameContext: 'invalido' }));
    expect(result.valid).toBe(false);
    if (!result.valid) expect(result.error.field).toBe('gameContext');
  });

  it('rechaza gameContext null con campo gameContext', () => {
    const result = validateRequest(validBody({ gameContext: null }));
    expect(result.valid).toBe(false);
    if (!result.valid) expect(result.error.field).toBe('gameContext');
  });

  it('rechaza gameContext como array con campo gameContext', () => {
    const result = validateRequest(validBody({ gameContext: [] }));
    expect(result.valid).toBe(false);
    if (!result.valid) expect(result.error.field).toBe('gameContext');
  });
});

// ---------------------------------------------------------------------------
// validateRequest — discoveredContradictionIds
// ---------------------------------------------------------------------------

describe('validateRequest — discoveredContradictionIds', () => {
  it('rechaza ID de contradicción desconocido', () => {
    const result = validateRequest(
      validBody({
        gameContext: { discoveredContradictionIds: ['contra_inexistente'], suspectPressure: 0 },
      }),
    );
    expect(result.valid).toBe(false);
    if (!result.valid) expect(result.error.field).toBe('gameContext.discoveredContradictionIds');
  });

  it('rechaza discoveredContradictionIds de tipo no-array', () => {
    const result = validateRequest(
      validBody({ gameContext: { discoveredContradictionIds: 'todos', suspectPressure: 0 } }),
    );
    expect(result.valid).toBe(false);
    if (!result.valid) expect(result.error.field).toBe('gameContext.discoveredContradictionIds');
  });

  it('acepta un array vacío de contradicciones', () => {
    const result = validateRequest(
      validBody({ gameContext: { discoveredContradictionIds: [], suspectPressure: 0 } }),
    );
    expect(result.valid).toBe(true);
  });

  it('acepta todos los IDs de contradicción conocidos a la vez', () => {
    const allIds = [
      'contra_daniel_access',
      'contra_daniel_camera',
      'contra_daniel_receipt',
      'contra_elena_arrival',
      'contra_roberto_info',
      'contra_sofia_witness',
    ];
    const result = validateRequest(
      validBody({ gameContext: { discoveredContradictionIds: allIds, suspectPressure: 0 } }),
    );
    expect(result.valid).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// validateRequest — suspectPressure
// ---------------------------------------------------------------------------

describe('validateRequest — suspectPressure', () => {
  it('rechaza presión ausente con campo gameContext.suspectPressure', () => {
    const result = validateRequest(
      validBody({ gameContext: { discoveredContradictionIds: [] } }),
    );
    expect(result.valid).toBe(false);
    if (!result.valid) expect(result.error.field).toBe('gameContext.suspectPressure');
  });

  it('rechaza presión de tipo string con campo gameContext.suspectPressure', () => {
    const result = validateRequest(
      validBody({ gameContext: { discoveredContradictionIds: [], suspectPressure: 'alta' } }),
    );
    expect(result.valid).toBe(false);
    if (!result.valid) expect(result.error.field).toBe('gameContext.suspectPressure');
  });

  it('rechaza presión null (resultado de serializar NaN o Infinity como JSON) con campo gameContext.suspectPressure', () => {
    // JSON.stringify convierte NaN e Infinity a null; el cliente nunca puede
    // enviar NaN/Infinity literales en JSON, por lo que null es el caso real a validar.
    const body = JSON.stringify({
      suspectId: 'daniel',
      question: 'Hola',
      gameContext: { discoveredContradictionIds: [], suspectPressure: null },
    });
    const result = validateRequest(body);
    expect(result.valid).toBe(false);
    if (!result.valid) expect(result.error.field).toBe('gameContext.suspectPressure');
  });

  it('rechaza presión negativa con campo gameContext.suspectPressure', () => {
    const result = validateRequest(
      validBody({ gameContext: { discoveredContradictionIds: [], suspectPressure: -5 } }),
    );
    expect(result.valid).toBe(false);
    if (!result.valid) expect(result.error.field).toBe('gameContext.suspectPressure');
  });

  it('acepta presión cero', () => {
    const result = validateRequest(
      validBody({ gameContext: { discoveredContradictionIds: [], suspectPressure: 0 } }),
    );
    expect(result.valid).toBe(true);
  });

  it('acepta presión positiva finita', () => {
    const result = validateRequest(
      validBody({ gameContext: { discoveredContradictionIds: [], suspectPressure: 75 } }),
    );
    expect(result.valid).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// validateResponse — salida del modelo
// ---------------------------------------------------------------------------

describe('validateResponse — salida válida', () => {
  it('acepta respuesta con statementId nulo', () => {
    const resp = { text: 'No sé nada de eso.', statementId: null };
    expect(validateResponse(resp, 'daniel')).toBe(true);
  });

  it('acepta respuesta con statementId del propio sospechoso', () => {
    const resp = { text: 'Llegué a las 20:50.', statementId: 'stmt_daniel_arrival' };
    expect(validateResponse(resp, 'daniel')).toBe(true);
  });

  it('acepta texto de exactamente 500 caracteres', () => {
    const resp = { text: 'a'.repeat(MAX_RESPONSE_TEXT_LENGTH), statementId: null };
    expect(validateResponse(resp, 'daniel')).toBe(true);
  });
});

describe('validateResponse — salidas fuera de contrato', () => {
  it('rechaza texto vacío', () => {
    expect(validateResponse({ text: '', statementId: null }, 'daniel')).toBe(false);
  });

  it('rechaza texto de 501 caracteres', () => {
    const resp = { text: 'a'.repeat(MAX_RESPONSE_TEXT_LENGTH + 1), statementId: null };
    expect(validateResponse(resp, 'daniel')).toBe(false);
  });

  it('rechaza campo extra en la respuesta', () => {
    const resp = { text: 'Hola.', statementId: null, extra: 'no permitido' };
    expect(validateResponse(resp, 'daniel')).toBe(false);
  });

  it('rechaza statementId desconocido', () => {
    const resp = { text: 'Hola.', statementId: 'stmt_inexistente' };
    expect(validateResponse(resp, 'daniel')).toBe(false);
  });

  it('rechaza statementId perteneciente a otro sospechoso', () => {
    // stmt_elena_arrival pertenece a elena, no a daniel
    const resp = { text: 'Hola.', statementId: 'stmt_elena_arrival' };
    expect(validateResponse(resp, 'daniel')).toBe(false);
  });

  it('rechaza text de tipo no-string', () => {
    expect(validateResponse({ text: 42, statementId: null }, 'daniel')).toBe(false);
  });

  it('rechaza un array en lugar de objeto', () => {
    expect(validateResponse(['texto', null], 'daniel')).toBe(false);
  });

  it('rechaza null', () => {
    expect(validateResponse(null, 'daniel')).toBe(false);
  });

  it('rechaza texto de tipo número como string literal — tipos incorrectos', () => {
    expect(validateResponse({ text: 123, statementId: null }, 'elena')).toBe(false);
  });

  it('un statementId de roberto no es válido para sofia', () => {
    const resp = { text: 'Hola.', statementId: 'stmt_roberto_knowledge' };
    expect(validateResponse(resp, 'sofia')).toBe(false);
  });
});
