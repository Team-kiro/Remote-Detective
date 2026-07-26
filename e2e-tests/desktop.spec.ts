/**
 * Flujo E2E del escritorio virtual: navegación lateral y panel de evidencias.
 *
 * Requisitos: 3.1-3.3, 4.1-4.3, 5.1-5.5, 13.2-13.6
 */

import { expect, test } from '@playwright/test';

test.describe('Escritorio de la partida', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.getByRole('button', { name: 'Iniciar partida' }).click();
    await expect(page.getByRole('heading', { level: 2, name: 'Escritorio' })).toBeVisible();
  });

  test('Escritorio - resume el caso sin exponer metadatos internos', async ({ page }) => {
    const desktop = page.getByRole('region', { name: 'Escritorio' });

    await expect(desktop).toContainText('Marcos Linares');
    await expect(desktop.getByRole('definition').filter({ hasText: /^4$/ })).toHaveCount(1);
    await expect(desktop.getByRole('definition').filter({ hasText: /^6$/ })).toHaveCount(1);
    // El culpable y el motivo real son metadatos internos: no pueden llegar al DOM.
    await expect(desktop).not.toContainText('culpable');
  });

  test('Escritorio - navega entre expediente, llamadas y acusación', async ({ page }) => {
    const nav = page.getByRole('navigation', { name: 'Navegación de la partida' });

    await nav.getByRole('button', { name: 'Expediente' }).click();
    await expect(page.getByRole('heading', { level: 2, name: 'Expediente del caso' })).toBeVisible();
    await expect(nav.getByRole('button', { name: 'Expediente' })).toHaveAttribute(
      'aria-current',
      'page',
    );

    await nav.getByRole('button', { name: 'Llamar' }).click();
    await expect(page.getByRole('heading', { level: 2, name: 'Sistema de llamadas' })).toBeVisible();

    await nav.getByRole('button', { name: 'Acusar' }).click();
    await expect(page.getByRole('heading', { level: 2, name: 'Acusación final' })).toBeVisible();

    await page.getByRole('button', { name: 'Volver al escritorio' }).click();
    await expect(page.getByRole('heading', { level: 2, name: 'Escritorio' })).toBeVisible();
  });

  test('Evidencias - las seis están disponibles y muestran su detalle', async ({ page }) => {
    await page
      .getByRole('navigation', { name: 'Navegación de la partida' })
      .getByRole('button', { name: 'Evidencias' })
      .click();

    const list = page.getByRole('list', { name: 'Listado' });
    await expect(list.getByRole('button')).toHaveCount(6);

    const detail = page.getByRole('region', { name: 'Detalle' });
    await expect(detail).toContainText('Selecciona una evidencia para inspeccionarla.');

    const firstEvidence = list.getByRole('button').first();
    const evidenceName = await firstEvidence.locator('span').first().innerText();
    await firstEvidence.click();

    await expect(firstEvidence).toHaveAttribute('aria-pressed', 'true');
    await expect(detail).toContainText(evidenceName);
    await expect(detail).toContainText('Información observable');
  });
});
