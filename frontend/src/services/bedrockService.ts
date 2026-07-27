/**
 * Servicio de interrogación remota (Amazon Bedrock vía API Gateway).
 *
 * Módulo aislado: no importa React, Zustand ni datos de partida. Solo traduce
 * una `InterrogationRequest` al contrato `POST /interrogate`, aplica timeout
 * mediante `AbortController` y devuelve la carga cruda como `unknown`. La
 * validación del contrato y el fallback local son responsabilidad del store:
 * este servicio nunca decide reglas de juego.
 *
 * Requisitos: 16.1-16.6, 14.4
 */

import type { AppConfig } from '@/config';
import type { InterrogationRequest, InterrogationTurn } from '@/data/types';

/** Ruta del contrato aprobado. */
export const INTERROGATE_PATH = '/interrogate';

/**
 * Turnos previos que viajan al backend. El límite mantiene el cuerpo dentro de
 * los 8 KB que acepta el endpoint sin recortar la memoria útil de la llamada.
 */
export const MAX_HISTORY_TURNS = 8;

/** Longitud máxima del texto de cada turno del historial. */
export const MAX_HISTORY_TURN_LENGTH = 500;

/**
 * Permite al store conservar el controlador de la solicitud en curso para
 * cancelarla al iniciar/terminar una llamada, reiniciar o finalizar la partida.
 */
export type PendingRequestRegistrar = (controller: AbortController) => void;

/** Construye la URL del endpoint sin duplicar la ruta ni barras finales. */
export function buildInterrogateUrl(apiUrl: string): string {
  const base = apiUrl.trim().replace(/\/+$/, '');

  return base.endsWith(INTERROGATE_PATH) ? base : `${base}${INTERROGATE_PATH}`;
}

/**
 * Cuerpo permitido de la solicitud: identificador del sospechoso, pregunta y
 * contexto mínimo. Ningún otro dato del estado interno viaja al backend.
 */
export function buildInterrogationRequestBody(
  request: InterrogationRequest,
): InterrogationRequest {
  const rawPressure = request.gameContext.suspectPressure;
  const suspectPressure = Number.isFinite(rawPressure) ? Math.max(0, rawPressure) : 0;

  const conversationHistory: InterrogationTurn[] = (request.conversationHistory ?? [])
    .slice(-MAX_HISTORY_TURNS)
    .map((turn) => ({ role: turn.role, text: turn.text.slice(0, MAX_HISTORY_TURN_LENGTH) }));

  return {
    suspectId: request.suspectId,
    question: request.question,
    gameContext: {
      discoveredContradictionIds: [...request.gameContext.discoveredContradictionIds],
      suspectPressure,
    },
    conversationHistory,
  };
}

/**
 * Envía la pregunta al endpoint configurado y devuelve la respuesta sin
 * interpretar.
 *
 * Rechaza si no hay endpoint, si la red o el backend fallan, si se supera
 * `config.requestTimeoutMs` o si el cuerpo no es JSON. Cualquier rechazo hace
 * que el store descarte íntegramente la respuesta remota y use la candidata
 * local.
 */
export async function fetchBedrockResponse(
  request: InterrogationRequest,
  appConfig: AppConfig,
  registerController?: PendingRequestRegistrar,
): Promise<unknown> {
  const apiUrl = appConfig.apiUrl;
  if (apiUrl === null) {
    throw new Error('Interrogación remota sin endpoint configurado.');
  }

  const controller = new AbortController();
  registerController?.(controller);

  const timeoutId = setTimeout(() => {
    controller.abort(new Error('Interrogación remota expirada.'));
  }, appConfig.requestTimeoutMs);

  try {
    const response = await fetch(buildInterrogateUrl(apiUrl), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(buildInterrogationRequestBody(request)),
      signal: controller.signal,
    });

    if (!response.ok) {
      throw new Error(`Interrogación remota rechazada con estado ${String(response.status)}.`);
    }

    return (await response.json()) as unknown;
  } finally {
    clearTimeout(timeoutId);
  }
}
