/**
 * Cliente de Amazon Bedrock para el endpoint de interrogación.
 *
 * Invoca el modelo configurado por BEDROCK_MODEL_ID con un timeout de 10
 * segundos. Los errores del proveedor se propagan como BedrockError para que
 * el handler los mapee a 502 sin filtrar detalles internos.
 *
 * BEDROCK_MODEL_ID debe ser un perfil de inferencia entre regiones (prefijo
 * "us."): los Claude actuales rechazan la invocación por ID de modelo directo
 * con throughput bajo demanda, y los antiguos están marcados como legacy y
 * niegan el acceso.
 *
 * Requisitos: 16.1, 17.3, 17.5
 */

import {
  BedrockRuntimeClient,
  InvokeModelCommand,
  type InvokeModelCommandInput,
} from '@aws-sdk/client-bedrock-runtime';

/** Timeout de Bedrock en milisegundos. */
export const BEDROCK_TIMEOUT_MS = 10_000;

/** Error que distingue un fallo del proveedor de un timeout. */
export class BedrockProviderError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'BedrockProviderError';
  }
}

/** Error que indica que Bedrock no respondió dentro del timeout. */
export class BedrockTimeoutError extends Error {
  constructor() {
    super('Bedrock no respondió dentro del límite de tiempo');
    this.name = 'BedrockTimeoutError';
  }
}

/** Respuesta cruda del modelo Anthropic Claude en Bedrock. */
interface ClaudeResponse {
  content: Array<{ type: string; text: string }>;
}

/** Mensaje del formato de conversación de Anthropic. */
interface ClaudeMessage {
  role: 'user' | 'assistant';
  content: string;
}

/**
 * Convierte los turnos previos de la llamada en mensajes válidos para Claude,
 * que exige empezar por `user` y alternar roles. El historial real puede
 * romper ambas reglas (una respuesta descartada por obsoleta deja una pregunta
 * sin réplica), así que se descarta el prefijo `assistant` y se fusionan los
 * turnos consecutivos del mismo rol.
 */
export function buildConversationMessages(
  history: readonly { role: 'player' | 'suspect'; text: string }[],
  question: string,
): ClaudeMessage[] {
  const messages: ClaudeMessage[] = [];

  for (const turn of history) {
    const role: ClaudeMessage['role'] = turn.role === 'player' ? 'user' : 'assistant';
    if (messages.length === 0 && role === 'assistant') {
      continue;
    }
    const last = messages[messages.length - 1];
    if (last !== undefined && last.role === role) {
      last.content = `${last.content}\n${turn.text}`;
      continue;
    }
    messages.push({ role, content: turn.text });
  }

  const last = messages[messages.length - 1];
  if (last !== undefined && last.role === 'user') {
    last.content = `${last.content}\n${question}`;
  } else {
    messages.push({ role: 'user', content: question });
  }

  return messages;
}

/**
 * Invoca el modelo Bedrock y devuelve el texto generado como string.
 * Lanza BedrockTimeoutError si supera BEDROCK_TIMEOUT_MS.
 * Lanza BedrockProviderError ante cualquier otro fallo del proveedor.
 */
export async function invokeBedrock(
  systemPrompt: string,
  userMessage: string,
  history: readonly { role: 'player' | 'suspect'; text: string }[] = [],
  modelId: string = process.env['BEDROCK_MODEL_ID'] ??
    'us.anthropic.claude-haiku-4-5-20251001-v1:0',
  region: string = process.env['AWS_REGION'] ?? 'us-east-1',
): Promise<string> {
  const client = new BedrockRuntimeClient({ region });

  const requestBody = {
    anthropic_version: 'bedrock-2023-05-31',
    max_tokens: 1_024,
    system: systemPrompt,
    messages: buildConversationMessages(history, userMessage),
  };

  const input: InvokeModelCommandInput = {
    modelId,
    contentType: 'application/json',
    accept: 'application/json',
    body: JSON.stringify(requestBody),
  };

  let timeoutId: ReturnType<typeof setTimeout> | undefined;
  const timeoutPromise = new Promise<never>((_, reject) => {
    timeoutId = setTimeout(() => {
      reject(new BedrockTimeoutError());
    }, BEDROCK_TIMEOUT_MS);
  });

  let rawBody: Uint8Array;
  try {
    const command = new InvokeModelCommand(input);
    const result = await Promise.race([client.send(command), timeoutPromise]);
    rawBody = result.body as Uint8Array;
  } catch (err) {
    if (err instanceof BedrockTimeoutError) {
      throw err;
    }
    throw new BedrockProviderError(
      err instanceof Error ? err.message : 'Error desconocido del proveedor',
    );
  } finally {
    // Sin esto el temporizador mantiene vivo el event loop de Lambda hasta 10 s
    // después de cada invocación correcta, facturando tiempo inactivo.
    clearTimeout(timeoutId);
  }

  const responseText = new TextDecoder().decode(rawBody);
  let parsed: unknown;
  try {
    parsed = JSON.parse(responseText) as unknown;
  } catch {
    throw new BedrockProviderError('La respuesta de Bedrock no es JSON válido');
  }

  const claudeResponse = parsed as ClaudeResponse;
  const textContent = claudeResponse.content?.find((c) => c.type === 'text');
  if (!textContent?.text) {
    throw new BedrockProviderError('La respuesta de Bedrock no contiene texto');
  }

  return textContent.text;
}
