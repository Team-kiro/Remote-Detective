/**
 * Pruebas mínimas del servicio de interrogación remota (tarea 3.4): URL del
 * contrato, cuerpo permitido y cancelación por timeout.
 *
 * Requisitos: 16.1, 16.4-16.6
 */

import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  MAX_BODY_BYTES,
  MAX_HISTORY_TURNS,
  MAX_HISTORY_TURN_LENGTH,
  buildInterrogateUrl,
  buildInterrogationRequestBody,
  fetchBedrockResponse,
} from '@/services/bedrockService';
import type { AppConfig } from '@/config';
import type { InterrogationRequest } from '@/data/types';

const REQUEST: InterrogationRequest = {
  suspectId: 'daniel',
  question: '¿A qué hora llegaste?',
  gameContext: { discoveredContradictionIds: ['contra_daniel_access'], suspectPressure: 3 },
};

function createConfig(overrides: Partial<AppConfig> = {}): AppConfig {
  return {
    apiUrl: 'https://example.invalid/prod',
    interrogationMode: 'bedrock',
    timerDurationMs: 720_000,
    requestTimeoutMs: 10,
    ...overrides,
  };
}

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('bedrockService', () => {
  it('construye la ruta del contrato sin duplicarla', () => {
    expect(buildInterrogateUrl('https://example.invalid/prod')).toBe(
      'https://example.invalid/prod/interrogate',
    );
    expect(buildInterrogateUrl('https://example.invalid/prod/')).toBe(
      'https://example.invalid/prod/interrogate',
    );
    expect(buildInterrogateUrl('https://example.invalid/prod/interrogate')).toBe(
      'https://example.invalid/prod/interrogate',
    );
  });

  it('envía únicamente los campos permitidos del contrato', () => {
    expect(buildInterrogationRequestBody(REQUEST)).toEqual({
      suspectId: 'daniel',
      question: '¿A qué hora llegaste?',
      gameContext: { discoveredContradictionIds: ['contra_daniel_access'], suspectPressure: 3 },
      conversationHistory: [],
    });
  });

  it('recorta el historial a los últimos turnos y a 500 caracteres por turno', () => {
    const body = buildInterrogationRequestBody({
      ...REQUEST,
      conversationHistory: Array.from({ length: MAX_HISTORY_TURNS + 3 }, (_, i) => ({
        role: i % 2 === 0 ? ('player' as const) : ('suspect' as const),
        text: `t${String(i)}-${'x'.repeat(600)}`,
      })),
    });

    expect(body.conversationHistory).toHaveLength(MAX_HISTORY_TURNS);
    expect(body.conversationHistory?.[0]?.text).toHaveLength(MAX_HISTORY_TURN_LENGTH);
    // Se conservan los más recientes, no los primeros: el último turno enviado
    // es el índice 10 de los 11 generados.
    expect(body.conversationHistory?.[MAX_HISTORY_TURNS - 1]?.text.startsWith('t10-')).toBe(true);
  });

  it('suelta los turnos más antiguos hasta que el cuerpo cabe en bytes', () => {
    // 8 turnos de 500 caracteres acentuados pesan el doble en UTF-8 y superarían
    // el límite del endpoint, que responde 400 y anula la respuesta remota.
    const body = buildInterrogationRequestBody({
      ...REQUEST,
      conversationHistory: Array.from({ length: MAX_HISTORY_TURNS }, (_, i) => ({
        role: i % 2 === 0 ? ('player' as const) : ('suspect' as const),
        text: 'á'.repeat(MAX_HISTORY_TURN_LENGTH),
      })),
    });

    const bytes = new TextEncoder().encode(JSON.stringify(body)).length;
    expect(bytes).toBeLessThanOrEqual(MAX_BODY_BYTES);
    expect(body.conversationHistory?.length).toBeGreaterThan(0);
    expect(body.conversationHistory?.length).toBeLessThan(MAX_HISTORY_TURNS);
  });

  it('normaliza una presión no finita o negativa a cero', () => {
    const body = buildInterrogationRequestBody({
      ...REQUEST,
      gameContext: { discoveredContradictionIds: [], suspectPressure: Number.NaN },
    });

    expect(body.gameContext.suspectPressure).toBe(0);
  });

  it('rechaza cuando no hay endpoint configurado', async () => {
    await expect(
      fetchBedrockResponse(REQUEST, createConfig({ apiUrl: null })),
    ).rejects.toThrow();
  });

  it('registra el controlador y aborta al superar el timeout', async () => {
    const controllers: AbortController[] = [];
    vi.stubGlobal(
      'fetch',
      vi.fn(
        (_url: string, init?: RequestInit) =>
          new Promise<Response>((_resolve, reject) => {
            init?.signal?.addEventListener('abort', () => {
              reject(new Error('abortada'));
            });
          }),
      ),
    );

    await expect(
      fetchBedrockResponse(REQUEST, createConfig(), (controller) => {
        controllers.push(controller);
      }),
    ).rejects.toThrow();
    expect(controllers).toHaveLength(1);
    expect(controllers[0]?.signal.aborted).toBe(true);
  });

  it('propaga un fallo cuando el backend responde con error', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(() => Promise.resolve(new Response('{}', { status: 502 }))),
    );

    await expect(fetchBedrockResponse(REQUEST, createConfig())).rejects.toThrow();
  });
});
