/**
 * Flujo E2E de la pantalla inicial e instrucciones.
 *
 * Requisitos: 2.1-2.5, 3.1-3.2, 10.1, 13.1
 */

import { expect, test } from '@playwright/test';

test.describe('Pantalla inicial', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
  });

  test('Pantalla inicial - muestra el título y las acciones aprobadas', async ({ page }) => {
    await expect(page).toHaveTitle('Remote Detective');
    await expect(page.getByRole('heading', { level: 1, name: 'REMOTE DETECTIVE' })).toBeVisible();
    await expect(page.getByText('Solve the case before time runs out.')).toBeVisible();
    await expect(page.getByRole('button', { name: 'Iniciar partida' })).toBeEnabled();
  });

  test('Pantalla inicial - abre las instrucciones y regresa', async ({ page }) => {
    await page.getByRole('button', { name: 'Cómo jugar' }).click();

    await test.step('Las instrucciones cubren las cinco secciones del juego', async () => {
      await expect(page.getByRole('heading', { level: 1, name: 'Cómo jugar' })).toBeVisible();
      await expect(page.getByRole('heading', { level: 2 })).toHaveText([
        'Objetivo',
        'Inspeccionar evidencias',
        'Interrogar sospechosos',
        'Detectar contradicciones',
        'Acusación final',
      ]);
    });

    await page.getByRole('button', { name: 'Volver a la pantalla inicial' }).click();
    await expect(page.getByRole('button', { name: 'Iniciar partida' })).toBeVisible();
  });

  test('Pantalla inicial - iniciar partida abre el escritorio con el HUD', async ({ page }) => {
    await page.getByRole('button', { name: 'Iniciar partida' }).click();

    await expect(page.getByRole('heading', { level: 2, name: 'Escritorio' })).toBeVisible();
    // El temporizador arranca dentro de los 12 minutos aprobados y no es crítico.
    await expect(page.getByTestId('hud-timer')).toContainText(/1[12]:\d{2}/);
    await expect(page.getByTestId('hud-timer')).toHaveAttribute('data-critical', 'false');
    await expect(page.getByTestId('hud-score')).toContainText('0');
  });
});
