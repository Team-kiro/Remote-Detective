/**
 * Lambda handler del endpoint POST /interrogate.
 *
 * Flujo:
 *   1. Gestión del preflight OPTIONS con cabeceras CORS.
 *   2. Validación de tamaño y campos del cuerpo → 400 con campo inválido.
 *   3. Construcción del prompt por sospechoso.
 *   4. Invocación de Bedrock con timeout de 10 s → 504 al agotar, 502 ante error
 *      del proveedor (sin detalles internos).
 *   5. Validación de la respuesta del modelo → descarte completo si no cumple
 *      el contrato; nunca se devuelve texto parcial.
 *   6. Respuesta 200 con el objeto InterrogationResponse.
 *
 * Requisitos: 15.7, 16.1-16.6, 17.1-17.7
 */

import type { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
import { getAllowedOrigins, buildCorsHeaders } from './cors';
import { validateRequest } from './validator';
import { validateResponse } from './validator';
import { buildPromptForSuspect } from './promptBuilder';
import { invokeBedrock, BedrockTimeoutError } from './bedrockClient';

function jsonResult(
  statusCode: number,
  body: unknown,
  extraHeaders: Record<string, string> = {},
): APIGatewayProxyResult {
  return {
    statusCode,
    headers: {
      'Content-Type': 'application/json',
      ...extraHeaders,
    },
    body: JSON.stringify(body),
  };
}

export const handler = async (event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> => {
  const origin = event.headers['origin'] ?? event.headers['Origin'];
  const allowedOrigins = getAllowedOrigins();
  const corsHeaders = buildCorsHeaders(origin, allowedOrigins);

  // Responder preflight OPTIONS
  if (event.httpMethod === 'OPTIONS') {
    return {
      statusCode: 200,
      headers: {
        'Content-Type': 'application/json',
        ...corsHeaders,
      },
      body: '',
    };
  }

  // Validar cuerpo de la solicitud
  const rawBody = event.body ?? '';
  const validation = validateRequest(rawBody);
  if (!validation.valid) {
    return jsonResult(400, { error: 'Solicitud inválida', ...validation.error }, corsHeaders);
  }

  const { request } = validation;
  const systemPrompt = buildPromptForSuspect(request.suspectId, request.gameContext);

  // Invocar Bedrock
  let modelText: string;
  try {
    modelText = await invokeBedrock(systemPrompt, request.question);
  } catch (err) {
    if (err instanceof BedrockTimeoutError) {
      return jsonResult(504, { error: 'Tiempo de respuesta agotado' }, corsHeaders);
    }
    // BedrockProviderError u otro: 502 sin detalles internos
    return jsonResult(502, { error: 'Error del proveedor de IA' }, corsHeaders);
  }

  // Parsear y validar la respuesta del modelo
  let parsedResponse: unknown;
  try {
    parsedResponse = JSON.parse(modelText) as unknown;
  } catch {
    // JSON inválido → descarte completo; el frontend usará la respuesta local
    return jsonResult(502, { error: 'Respuesta del modelo inválida' }, corsHeaders);
  }

  if (!validateResponse(parsedResponse, request.suspectId)) {
    // Respuesta fuera de contrato → descarte completo
    return jsonResult(502, { error: 'Respuesta del modelo fuera de contrato' }, corsHeaders);
  }

  return jsonResult(200, parsedResponse, corsHeaders);
};
