/**
 * Configuración de la suite E2E (Playwright).
 *
 * Las pruebas se ejecutan contra el bundle de producción servido por
 * `vite preview`: el build es la puerta de TypeScript del proyecto y garantiza
 * que la partida verificada sea la que realmente se despliega. Solo Chromium,
 * porque el MVP no soporta múltiples navegadores ni drag-and-drop táctil.
 *
 * Requisitos: 2.1-2.5, 3.1-3.3, 5.1-5.5, 12.1-12.9, 13.1-13.11, 16.1-16.6
 */

import { defineConfig, devices } from '@playwright/test';

const PORT = 4173;
const BASE_URL = `http://localhost:${String(PORT)}`;

/**
 * La suite de Bedrock corre contra un endpoint real desplegado, así que necesita
 * su propio bundle: `interrogationMode` se resuelve en tiempo de build desde
 * `import.meta.env`, no en tiempo de ejecución.
 *
 * Es de verificación manual, nunca de CI: depende de AWS, cuesta dinero por
 * invocación y su respuesta la decide un modelo no determinista. Sin
 * `E2E_BEDROCK_API_URL` no se registran ni el proyecto ni su servidor, de modo
 * que `npm run test:e2e` sigue siendo la suite local de siempre.
 *
 *   $env:E2E_BEDROCK_API_URL = 'https://<id>.execute-api.<region>.amazonaws.com/Prod/interrogate'
 *   npm run test:e2e -- --project=chromium-bedrock
 *
 * El origen del preview (`http://localhost:4174`) debe estar en el
 * `ALLOWED_ORIGINS` del despliegue o el endpoint responderá 403.
 */
const BEDROCK_PORT = 4174;
const BEDROCK_BASE_URL = `http://localhost:${String(BEDROCK_PORT)}`;
const BEDROCK_API_URL = process.env.E2E_BEDROCK_API_URL;
const BEDROCK_SPEC = '**/bedrock-interrogation.spec.ts';

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
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
      testIgnore: BEDROCK_SPEC,
    },
    ...(BEDROCK_API_URL === undefined
      ? []
      : [
          {
            name: 'chromium-bedrock',
            use: { ...devices['Desktop Chrome'], baseURL: BEDROCK_BASE_URL },
            testMatch: BEDROCK_SPEC,
            // Una llamada real a Bedrock tarda segundos: el tope por acción de
            // 10 s del proyecto local haría fallar la espera de la respuesta.
            timeout: 90_000,
          },
        ]),
  ],
  webServer: [
    {
      command: `npm run build && npm run preview -- --port ${String(PORT)} --strictPort`,
      url: BASE_URL,
      reuseExistingServer: !process.env.CI,
      timeout: 120_000,
    },
    ...(BEDROCK_API_URL === undefined
      ? []
      : [
          {
            command: `npm run build -- --outDir dist-bedrock && npm run preview -- --outDir dist-bedrock --port ${String(BEDROCK_PORT)} --strictPort`,
            url: BEDROCK_BASE_URL,
            env: {
              VITE_API_URL: BEDROCK_API_URL,
              VITE_INTERROGATION_MODE: 'bedrock',
            },
            reuseExistingServer: !process.env.CI,
            timeout: 120_000,
          },
        ]),
  ],
});
