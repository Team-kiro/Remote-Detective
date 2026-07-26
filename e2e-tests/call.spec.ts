/**
 * Flujo E2E del sistema de llamadas: selector de sospechosos, interrogatorio y
 * declaraciones registradas.
 *
 * Requisitos: 6.1-6.11, 7.8, 14.4, 16.5
 */

import { expect, test } from '@playwright/test';

const DANIEL_ARRIVAL_QUESTION = '¿A qué hora llegaste al edificio?';
const DANIEL_ARRIVAL_STATEMENT = 'Llegué al edificio a las 20:50';

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
});
