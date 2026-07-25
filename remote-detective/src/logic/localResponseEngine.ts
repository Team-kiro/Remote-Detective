import { LOCAL_RESPONSES } from '@/data/localResponses';
import type { LocalResponseDef, SuspectId } from '@/data/types';

/**
 * Motor local de respuestas: función pura y determinista.
 *
 * No importa React, Zustand ni el servicio de Bedrock, y no modifica score,
 * presión, contradicciones ni estado de partida. Solo selecciona qué respuesta
 * del catálogo congelado corresponde a la pregunta del jugador.
 *
 * Requisitos: 6.3-6.4, 7.1-7.8, 11.6, 14.3
 */

/** Límite de caracteres aceptado para una pregunta del jugador. */
export const MAX_QUESTION_LENGTH = 300;

/** Longitud mínima para admitir coincidencia por prefijo inverso (plurales). */
const MIN_STEM_LENGTH = 4;

/**
 * Normaliza la entrada del jugador: minúsculas, sin diacríticos, sin
 * puntuación, con espacios colapsados y recortados.
 *
 * Devuelve `''` cuando la entrada está vacía, contiene solo espacios o excede
 * {@link MAX_QUESTION_LENGTH} caracteres; ese valor nunca produce coincidencia.
 */
export function normalizeInput(input: string): string {
  if (input.length === 0 || input.length > MAX_QUESTION_LENGTH) {
    return '';
  }

  return input
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^\p{L}\p{N}\s]/gu, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Comprueba si un término del catálogo coincide con algún token de la entrada.
 *
 * La coincidencia es por token para no confundir palabras distintas que
 * comparten sufijo (`hora` no coincide con `ahora`) y tolera variantes
 * morfológicas simples por prefijo (`quimica` coincide con `quimicas`).
 */
function termMatches(term: string, tokens: readonly string[]): boolean {
  if (term.length === 0) {
    return false;
  }

  return tokens.some((token) => {
    if (token === term) {
      return true;
    }
    if (token.startsWith(term)) {
      return true;
    }
    return (
      token.length >= MIN_STEM_LENGTH &&
      term.length >= MIN_STEM_LENGTH &&
      term.startsWith(token)
    );
  });
}

/** Un grupo coincide solo si todos sus términos están presentes. */
function groupMatches(group: readonly string[], tokens: readonly string[]): boolean {
  return group.length > 0 && group.every((term) => termMatches(term, tokens));
}

/**
 * Tamaño del grupo coincidente más específico (más términos) de una respuesta,
 * o `0` si ningún grupo coincide.
 */
function bestMatchingGroupSize(
  response: LocalResponseDef,
  tokens: readonly string[],
): number {
  let bestSize = 0;

  for (const group of response.keywordGroups) {
    if (groupMatches(group, tokens) && group.length > bestSize) {
      bestSize = group.length;
    }
  }

  return bestSize;
}

/**
 * Busca la mejor respuesta específica del sospechoso para una entrada ya
 * normalizada.
 *
 * Solo participan respuestas del mismo sospechoso con `isGeneric === false`.
 * Todos los términos de un grupo deben coincidir y basta un grupo. Ante varias
 * candidatas gana el grupo más específico (más términos) y, en empate, la mayor
 * `priority`; si el empate persiste se conserva el orden del catálogo.
 * Devuelve `null` cuando no hay ninguna coincidencia.
 */
export function findBestResponse(
  suspectId: SuspectId,
  normalizedInput: string,
  responses: readonly LocalResponseDef[] = LOCAL_RESPONSES,
): LocalResponseDef | null {
  if (normalizedInput.length === 0) {
    return null;
  }

  const tokens = normalizedInput.split(' ').filter((token) => token.length > 0);
  if (tokens.length === 0) {
    return null;
  }

  let best: LocalResponseDef | null = null;
  let bestSize = 0;

  for (const response of responses) {
    if (response.suspectId !== suspectId || response.isGeneric) {
      continue;
    }

    const size = bestMatchingGroupSize(response, tokens);
    if (size === 0) {
      continue;
    }

    if (
      best === null ||
      size > bestSize ||
      (size === bestSize && response.priority > best.priority)
    ) {
      best = response;
      bestSize = size;
    }
  }

  return best;
}

/**
 * Resuelve la respuesta local del sospechoso para la pregunta cruda.
 *
 * Normaliza, intenta la coincidencia específica y, si no hay ninguna, devuelve
 * la única respuesta genérica estable del sospechoso. Siempre retorna un
 * `LocalResponseDef`.
 */
export function getLocalResponse(
  suspectId: SuspectId,
  rawInput: string,
  responses: readonly LocalResponseDef[] = LOCAL_RESPONSES,
): LocalResponseDef {
  const specific = findBestResponse(suspectId, normalizeInput(rawInput), responses);
  if (specific !== null) {
    return specific;
  }

  const generic = responses.find(
    (response) => response.suspectId === suspectId && response.isGeneric,
  );
  if (generic !== undefined) {
    return generic;
  }

  throw new Error(
    `El catálogo local no contiene respuesta genérica para el sospechoso ${suspectId}.`,
  );
}
