/**
 * Pruebas de integración del handler Lambda de POST /interrogate.
 * Grupo (g): contrato backend — tarea 6.4.
 *
 * Verifica el flujo completo del handler mediante mocks de bedrockClient:
 * - Request válido con respuesta Bedrock correcta → 200
 * - Timeout de Bedrock (> 10 s) → 504
 * - Error del proveedor Bedrock → 502 sin detalles internos
 * - Requests inválidos → 400 con campo identificado
 * - Respuesta del modelo fuera de contrato → 502 (descarte completo)
 * - Preflight OPTIONS → 200 con cabeceras CORS
 * - Origen permitido recibe cabeceras CORS; origen no permitido no las recibe
 *
 * Requisitos: 15.7, 16.1-16.6, 17.1-17.7
 */

import type { APIGatewayProxyEvent } from 'aws-lambda';
import { BedrockTimeoutError, BedrockProviderError } from '../bedrockClient';

// Mock solo la función invokeBedrock; las clases de error se importan normalmente
jest.mock('../bedrockClient', () => ({
  ...jest.requireActual<typeof import('../bedrockClient')>('../bedrockClient'),
  invokeBedrock: jest.fn(),
}));

import { handler } from '../handler';
import { invokeBedrock } from '../bedrockClient';

const mockInvokeBedrock = invokeBedrock as jest.MockedFunction<typeof invokeBedrock>;

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Construye un evento APIGateway mínimo para POST /interrogate. */
function buildEvent(
  body: unknown,
  origin = 'http://localhost:5173',
  method = 'POST',
): APIGatewayProxyEvent {
  return {
    httpMethod: method,
    path: '/interrogate',
    headers: { origin },
    multiValueHeaders: {},
    queryStringParameters: null,
    multiValueQueryStringParameters: null,
    pathParameters: null,
    stageVariables: null,
    requestContext: {} as APIGatewayProxyEvent['requestContext'],
    resource: '/interrogate',
    isBase64Encoded: false,
    body: body !== null ? JSON.stringify(body) : null,
  };
}

const VALID_REQUEST_BODY = {
  suspectId: 'daniel',
  question: '¿A qué hora llegaste?',
  gameContext: {
    discoveredContradictionIds: ['contra_daniel_access'],
    suspectPressure: 10,
  },
};

const VALID_MODEL_RESPONSE = JSON.stringify({
  text: 'Llegué al edificio a las 20:50 junto con Roberto.',
  statementId: 'stmt_daniel_arrival',
});

// ---------------------------------------------------------------------------
// Setup
// ---------------------------------------------------------------------------

beforeEach(() => {
  jest.resetAllMocks();
  process.env['ALLOWED_ORIGINS'] = 'http://localhost:5173,https://frontend.example.com';
});

afterEach(() => {
  delete process.env['ALLOWED_ORIGINS'];
});

// ---------------------------------------------------------------------------
// Request válido → 200
// ---------------------------------------------------------------------------

describe('handler — request válido', () => {
  it('devuelve 200 con la respuesta del modelo cuando todo es correcto', async () => {
    mockInvokeBedrock.mockResolvedValue(VALID_MODEL_RESPONSE);

    const result = await handler(buildEvent(VALID_REQUEST_BODY));

    expect(result.statusCode).toBe(200);
    const parsed = JSON.parse(result.body) as { text: string; statementId: string | null };
    expect(parsed.text).toBe('Llegué al edificio a las 20:50 junto con Roberto.');
    expect(parsed.statementId).toBe('stmt_daniel_arrival');
  });

  it('incluye cabeceras CORS cuando el origen está permitido', async () => {
    mockInvokeBedrock.mockResolvedValue(VALID_MODEL_RESPONSE);

    const result = await handler(buildEvent(VALID_REQUEST_BODY, 'http://localhost:5173'));

    expect(result.headers?.['Access-Control-Allow-Origin']).toBe('http://localhost:5173');
  });

  it('rechaza con 403 y sin cabeceras CORS cuando el origen no está permitido', async () => {
    mockInvokeBedrock.mockResolvedValue(VALID_MODEL_RESPONSE);

    const result = await handler(buildEvent(VALID_REQUEST_BODY, 'https://other.test'));

    expect(result.statusCode).toBe(403);
    expect(result.headers?.['Access-Control-Allow-Origin']).toBeUndefined();
    expect(mockInvokeBedrock).not.toHaveBeenCalled();
  });

  it('procesa la solicitud cuando no hay cabecera Origin (cliente no navegador)', async () => {
    mockInvokeBedrock.mockResolvedValue(VALID_MODEL_RESPONSE);

    const event = buildEvent(VALID_REQUEST_BODY);
    event.headers = {};
    const result = await handler(event);

    expect(result.statusCode).toBe(200);
    expect(result.headers?.['Access-Control-Allow-Origin']).toBeUndefined();
  });

  it('permite el origen Amplify configurado', async () => {
    mockInvokeBedrock.mockResolvedValue(VALID_MODEL_RESPONSE);

    const result = await handler(buildEvent(VALID_REQUEST_BODY, 'https://frontend.example.com'));

    expect(result.statusCode).toBe(200);
    expect(result.headers?.['Access-Control-Allow-Origin']).toBe('https://frontend.example.com');
  });
});

// ---------------------------------------------------------------------------
// CORS preflight OPTIONS → 200
// ---------------------------------------------------------------------------

describe('handler — preflight OPTIONS', () => {
  it('devuelve 200 al recibir OPTIONS con origen permitido', async () => {
    const result = await handler(buildEvent(null, 'http://localhost:5173', 'OPTIONS'));

    expect(result.statusCode).toBe(200);
    expect(result.headers?.['Access-Control-Allow-Origin']).toBe('http://localhost:5173');
    expect(result.headers?.['Access-Control-Allow-Methods']).toContain('POST');
  });

  it('devuelve 403 al recibir OPTIONS con origen no permitido', async () => {
    const result = await handler(buildEvent(null, 'https://otro.com', 'OPTIONS'));

    expect(result.statusCode).toBe(403);
    expect(result.headers?.['Access-Control-Allow-Origin']).toBeUndefined();
  });
});

// ---------------------------------------------------------------------------
// Timeout → 504
// ---------------------------------------------------------------------------

describe('handler — timeout de Bedrock', () => {
  it('devuelve 504 cuando Bedrock no responde a tiempo', async () => {
    mockInvokeBedrock.mockRejectedValue(new BedrockTimeoutError());

    const result = await handler(buildEvent(VALID_REQUEST_BODY));

    expect(result.statusCode).toBe(504);
    const body = JSON.parse(result.body) as { error: string };
    // El mensaje de error no debe revelar detalles internos de infraestructura
    expect(body.error).toBeTruthy();
    expect(body.error).not.toContain('BedrockTimeoutError');
  });
});

// ---------------------------------------------------------------------------
// Error del proveedor → 502
// ---------------------------------------------------------------------------

describe('handler — error del proveedor de IA', () => {
  it('devuelve 502 cuando Bedrock lanza un error de proveedor', async () => {
    mockInvokeBedrock.mockRejectedValue(
      new BedrockProviderError('ThrottlingException: rate exceeded'),
    );

    const result = await handler(buildEvent(VALID_REQUEST_BODY));

    expect(result.statusCode).toBe(502);
    const body = JSON.parse(result.body) as { error: string };
    // No debe filtrar detalles internos del proveedor
    expect(body.error).not.toContain('ThrottlingException');
    expect(body.error).not.toContain('rate exceeded');
  });

  it('devuelve 502 cuando el modelo responde con JSON inválido', async () => {
    mockInvokeBedrock.mockResolvedValue('{esto-no-es-json}');

    const result = await handler(buildEvent(VALID_REQUEST_BODY));

    expect(result.statusCode).toBe(502);
  });

  it('devuelve 502 cuando la respuesta del modelo está fuera de contrato (campo extra)', async () => {
    const outOfContract = JSON.stringify({
      text: 'Respuesta.',
      statementId: null,
      extra: 'campo no permitido',
    });
    mockInvokeBedrock.mockResolvedValue(outOfContract);

    const result = await handler(buildEvent(VALID_REQUEST_BODY));

    expect(result.statusCode).toBe(502);
  });

  it('devuelve 502 cuando el texto supera 500 caracteres — descarte completo', async () => {
    const oversized = JSON.stringify({ text: 'a'.repeat(501), statementId: null });
    mockInvokeBedrock.mockResolvedValue(oversized);

    const result = await handler(buildEvent(VALID_REQUEST_BODY));

    expect(result.statusCode).toBe(502);
    // El texto del modelo NO debe aparecer en la respuesta (descarte completo)
    expect(result.body).not.toContain('a'.repeat(20));
  });

  it('devuelve 502 cuando el statementId pertenece a otro sospechoso — descarte completo', async () => {
    const wrongSuspect = JSON.stringify({
      text: 'Respuesta.',
      statementId: 'stmt_elena_arrival', // pertenece a elena, no a daniel
    });
    mockInvokeBedrock.mockResolvedValue(wrongSuspect);

    const result = await handler(buildEvent(VALID_REQUEST_BODY)); // sospechoso: daniel

    expect(result.statusCode).toBe(502);
  });

  it('devuelve 502 cuando el statementId es desconocido', async () => {
    const unknown = JSON.stringify({ text: 'Respuesta.', statementId: 'stmt_no_existe' });
    mockInvokeBedrock.mockResolvedValue(unknown);

    const result = await handler(buildEvent(VALID_REQUEST_BODY));

    expect(result.statusCode).toBe(502);
  });
});

// ---------------------------------------------------------------------------
// Requests inválidos → 400
// ---------------------------------------------------------------------------

describe('handler — requests inválidos → 400', () => {
  it('devuelve 400 para sospechoso desconocido e identifica el campo', async () => {
    const result = await handler(
      buildEvent({ ...VALID_REQUEST_BODY, suspectId: 'fantasma' }),
    );

    expect(result.statusCode).toBe(400);
    const body = JSON.parse(result.body) as { field: string };
    expect(body.field).toBe('suspectId');
  });

  it('devuelve 400 para pregunta vacía e identifica el campo', async () => {
    const result = await handler(buildEvent({ ...VALID_REQUEST_BODY, question: '' }));

    expect(result.statusCode).toBe(400);
    const body = JSON.parse(result.body) as { field: string };
    expect(body.field).toBe('question');
  });

  it('devuelve 400 para pregunta de 301 caracteres e identifica el campo', async () => {
    const result = await handler(
      buildEvent({ ...VALID_REQUEST_BODY, question: 'a'.repeat(301) }),
    );

    expect(result.statusCode).toBe(400);
    const body = JSON.parse(result.body) as { field: string };
    expect(body.field).toBe('question');
  });

  it('devuelve 400 para gameContext ausente e identifica el campo', async () => {
    const { gameContext: _gc, ...noCtx } = VALID_REQUEST_BODY;
    const result = await handler(buildEvent(noCtx));

    expect(result.statusCode).toBe(400);
    const body = JSON.parse(result.body) as { field: string };
    expect(body.field).toBe('gameContext');
  });

  it('devuelve 400 para gameContext mal tipado e identifica el campo', async () => {
    const result = await handler(buildEvent({ ...VALID_REQUEST_BODY, gameContext: 'mal' }));

    expect(result.statusCode).toBe(400);
    const body = JSON.parse(result.body) as { field: string };
    expect(body.field).toBe('gameContext');
  });

  it('devuelve 400 para ID de contradicción desconocido e identifica el campo', async () => {
    const result = await handler(
      buildEvent({
        ...VALID_REQUEST_BODY,
        gameContext: {
          discoveredContradictionIds: ['contra_no_existe'],
          suspectPressure: 0,
        },
      }),
    );

    expect(result.statusCode).toBe(400);
    const body = JSON.parse(result.body) as { field: string };
    expect(body.field).toBe('gameContext.discoveredContradictionIds');
  });

  it('devuelve 400 para presión no numérica e identifica el campo', async () => {
    const result = await handler(
      buildEvent({
        ...VALID_REQUEST_BODY,
        gameContext: { discoveredContradictionIds: [], suspectPressure: 'alta' },
      }),
    );

    expect(result.statusCode).toBe(400);
    const body = JSON.parse(result.body) as { field: string };
    expect(body.field).toBe('gameContext.suspectPressure');
  });

  it('devuelve 400 para presión negativa e identifica el campo', async () => {
    const result = await handler(
      buildEvent({
        ...VALID_REQUEST_BODY,
        gameContext: { discoveredContradictionIds: [], suspectPressure: -1 },
      }),
    );

    expect(result.statusCode).toBe(400);
    const body = JSON.parse(result.body) as { field: string };
    expect(body.field).toBe('gameContext.suspectPressure');
  });

  it('devuelve 400 para presión null (simula Infinity/NaN serializado) e identifica el campo', async () => {
    const body = JSON.stringify({
      suspectId: 'daniel',
      question: 'Hola',
      gameContext: { discoveredContradictionIds: [], suspectPressure: null },
    });
    const event: APIGatewayProxyEvent = {
      ...buildEvent(null),
      body,
    };
    const result = await handler(event);

    expect(result.statusCode).toBe(400);
    const parsed = JSON.parse(result.body) as { field: string };
    expect(parsed.field).toBe('gameContext.suspectPressure');
  });

  it('no invoca Bedrock cuando la solicitud es inválida', async () => {
    await handler(buildEvent({ ...VALID_REQUEST_BODY, suspectId: 'fantasma' }));

    expect(mockInvokeBedrock).not.toHaveBeenCalled();
  });
});
