/**
 * Pruebas del cliente Bedrock. Grupo (g): contrato backend — tarea 6.4.
 *
 * El handler solo puede devolver 504 si el propio cliente distingue el timeout
 * de un fallo del proveedor, así que la carrera de 10 s se prueba aquí con
 * temporizadores falsos en lugar de esperar en tiempo real.
 *
 * Requisitos: 16.1, 17.3, 17.5
 */

const mockSend = jest.fn();

jest.mock('@aws-sdk/client-bedrock-runtime', () => ({
  BedrockRuntimeClient: jest.fn(() => ({ send: mockSend })),
  InvokeModelCommand: jest.fn(),
}));

import {
  invokeBedrock,
  BedrockProviderError,
  BedrockTimeoutError,
  BEDROCK_TIMEOUT_MS,
} from '../bedrockClient';

/** Cuerpo con el formato que devuelve Claude en Bedrock. */
function claudeBody(text: string): { body: Uint8Array } {
  return {
    body: new TextEncoder().encode(JSON.stringify({ content: [{ type: 'text', text }] })),
  };
}

beforeEach(() => {
  mockSend.mockReset();
});

afterEach(() => {
  jest.useRealTimers();
});

describe('invokeBedrock', () => {
  it('devuelve el texto generado cuando el modelo responde a tiempo', async () => {
    mockSend.mockResolvedValue(claudeBody('{"text":"Hola","statementId":null}'));

    await expect(invokeBedrock('sistema', 'pregunta')).resolves.toBe(
      '{"text":"Hola","statementId":null}',
    );
  });

  it('lanza BedrockTimeoutError cuando el modelo tarda más de 10 s', async () => {
    jest.useFakeTimers();
    mockSend.mockReturnValue(new Promise(() => {/* nunca resuelve */}));

    const pending = invokeBedrock('sistema', 'pregunta');
    jest.advanceTimersByTime(BEDROCK_TIMEOUT_MS + 1);

    await expect(pending).rejects.toBeInstanceOf(BedrockTimeoutError);
  });

  it('no deja el temporizador activo tras una respuesta correcta', async () => {
    jest.useFakeTimers();
    mockSend.mockResolvedValue(claudeBody('ok'));

    await invokeBedrock('sistema', 'pregunta');

    expect(jest.getTimerCount()).toBe(0);
  });

  it('convierte un fallo del proveedor en BedrockProviderError', async () => {
    mockSend.mockRejectedValue(new Error('ThrottlingException'));

    await expect(invokeBedrock('sistema', 'pregunta')).rejects.toBeInstanceOf(
      BedrockProviderError,
    );
  });

  it('lanza BedrockProviderError si la respuesta no es JSON válido', async () => {
    mockSend.mockResolvedValue({ body: new TextEncoder().encode('no-json') });

    await expect(invokeBedrock('sistema', 'pregunta')).rejects.toBeInstanceOf(
      BedrockProviderError,
    );
  });

  it('lanza BedrockProviderError si la respuesta no contiene texto', async () => {
    mockSend.mockResolvedValue({ body: new TextEncoder().encode(JSON.stringify({ content: [] })) });

    await expect(invokeBedrock('sistema', 'pregunta')).rejects.toBeInstanceOf(
      BedrockProviderError,
    );
  });
});
