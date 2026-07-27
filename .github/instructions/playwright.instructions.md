---
description: 'Playwright end-to-end tests for the detective desktop flows'
applyTo: 'frontend/e2e-tests/**/*.spec.ts'
---

# End-to-End Testing Guidelines (Playwright)

The E2E suite runs with `npm run test:e2e` from the repository root, against the **production bundle** served by `vite preview` (the `webServer` block in `playwright.config.ts` builds it first). The build is this project's TypeScript gate, so an E2E run also proves the deployed artifact boots.

Run `npm run test:e2e:install` once per machine to download Chromium.

## Suite manual contra Bedrock

`bedrock-interrogation.spec.ts` es la excepción: corre contra un endpoint desplegado de verdad, así que es **verificación manual y nunca CI** (depende de AWS, cuesta por invocación y la respuesta la decide un modelo no determinista).

Solo se registra —proyecto `chromium-bedrock` y su preview en el puerto 4174— cuando `E2E_BEDROCK_API_URL` está definida; sin ella `npm run test:e2e` es la suite local de siempre:

```powershell
$env:E2E_BEDROCK_API_URL = 'https://<id>.execute-api.<region>.amazonaws.com/Prod/interrogate'
npm run test:e2e -- --project=chromium-bedrock
```

Necesita su propio build porque `interrogationMode` se resuelve desde `import.meta.env` en tiempo de build. El origen `http://localhost:4174` debe estar en el `ALLOWED_ORIGINS` del despliegue o el endpoint responde 403. Nunca aserciones sobre el *contenido* que devuelve el modelo: solo sobre lo estable (qué viaja en la petición, que la respuesta llega al historial).

> [!IMPORTANT]
> E2E tests are the *outer* ring. They verify that a player can traverse the screens and that the store-driven outcome reaches the DOM. They never re-verify engine arithmetic — the 31 Correctness Properties belong to the Vitest suites described in `unit-tests.instructions.md`.

## File structure

- All specs live in `e2e-tests/` at the repository root — never co-located with `src/`
- Name pattern `<feature-or-screen>.spec.ts` (`title-screen.spec.ts`, `desktop.spec.ts`, `accusation.spec.ts`)
- One file per major screen or flow; extend an existing file before adding a new one
- Vitest owns `src/**/*.test.{ts,tsx}` and Playwright owns `e2e-tests/**/*.spec.ts`; the `include` in `vitest.config.ts` keeps the two from colliding

## Writing specs

- Start with `import { expect, test } from '@playwright/test';`
- Group a screen under `test.describe()` and put the shared navigation in `beforeEach`
- Title convention: `Pantalla o flujo - acción o escenario concreto`
- Module headers stay in Spanish with their `Requisitos:` trailer, like the rest of the codebase
- Use `test.step()` to group multi-action sequences that deserve their own reporting line

## Locators and assertions

- Prefer user-facing, role-based locators: `getByRole`, `getByLabel`, `getByText`. Fall back to `getByTestId` only for the hooks the UI already exposes (`hud-timer`, `hud-score`, `accusation-submit`, `accusation-confirm`, `accusation-confirm-submit`, `accusation-cancel`, `final-score`)
- Never add a `data-testid` to a component just to make a spec easier — find the accessible name instead
- Rely on Playwright auto-waiting. `waitForTimeout`, `waitForLoadState`, and raised default timeouts are banned
- Use auto-retrying web-first assertions (`await expect(...)`). Prefer `toHaveText`, `toContainText`, `toHaveCount`, `toHaveAttribute`, `toHaveURL` over a bare `toBeVisible()` when content or structure is the point
- Assert the *store's* outcome, never a recomputation of it: check the end-screen heading and `final-score`, not a score you calculated in the spec

## Game-specific rules

- The narrative is frozen: four suspects, six evidence items, `Daniel Rivas` as the culprit, `motive_silence`, `method_poison`. A spec that needs different content is a spec that needs deleting
- A victory accusation requires all four `requiredEvidenceIds`; extras are allowed, so checking every evidence box is the stable way to reach victory
- The accusation is single-use per game. Cancelling the confirmation must **not** consume it — that is a real requirement (12.x), so keep the test
- `_internal` metadata must never reach the DOM; negative assertions on the desktop and evidence panels guard that
- Each test gets a fresh browser context, so `sessionStorage` persistence starts empty. Do not assume state from a previous test

## Quality checklist

Before finalizing specs, ensure:
- [ ] Locators are accessible, specific, and free of strict-mode violations
- [ ] No hard-coded waits and no inflated timeouts
- [ ] Assertions reflect what a player sees, not internal state
- [ ] `npm run lint` passes — specs are type-checked under `tsconfig.node.json`
- [ ] `npm run test:e2e` passes locally before commit
