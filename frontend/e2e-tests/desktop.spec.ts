/**
 * Flujo E2E del escritorio virtual: navegación lateral, panel de evidencias,
 * HUD persistente y derrota por tiempo agotado.
 *
 * Requisitos: 3.1-3.3, 4.1-4.3, 5.1-5.5, 10.1-10.4, 13.2-13.7, 13.9-13.11
 */

import { expect, test, type Locator } from '@playwright/test';

/**
 * Marcas de los metadatos `_internal` del caso, los sospechosos y las
 * evidencias. Ninguna puede aparecer en el HTML renderizado: la palabra
 * "culpable" no basta como aserción negativa porque los metadatos internos se
 * filtrarían por sus claves, sus identificadores o el motivo real.
 */
const INTERNAL_MARKERS =
  /_internal|culpritId|realMotive|relatedSuspects|doesNotKnow|motive_silence|method_poison|desfalco de 2 millones/i;

async function expectNoInternalMetadata(locator: Locator): Promise<void> {
  await expect.poll(async () => locator.innerHTML()).not.toMatch(INTERNAL_MARKERS);
}

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
    await expectNoInternalMetadata(desktop);
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
    await expectNoInternalMetadata(detail);
  });

  test('HUD - el temporizador y la puntuación acompañan a los cuatro paneles', async ({ page }) => {
    const nav = page.getByRole('navigation', { name: 'Navegación de la partida' });

    for (const panel of ['Expediente', 'Evidencias', 'Llamar', 'Acusar']) {
      await nav.getByRole('button', { name: panel }).click();
      await expect(nav.getByRole('button', { name: panel })).toHaveAttribute(
        'aria-current',
        'page',
      );
      await expect(page.getByTestId('hud-timer')).toContainText(/\d{2}:\d{2}/);
      await expect(page.getByTestId('hud-score')).toContainText('0');
    }
  });
});

test.describe('Derrota por tiempo agotado', () => {
  // El reloj virtual sustituye a la espera real de doce minutos; hay que
  // instalarlo antes de cargar la página para que el store lo use al iniciar.
  test.beforeEach(async ({ page }) => {
    await page.clock.install();
    await page.goto('/');
    await page.getByRole('button', { name: 'Iniciar partida' }).click();
    await expect(page.getByRole('heading', { level: 2, name: 'Escritorio' })).toBeVisible();
  });

  test('Temporizador - avisa del último tramo antes de agotarse', async ({ page }) => {
    await page.clock.fastForward('10:00');

    await expect(page.getByTestId('hud-timer')).toHaveAttribute('data-critical', 'true');
    await expect(page.getByRole('heading', { level: 2, name: 'Escritorio' })).toBeVisible();
  });

  test('Temporizador - termina la partida desde el panel de acusación', async ({ page }) => {
    await page
      .getByRole('navigation', { name: 'Navegación de la partida' })
      .getByRole('button', { name: 'Acusar' })
      .click();
    await expect(page.getByRole('heading', { level: 2, name: 'Acusación final' })).toBeVisible();

    await page.clock.fastForward('12:30');

    await expect(
      page.getByRole('heading', { level: 1, name: 'Derrota por tiempo agotado' }),
    ).toBeVisible();
    await expect(page.getByTestId('final-score')).toContainText('Puntuación final:');

    await page.getByRole('button', { name: 'Reiniciar partida' }).click();
    await expect(page.getByRole('button', { name: 'Iniciar partida' })).toBeVisible();
  });
});
