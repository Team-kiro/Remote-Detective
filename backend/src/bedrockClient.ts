/**
 * Cliente de Amazon Bedrock para el endpoint de interrogación.
 *
 * Invoca el modelo configurado por BEDROCK_MODEL_ID con un timeout de 10
 * segundos. Los errores del proveedor se propagan como BedrockError para que
 * el handler los mapee a 502 sin filtrar detalles internos.
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

/**
 * Invoca el modelo Bedrock y devuelve el texto generado como string.
 * Lanza BedrockTimeoutError si supera BEDROCK_TIMEOUT_MS.
 * Lanza BedrockProviderError ante cualquier otro fallo del proveedor.
 */
export async function invokeBedrock(
  systemPrompt: string,
  userMessage: string,
  modelId: string = process.env['BEDROCK_MODEL_ID'] ?? 'anthropic.claude-3-haiku-20240307-v1:0',
  region: string = process.env['AWS_REGION'] ?? 'us-east-1',
): Promise<string> {
  const client = new BedrockRuntimeClient({ region });

  const requestBody = {
    anthropic_version: 'bedrock-2023-05-31',
    max_tokens: 1_024,
    system: systemPrompt,
    messages: [{ role: 'user', content: userMessage }],
  };

  const input: InvokeModelCommandInput = {
    modelId,
    contentType: 'application/json',
    accept: 'application/json',
    body: JSON.stringify(requestBody),
  };

  const timeoutPromise = new Promise<never>((_, reject) => {
    setTimeout(() => {
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
