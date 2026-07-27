/**
 * Flujo E2E del interrogatorio contra un endpoint real de Bedrock.
 *
 * Verificación MANUAL, nunca CI: depende de AWS, cuesta dinero por invocación y
 * la respuesta la decide un modelo no determinista. Solo se registra cuando
 * `E2E_BEDROCK_API_URL` apunta al endpoint desplegado (ver playwright.config.ts):
 *
 *   $env:E2E_BEDROCK_API_URL = 'https://<id>.execute-api.<region>.amazonaws.com/Prod/interrogate'
 *   npm run test:e2e -- --project=chromium-bedrock
 *
 * No verifica el contenido de la respuesta —eso lo decide un modelo—, sino lo
 * que sí es estable: que la segunda pregunta de una llamada viaja con los
 * turnos previos, y que la respuesta remota llega al historial del jugador.
 *
 * Requisitos: 6.1-6.11, 16.1-16.6
 */

import { expect, test, type Page, type Request } from '@playwright/test';

const FIRST_QUESTION = '¿A qué hora llegaste al edificio?';
const SECOND_QUESTION = '¿Estás seguro de esa hora?';

interface InterrogationTurn {
  role: 'player' | 'suspect';
  text: string;
}

interface InterrogationBody {
  suspectId: string;
  question: string;
  conversationHistory?: InterrogationTurn[];
}

/** Cuerpos enviados a `/interrogate`, en orden de emisión. */
function captureInterrogateBodies(page: Page): InterrogationBody[] {
  const bodies: InterrogationBody[] = [];

  page.on('request', (request: Request) => {
    if (request.method() !== 'POST' || !request.url().includes('/interrogate')) {
      return;
    }
    const raw = request.postData();
    if (raw !== null) {
      bodies.push(JSON.parse(raw) as InterrogationBody);
    }
  });

  return bodies;
}

test.describe('Interrogatorio con Bedrock', () => {
  test('Llamadas - la segunda pregunta viaja con los turnos previos de la llamada', async ({
    page,
  }) => {
    const bodies = captureInterrogateBodies(page);

    await page.goto('/');
    await page.getByRole('button', { name: 'Iniciar partida' }).click();
    await page
      .getByRole('navigation', { name: 'Navegación de la partida' })
      .getByRole('button', { name: 'Llamar' })
      .click();
    await page.getByRole('button', { name: /Daniel Rivas/ }).click();

    const history = page.getByRole('region', { name: 'Historial de la llamada' });
    // Una llamada real a Bedrock tarda varios segundos, muy por encima del tope
    // por aserción de 5 s de Playwright.
    const remoteWait = { timeout: 45_000 };

    await test.step('primera pregunta: sin historial previo', async () => {
      await page.getByLabel('Tu pregunta').fill(FIRST_QUESTION);
      await page.getByRole('button', { name: 'Enviar pregunta' }).click();
      await expect(history.getByRole('listitem')).toHaveCount(2, remoteWait);
    });

    await test.step('segunda pregunta: el modelo recibe la conversación', async () => {
      await page.getByLabel('Tu pregunta').fill(SECOND_QUESTION);
      await page.getByRole('button', { name: 'Enviar pregunta' }).click();
      await expect(history.getByRole('listitem')).toHaveCount(4, remoteWait);
    });

    expect(bodies).toHaveLength(2);
    expect(bodies[0]?.conversationHistory).toEqual([]);

    // La pregunta actual viaja en `question`, nunca duplicada en el historial.
    expect(bodies[1]?.question).toBe(SECOND_QUESTION);
    expect(bodies[1]?.conversationHistory?.map((turn) => turn.role)).toEqual([
      'player',
      'suspect',
    ]);
    expect(bodies[1]?.conversationHistory?.[0]?.text).toBe(FIRST_QUESTION);

    // El turno del sospechoso es la respuesta remota que vio el jugador.
    const suspectReply = await history.getByRole('listitem').nth(1).innerText();
    expect(suspectReply).toContain(bodies[1]?.conversationHistory?.[1]?.text ?? '\u0000');
  });
});
