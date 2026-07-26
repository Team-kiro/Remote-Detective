/**
 * Flujo E2E del sistema de llamadas: selector de sospechosos, interrogatorio,
 * declaraciones registradas y presentación de evidencias con teclado.
 *
 * Requisitos: 6.1-6.11, 7.8, 9.1-9.3, 14.4, 16.5
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
    const evidence = page
      .getByRole('region', { name: 'Evidencias disponibles' })
      .getByRole('button', { name: 'Registro de acceso' });

    await evidence.focus();
    await page.keyboard.press('Space');

    // El número de pasos hasta la declaración depende de la geometría, así que
    // se avanza hasta que la zona de destino se marque, sin esperas fijas.
    for (let step = 0; step < 6; step += 1) {
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
