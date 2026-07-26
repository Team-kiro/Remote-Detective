/**
 * Pruebas mínimas del servicio de interrogación remota (tarea 3.4): URL del
 * contrato, cuerpo permitido y cancelación por timeout.
 *
 * Requisitos: 16.1, 16.4-16.6
 */

import { afterEach, describe, expect, it, vi } from 'vitest';
import {
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
    });
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
