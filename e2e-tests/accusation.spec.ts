/**
 * Flujo E2E de la acusación final: confirmación, cancelación sin coste y
 * resultado decidido por el store.
 *
 * Requisitos: 11.5, 12.1-12.9, 13.6, 13.9-13.11
 */

import { expect, test, type Page } from '@playwright/test';

async function openAccusation(page: Page): Promise<void> {
  await page
    .getByRole('navigation', { name: 'Navegación de la partida' })
    .getByRole('button', { name: 'Acusar' })
    .click();
  await expect(page.getByRole('heading', { level: 2, name: 'Acusación final' })).toBeVisible();
}

async function fillAccusation(
  page: Page,
  options: { suspect: string; motive: string; method: string },
): Promise<void> {
  await page.getByLabel('Sospechoso').selectOption({ label: options.suspect });
  await page.getByLabel('Motivo').selectOption({ label: options.motive });
  await page.getByLabel('Método').selectOption({ label: options.method });

  // Se marcan las seis evidencias: la solución admite extras y así el caso de
  // victoria no depende del orden del catálogo.
  for (const checkbox of await page.getByRole('checkbox').all()) {
    await checkbox.check();
  }
}

test.describe('Acusación final', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.getByRole('button', { name: 'Iniciar partida' }).click();
    await openAccusation(page);
  });

  test('Acusación - el envío exige los cuatro campos', async ({ page }) => {
    await expect(page.getByRole('status')).toContainText(
      'Faltan campos por completar: sospechoso, motivo, método, al menos una evidencia.',
    );
    await expect(page.getByTestId('accusation-submit')).toBeDisabled();

    await fillAccusation(page, {
      suspect: 'Elena Vargas',
      motive: 'Venganza personal',
      method: 'Agresión física directa',
    });

    await expect(page.getByRole('status')).toContainText('Acusación completa.');
    await expect(page.getByTestId('accusation-submit')).toBeEnabled();
  });

  test('Acusación - cancelar la confirmación no consume el intento', async ({ page }) => {
    await fillAccusation(page, {
      suspect: 'Elena Vargas',
      motive: 'Venganza personal',
      method: 'Agresión física directa',
    });
    await page.getByTestId('accusation-submit').click();

    await expect(page.getByTestId('accusation-confirm')).toContainText('Esta decisión es definitiva.');
    await page.getByTestId('accusation-cancel').click();

    await expect(page.getByRole('heading', { level: 2, name: 'Escritorio' })).toBeVisible();

    await openAccusation(page);
    await expect(page.getByRole('status')).not.toContainText('Ya presentaste');
  });

  test('Acusación - la acusación correcta termina en victoria', async ({ page }) => {
    await fillAccusation(page, {
      suspect: 'Daniel Rivas',
      motive: 'Silenciar a Marcos para ocultar el desfalco',
      method: 'Envenenamiento con cianuro en el whisky',
    });
    await page.getByTestId('accusation-submit').click();
    await page.getByTestId('accusation-confirm-submit').click();

    await expect(
      page.getByRole('heading', { level: 1, name: 'Victoria por acusación correcta' }),
    ).toBeVisible();
    await expect(page.getByTestId('final-score')).toContainText('Puntuación final:');
  });

  test('Acusación - la acusación incorrecta termina en derrota', async ({ page }) => {
    await fillAccusation(page, {
      suspect: 'Sofía Castillo',
      motive: 'Mayor participación en la sociedad',
      method: 'Contratación de un tercero',
    });
    await page.getByTestId('accusation-submit').click();
    await page.getByTestId('accusation-confirm-submit').click();

    await expect(
      page.getByRole('heading', { level: 1, name: 'Derrota por acusación incorrecta' }),
    ).toBeVisible();
    await page.getByRole('button', { name: 'Reiniciar partida' }).click();
    await expect(page.getByRole('button', { name: 'Iniciar partida' })).toBeVisible();
  });
});
