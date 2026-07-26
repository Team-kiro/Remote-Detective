/**
 * Validación de solicitudes y respuestas del contrato POST /interrogate.
 *
 * Devuelve errores tipados con el campo inválido para que el handler construya
 * respuestas 400 informativas. Nunca lanza excepciones: todas las rutas de
 * error devuelven un objeto estructurado.
 *
 * Requisitos: 16.2-16.4, 17.2-17.4
 */

import {
  isContradictionId,
  isSuspectId,
  isStatementId,
  type ContradictionId,
  type InterrogationRequest,
  type InterrogationResponse,
  type SuspectId,
} from './types';
import { SUSPECT_PROFILES } from './gameData';

/** Límite de tamaño de cuerpo en bytes (8 KB). */
export const MAX_BODY_BYTES = 8_192;

/** Longitud máxima de la pregunta en caracteres. */
export const MAX_QUESTION_LENGTH = 300;

/** Longitud máxima del texto de la respuesta en caracteres. */
export const MAX_RESPONSE_TEXT_LENGTH = 500;

/** Resultado de una validación fallida con el campo responsable identificado. */
export interface ValidationError {
  field: string;
  message: string;
}

export type RequestValidationResult =
  | { valid: true; request: InterrogationRequest }
  | { valid: false; error: ValidationError };

/**
 * Valida el tamaño del cuerpo en bytes antes de intentar parsearlo como JSON.
 * Devuelve error si supera MAX_BODY_BYTES.
 */
export function validateBodySize(rawBody: string): ValidationError | null {
  const bytes = Buffer.byteLength(rawBody, 'utf8');
  if (bytes > MAX_BODY_BYTES) {
    return { field: 'body', message: `El cuerpo supera el límite de ${MAX_BODY_BYTES} bytes` };
  }
  return null;
}

/**
 * Parsea y valida el cuerpo de la solicitud.
 * Devuelve el request tipado o un error con el campo inválido.
 */
export function validateRequest(rawBody: string): RequestValidationResult {
  // Validar tamaño primero
  const sizeError = validateBodySize(rawBody);
  if (sizeError !== null) {
    return { valid: false, error: sizeError };
  }

  // Parsear JSON
  let parsed: unknown;
  try {
    parsed = JSON.parse(rawBody) as unknown;
  } catch {
    return { valid: false, error: { field: 'body', message: 'El cuerpo no es JSON válido' } };
  }

  if (typeof parsed !== 'object' || parsed === null || Array.isArray(parsed)) {
    return { valid: false, error: { field: 'body', message: 'El cuerpo debe ser un objeto JSON' } };
  }

  const body = parsed as Record<string, unknown>;

  // Validar suspectId
  if (!('suspectId' in body)) {
    return { valid: false, error: { field: 'suspectId', message: 'Campo requerido' } };
  }
  if (!isSuspectId(body['suspectId'])) {
    return {
      valid: false,
      error: { field: 'suspectId', message: 'Sospechoso desconocido' },
    };
  }

  // Validar question
  if (!('question' in body)) {
    return { valid: false, error: { field: 'question', message: 'Campo requerido' } };
  }
  if (typeof body['question'] !== 'string') {
    return { valid: false, error: { field: 'question', message: 'Debe ser una cadena de texto' } };
  }
  if (body['question'].length === 0) {
    return { valid: false, error: { field: 'question', message: 'La pregunta no puede estar vacía' } };
  }
  if (body['question'].length > MAX_QUESTION_LENGTH) {
    return {
      valid: false,
      error: {
        field: 'question',
        message: `La pregunta supera los ${MAX_QUESTION_LENGTH} caracteres`,
      },
    };
  }

  // Validar gameContext
  if (!('gameContext' in body)) {
    return { valid: false, error: { field: 'gameContext', message: 'Campo requerido' } };
  }
  const ctx = body['gameContext'];
  if (typeof ctx !== 'object' || ctx === null || Array.isArray(ctx)) {
    return { valid: false, error: { field: 'gameContext', message: 'Debe ser un objeto' } };
  }
  const context = ctx as Record<string, unknown>;

  // Validar discoveredContradictionIds
  if (!('discoveredContradictionIds' in context)) {
    return {
      valid: false,
      error: { field: 'gameContext.discoveredContradictionIds', message: 'Campo requerido' },
    };
  }
  if (!Array.isArray(context['discoveredContradictionIds'])) {
    return {
      valid: false,
      error: { field: 'gameContext.discoveredContradictionIds', message: 'Debe ser un array' },
    };
  }
  const ids: unknown[] = context['discoveredContradictionIds'] as unknown[];
  for (const id of ids) {
    if (!isContradictionId(id)) {
      return {
        valid: false,
        error: {
          field: 'gameContext.discoveredContradictionIds',
          message: `ID de contradicción desconocido: ${String(id)}`,
        },
      };
    }
  }

  // Validar suspectPressure
  if (!('suspectPressure' in context)) {
    return {
      valid: false,
      error: { field: 'gameContext.suspectPressure', message: 'Campo requerido' },
    };
  }
  const pressure = context['suspectPressure'];
  if (typeof pressure !== 'number') {
    return {
      valid: false,
      error: { field: 'gameContext.suspectPressure', message: 'Debe ser un número' },
    };
  }
  if (!Number.isFinite(pressure)) {
    return {
      valid: false,
      error: { field: 'gameContext.suspectPressure', message: 'Debe ser un número finito' },
    };
  }
  if (pressure < 0) {
    return {
      valid: false,
      error: { field: 'gameContext.suspectPressure', message: 'No puede ser negativo' },
    };
  }

  return {
    valid: true,
    request: {
      suspectId: body['suspectId'] as SuspectId,
      question: body['question'] as string,
      gameContext: {
        discoveredContradictionIds: ids as ContradictionId[],
        suspectPressure: pressure,
      },
    },
  };
}

/**
 * Valida que la respuesta de Bedrock cumpla el contrato completo.
 *
 * Descarte completo: cualquier incumplimiento devuelve false.
 * - JSON inválido ya debería estar parseado antes de llamar a esta función
 * - Texto no vacío y ≤ 500 caracteres
 * - statementId null o perteneciente exclusivamente al sospechoso solicitado
 * - Sin campos extra incompatibles con el contrato (solo text y statementId)
 */
export function validateResponse(
  raw: unknown,
  suspectId: SuspectId,
): raw is InterrogationResponse {
  if (typeof raw !== 'object' || raw === null || Array.isArray(raw)) {
    return false;
  }

  const obj = raw as Record<string, unknown>;

  // Verificar campos extra: solo se permiten text y statementId
  const allowedKeys = new Set(['text', 'statementId']);
  for (const key of Object.keys(obj)) {
    if (!allowedKeys.has(key)) {
      return false;
    }
  }

  // Validar text
  if (typeof obj['text'] !== 'string') {
    return false;
  }
  if (obj['text'].length === 0) {
    return false;
  }
  if (obj['text'].length > MAX_RESPONSE_TEXT_LENGTH) {
    return false;
  }

  // Validar statementId
  const sid = obj['statementId'];
  if (sid !== null) {
    if (!isStatementId(sid)) {
      return false;
    }
    // Verificar que el statementId pertenezca al sospechoso solicitado
    const profile = SUSPECT_PROFILES[suspectId];
    if (!profile.allowedStatementIds.includes(sid)) {
      return false;
    }
  }

  return true;
}
