---
inclusion: always
---

# Playwright E2E Steering

Source: `.github/instructions/playwright.instructions.md`

- E2E stack: Playwright via `npm run test:e2e` from repo root; `npm run test:e2e:install` once per machine.
- `bedrock-interrogation.spec.ts` is manual-only: it hits a real deployed endpoint and is registered (project `chromium-bedrock`, preview on port 4174) only when `E2E_BEDROCK_API_URL` is set. Never in CI, never assert on model-generated content.
- Specs run against the production bundle served by `vite preview`; Chromium only.
- All specs live in `e2e-tests/` with the pattern `<feature-or-screen>.spec.ts`; never co-locate with `src/`.
- Vitest owns `src/**/*.test.{ts,tsx}`; Playwright owns `e2e-tests/**/*.spec.ts`.
- Prefer role-based locators (`getByRole`, `getByLabel`, `getByText`); use existing `data-testid` hooks only, never add new ones for tests.
- Rely on auto-waiting: no `waitForTimeout`, no `waitForLoadState`, no raised default timeouts. Only exception: the manual `chromium-bedrock` suite, which waits on a real network round trip.
- Use auto-retrying web-first assertions and prefer content/structure assertions over bare `toBeVisible()`.
- Assert the store-driven outcome, never a score or verdict recomputed inside the spec.
- Frozen narrative applies: four suspects, six evidences, Daniel Rivas / `motive_silence` / `method_poison` as the only victory.
- Keep the single-use accusation and the "cancel does not consume the attempt" coverage.
- Keep negative assertions that `_internal` metadata never reaches the DOM.
- Module headers stay in Spanish with their `Requisitos:` trailer.
