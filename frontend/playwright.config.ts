/**
 * Configuración de la suite E2E (Playwright).
 *
 * Las pruebas se ejecutan contra el bundle de producción servido por
 * `vite preview`: el build es la puerta de TypeScript del proyecto y garantiza
 * que la partida verificada sea la que realmente se despliega. Solo Chromium,
 * porque el MVP no soporta múltiples navegadores ni drag-and-drop táctil.
 *
 * Requisitos: 2.1-2.5, 3.1-3.3, 5.1-5.5, 12.1-12.9, 13.1-13.11
 */

import { defineConfig, devices } from '@playwright/test';

const PORT = 4173;
const BASE_URL = `http://localhost:${String(PORT)}`;

export default defineConfig({
  testDir: './e2e-tests',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: process.env.CI ? 'github' : 'list',
  use: {
    baseURL: BASE_URL,
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
    actionTimeout: 10_000,
    navigationTimeout: 15_000,
  },
  projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'] } }],
  webServer: {
    command: `npm run build && npm run preview -- --port ${String(PORT)} --strictPort`,
    url: BASE_URL,
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
  },
});
