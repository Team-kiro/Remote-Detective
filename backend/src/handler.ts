/**
 * Lambda handler del endpoint POST /interrogate.
 *
 * Flujo:
 *   1. Rechazo 403 de orígenes presentes fuera de la lista permitida.
 *   2. Gestión del preflight OPTIONS con cabeceras CORS.
 *   3. Validación de tamaño y campos del cuerpo → 400 con campo inválido.
 *   4. Construcción del prompt por sospechoso.
 *   5. Invocación de Bedrock con timeout de 10 s → 504 al agotar, 502 ante error
 *      del proveedor (sin detalles internos).
 *   6. Validación de la respuesta del modelo → descarte completo si no cumple
 *      el contrato; nunca se devuelve texto parcial.
 *   7. Respuesta 200 con el objeto InterrogationResponse.
 *
 * Requisitos: 15.7, 16.1-16.6, 17.1-17.7
 */

import type { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
import { getAllowedOrigins, buildCorsHeaders, isOriginAllowed } from './cors';
import { validateRequest, validateResponse } from './validator';
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
  // API Gateway puede entregar `headers` nulo en invocaciones sin cabeceras.
  const headers: Record<string, string | undefined> = event.headers ?? {};
  const origin = headers['origin'] ?? headers['Origin'];
  const allowedOrigins = getAllowedOrigins();
  const corsHeaders = buildCorsHeaders(origin, allowedOrigins);

  // Un origen presente y no permitido se rechaza antes de gastar una invocación
  // de Bedrock. La ausencia de `Origin` (clientes no navegador) no se bloquea.
  if (origin !== undefined && !isOriginAllowed(origin, allowedOrigins)) {
    return jsonResult(403, { error: 'Origen no permitido' });
  }

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
