/**
 * Flujo E2E del sistema de llamadas: selector de sospechosos, interrogatorio,
 * declaraciones registradas, presentación de evidencias con teclado y la
 * victoria por confesión, que es la única forma de ganar sin acusar.
 *
 * Requisitos: 3.3, 6.1-6.11, 7.8, 8.1-8.10, 9.1-9.5, 11.5, 13.9-13.11, 14.4, 16.5
 */

import { expect, test, type Page } from '@playwright/test';

const DANIEL_ARRIVAL_QUESTION = '¿A qué hora llegaste al edificio?';
const DANIEL_ARRIVAL_STATEMENT = 'Llegué al edificio a las 20:50';

/** Deja registrada la declaración de llegada de Daniel, único destino de drop. */
async function askArrivalQuestion(page: Page): Promise<void> {
  await page.getByLabel('Tu pregunta').fill(DANIEL_ARRIVAL_QUESTION);
  await page.getByRole('button', { name: 'Enviar pregunta' }).click();
  await expect(page.locator('li[data-statement]')).toHaveCount(1);
}

/**
 * Presenta una evidencia sobre una declaración arrastrando con el ratón.
 *
 * El puntero va de un centro al otro: mover el arrastre a ciegas con las
 * flechas depende de cuántas declaraciones haya registradas y de dónde caiga
 * cada una. El camino con teclado tiene su propio test de accesibilidad.
 */
async function presentEvidence(
  page: Page,
  evidenceName: string,
  statementId: string,
): Promise<void> {
  const statement = page.locator(`li[data-statement="${statementId}"]`);
  const evidence = page
    .getByRole('region', { name: 'Evidencias disponibles' })
    .getByRole('button', { name: evidenceName });

  await evidence.scrollIntoViewIfNeeded();
  await statement.scrollIntoViewIfNeeded();
  const from = await evidence.boundingBox();
  const to = await statement.boundingBox();
  if (from === null || to === null) {
    throw new Error(`Sin geometría para arrastrar «${evidenceName}» sobre ${statementId}`);
  }

  await page.mouse.move(from.x + from.width / 2, from.y + from.height / 2);
  await page.mouse.down();
  // dnd-kit activa el sensor con el primer movimiento: un solo salto puede
  // llegar antes de que haya arrastre que mover.
  await page.mouse.move(to.x + to.width / 2, to.y + to.height / 2, { steps: 10 });
  await expect(statement).toHaveAttribute('data-over', 'true');

  await page.mouse.up();
}

/** Pregunta por el tema sugerido y espera a que se registre su declaración. */
async function askAbout(page: Page, intent: string, expectedStatements: number): Promise<void> {
  await page.getByRole('button', { name: intent }).click();
  await page.getByRole('button', { name: 'Enviar pregunta' }).click();
  await expect(page.locator('li[data-statement]')).toHaveCount(expectedStatements);
}

test.describe('Sistema de llamadas', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.getByRole('button', { name: 'Iniciar partida' }).click();
    await page
      .getByRole('navigation', { name: 'Navegación de la partida' })
      .getByRole('button', { name: 'Llamar' })
      .click();
    await expect(page.getByRole('heading', { level: 2, name: 'Sistema de llamadas' })).toBeVisible();
  });

  test('Llamadas - ofrece los cuatro sospechosos y el distintivo de modo local', async ({
    page,
  }) => {
    const panel = page.getByRole('region', { name: 'Sistema de llamadas' });

    await expect(panel.getByRole('listitem')).toHaveCount(4);
    await expect(panel.getByRole('button', { name: /Daniel Rivas/ })).toBeVisible();
    await expect(panel.getByText('Línea segura')).toBeVisible();
  });

  test('Llamadas - el envío exige texto y respeta el límite de 300 caracteres', async ({ page }) => {
    await page.getByRole('button', { name: /Daniel Rivas/ }).click();

    const question = page.getByLabel('Tu pregunta');
    const send = page.getByRole('button', { name: 'Enviar pregunta' });

    await expect(question).toHaveAttribute('maxlength', '300');
    await expect(send).toBeDisabled();
    await expect(page.getByText('Elige un tema o escribe tu propia pregunta.')).toBeVisible();

    await question.fill('     ');
    await expect(send).toBeDisabled();

    await question.fill(DANIEL_ARRIVAL_QUESTION);
    await expect(send).toBeEnabled();
  });

  test('Llamadas - la respuesta del store llega al historial y registra la declaración', async ({
    page,
  }) => {
    await page.getByRole('button', { name: /Daniel Rivas/ }).click();

    const statements = page.getByRole('region', { name: 'Declaraciones registradas' });
    await expect(statements).toContainText('Todavía no hay declaraciones registradas');

    await page.getByLabel('Tu pregunta').fill(DANIEL_ARRIVAL_QUESTION);
    await page.getByRole('button', { name: 'Enviar pregunta' }).click();

    const history = page.getByRole('region', { name: 'Historial de la llamada' });
    await expect(history.getByRole('listitem')).toHaveCount(2);
    await expect(history).toContainText(DANIEL_ARRIVAL_QUESTION);
    await expect(statements).toContainText(DANIEL_ARRIVAL_STATEMENT);
    await expect(page.getByLabel('Tu pregunta')).toHaveValue('');
  });

  test('Llamadas - terminar y reabrir conserva el historial de cada sospechoso', async ({
    page,
  }) => {
    await page.getByRole('button', { name: /Daniel Rivas/ }).click();
    await page.getByLabel('Tu pregunta').fill(DANIEL_ARRIVAL_QUESTION);
    await page.getByRole('button', { name: 'Enviar pregunta' }).click();

    const history = page.getByRole('region', { name: 'Historial de la llamada' });
    await expect(history).toContainText(DANIEL_ARRIVAL_QUESTION);

    await page.getByRole('button', { name: 'Terminar llamada' }).click();
    await expect(page.getByRole('button', { name: /Elena Vargas/ })).toBeVisible();

    await page.getByRole('button', { name: /Elena Vargas/ }).click();
    await expect(history).toContainText('Aún no has preguntado nada a Elena');

    await page.getByRole('button', { name: 'Terminar llamada' }).click();
    await page.getByRole('button', { name: /Daniel Rivas/ }).click();
    await expect(history).toContainText(DANIEL_ARRIVAL_QUESTION);
  });

  test('Contradicciones - la bandeja no ofrece arrastre sin declaraciones', async ({ page }) => {
    await page.getByRole('button', { name: /Daniel Rivas/ }).click();

    const tray = page.getByRole('region', { name: 'Evidencias disponibles' });
    await expect(tray).toContainText('no hay dónde presentar una evidencia');
    // Sigue siendo alcanzable con el tabulador: solo se anuncia inoperable.
    await expect(tray.getByRole('button', { name: 'Registro de acceso' })).toHaveAttribute(
      'aria-disabled',
      'true',
    );

    await askArrivalQuestion(page);

    await expect(tray).toContainText('Arrastra una evidencia sobre una declaración registrada');
    await expect(tray.getByRole('button', { name: 'Registro de acceso' })).toHaveAttribute(
      'aria-disabled',
      'false',
    );
  });

  test('Contradicciones - presentar la evidencia con teclado la demuestra', async ({ page }) => {
    await page.getByRole('button', { name: /Daniel Rivas/ }).click();
    await askArrivalQuestion(page);

    const statement = page.locator('li[data-statement="stmt_daniel_arrival"]');
    await page
      .getByRole('region', { name: 'Evidencias disponibles' })
      .getByRole('button', { name: 'Registro de acceso' })
      .focus();
    await page.keyboard.press('Space');

    // Con una sola declaración registrada basta con bajar hasta marcarla.
    for (let step = 0; step < 24; step += 1) {
      if ((await statement.getAttribute('data-over')) === 'true') {
        break;
      }
      await page.keyboard.press('ArrowDown');
    }
    await expect(statement).toHaveAttribute('data-over', 'true');
    await page.keyboard.press('Space');

    await expect(page.locator('[data-feedback]')).toHaveAttribute('data-feedback', 'valid');
    await expect(page.getByTestId('hud-score')).toContainText('150');
  });

  test('Contradicciones - cancelar el arrastre con Escape no evalúa nada', async ({ page }) => {
    await page.getByRole('button', { name: /Daniel Rivas/ }).click();
    await askArrivalQuestion(page);

    const statement = page.locator('li[data-statement="stmt_daniel_arrival"]');
    await page
      .getByRole('region', { name: 'Evidencias disponibles' })
      .getByRole('button', { name: 'Registro de acceso' })
      .focus();
    await page.keyboard.press('Space');
    await page.keyboard.press('ArrowDown');
    await page.keyboard.press('Escape');

    // Un arrastre cancelado no llega a `presentEvidence`: sin aviso y sin score.
    await expect(statement).toHaveAttribute('data-over', 'false');
    await expect(page.locator('[data-feedback]')).toHaveCount(0);
    await expect(page.getByTestId('hud-score')).toContainText('0');
  });

  test('Contradicciones - los cuatro resultados se distinguen en pantalla', async ({ page }) => {
    await page.getByRole('button', { name: /Daniel Rivas/ }).click();
    await askArrivalQuestion(page);

    const feedback = page.locator('[data-feedback]');

    await test.step('La combinación válida explica la contradicción', async () => {
      await presentEvidence(page, 'Registro de acceso', 'stmt_daniel_arrival');
      await expect(feedback).toHaveAttribute('data-feedback', 'valid');
      await expect(feedback).toContainText('Contradicción demostrada.');
      await feedback.getByRole('button', { name: 'Cerrar aviso' }).click();
    });

    await test.step('Repetirla avisa sin volver a puntuar', async () => {
      await presentEvidence(page, 'Registro de acceso', 'stmt_daniel_arrival');
      await expect(feedback).toHaveAttribute('data-feedback', 'already_discovered');
      await expect(page.getByTestId('hud-score')).toContainText('150');
      await feedback.getByRole('button', { name: 'Cerrar aviso' }).click();
    });

    await test.step('Una evidencia relevante pero insuficiente no penaliza', async () => {
      await presentEvidence(page, 'Botella de whisky', 'stmt_daniel_arrival');
      await expect(feedback).toHaveAttribute('data-feedback', 'related_insufficient');
      await expect(page.getByTestId('hud-score')).toContainText('150');
      await feedback.getByRole('button', { name: 'Cerrar aviso' }).click();
    });

    await test.step('Una combinación sin relación aplica la penalización', async () => {
      await presentEvidence(page, 'Informe toxicológico', 'stmt_daniel_arrival');
      await expect(feedback).toHaveAttribute('data-feedback', 'incorrect');
      await expect(page.getByTestId('hud-score')).toContainText('100');
    });
  });

  test('Contradicciones - salir a otro panel y volver conserva la investigación', async ({
    page,
  }) => {
    await page.getByRole('button', { name: /Daniel Rivas/ }).click();
    await askArrivalQuestion(page);
    await presentEvidence(page, 'Registro de acceso', 'stmt_daniel_arrival');
    await expect(page.getByTestId('hud-score')).toContainText('150');
    // El aviso es fijo y dnd-kit se traga el clic que sigue a un arrastre:
    // cerrarlo deja la barra de navegación despejada, como haría el jugador.
    await page.getByRole('button', { name: 'Cerrar aviso' }).click();
    await expect(page.locator('[data-feedback]')).toHaveCount(0);

    const nav = page.getByRole('navigation', { name: 'Navegación de la partida' });
    await nav.getByRole('button', { name: 'Expediente' }).click();
    await expect(page.getByRole('heading', { level: 2, name: 'Expediente del caso' })).toBeVisible();
    await nav.getByRole('button', { name: 'Llamar' }).click();
    await page.getByRole('button', { name: /Daniel Rivas/ }).click();

    await expect(page.getByRole('region', { name: 'Historial de la llamada' })).toContainText(
      DANIEL_ARRIVAL_QUESTION,
    );
    await expect(page.locator('li[data-statement="stmt_daniel_arrival"]')).toBeVisible();
    await expect(page.getByTestId('hud-score')).toContainText('150');
  });

  test('Confesión - las tres contradicciones de Daniel ganan la partida', async ({ page }) => {
    await page.getByRole('button', { name: /Daniel Rivas/ }).click();

    await test.step('Se registran las tres declaraciones que Daniel miente', async () => {
      await askAbout(page, 'Hora de llegada', 1);
      await askAbout(page, 'Oficina de Marcos', 2);
      await askAbout(page, 'Veneno/sustancias', 3);
    });

    await presentEvidence(page, 'Registro de acceso', 'stmt_daniel_arrival');
    await expect(page.locator('[data-feedback]')).toHaveAttribute('data-feedback', 'valid');
    await page.getByRole('button', { name: 'Cerrar aviso' }).click();

    await presentEvidence(page, 'Grabación del pasillo', 'stmt_daniel_office');
    await expect(page.locator('[data-feedback]')).toHaveAttribute('data-feedback', 'valid');
    await page.getByRole('button', { name: 'Cerrar aviso' }).click();

    // La tercera contradicción lleva la presión de Daniel al umbral: el store
    // dispara la confesión sin que el jugador tenga que acusar.
    await presentEvidence(page, 'Recibo de compra', 'stmt_daniel_substance');

    await expect(page.getByRole('heading', { level: 1, name: 'Victoria por confesión' })).toBeVisible();
    await expect(page.getByTestId('final-score')).toContainText('Puntuación final:');

    await page.getByRole('button', { name: 'Reiniciar partida' }).click();
    await expect(page.getByRole('button', { name: 'Iniciar partida' })).toBeVisible();
  });

  test('Contradicciones - el arrastre se narra en español y con nombres del caso', async ({
    page,
  }) => {
    await page.getByRole('button', { name: /Daniel Rivas/ }).click();
    await askArrivalQuestion(page);

    await page
      .getByRole('region', { name: 'Evidencias disponibles' })
      .getByRole('button', { name: 'Registro de acceso' })
      .focus();
    await page.keyboard.press('Space');

    // Sin `announcements` propios, @dnd-kit narraría «Picked up draggable item
    // ev_access_log»: inglés e identificadores internos en una partida en español.
    await expect(page.locator('[aria-live="assertive"]')).toContainText(
      'Has tomado Registro de acceso',
    );
    await page.keyboard.press('Escape');
  });
});
