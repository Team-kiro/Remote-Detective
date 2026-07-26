---
description: 'Deterministic Vitest guidelines for narrative data, engines, store, and UI flows'
applyTo: '**/*.test.{ts,tsx}'
---

# Unit Testing Guidelines (Vitest)

Tests run with `npm run test` from the repository root (Vitest, single non-interactive run). They are the mechanism that keeps the 31 Correctness Properties in `design.md` honest.

Vitest owns `src/**/*.test.{ts,tsx}` only. Player-visible flows over the built app belong to the Playwright suite in `e2e-tests/` — see `playwright.instructions.md`.

> [!IMPORTANT]
> Tests are **deterministic cases with concrete values**. `fast-check` and property-based generation are explicitly rejected by the design. Pin time, pin IDs, pin expected numbers.

## File structure

- Co-locate tests next to the code: `contradictionEngine.test.ts` beside `contradictionEngine.ts`
- Name pattern `<module>.test.ts`, or `<Component>.test.tsx` for UI
- `describe('<module / behavior>')` blocks with `it('does X when Y')` cases
- Explicit type annotations on helpers and fixtures — this codebase bans `any`

## The seven approved test groups

Before adding a file, check which group already owns the scenario:

| Group | Scope |
|---|---|
| (a) | Narrative integrity and the local response engine |
| (b) | Contradictions, pressure, confession, scoring |
| (c) | Accusation, timer, finalization, reset |
| (d) | Persistence and hydration |
| (e) | Async interrogation, fallback, concurrency |
| (f) | Public surface and critical UI flows |
| (g) | Backend contract |

Extending an existing group beats creating a parallel file that re-covers the same property.

## Determinism

- Never assert against the real clock. Pass explicit timestamps to engines and use fake timers or injected values in the store
- Never depend on test execution order; reset the store between cases
- Assert exact numbers for score, pressure, and penalties — the catalogued values are the contract

## Required coverage patterns

- **Happy path plus every failure branch.** A guard is only proven by a case where it fails in isolation
- **Once-only effects:** a valid contradiction awards points once, a penalty applies once, `calculateFinalScore` runs once
- **Boundaries:** empty input, whitespace-only input, exactly 300 and 301 characters, 500-character Bedrock text, score floor at 0, negative remaining time
- **Staleness:** wrong suspect, stale `callSessionId`, stale `requestId`, response after game end — each must change nothing
- **Negative API assertions:** confirm forbidden actions do not exist on the public surface (no `setActiveView('call')`, no `processResponse`, no feedback setter)

## UI tests

- Use Testing Library queries by role and accessible name, not by class name or test-id where a role exists
- Drive flows through user-visible interactions; assert that the UI called `presentEvidence` / `askQuestion` and rendered the store's result, not that it produced one
- Assert the absence of internal metadata in rendered output

## Best practices

- Arrange-Act-Assert, one behavior per `it`
- Assert the cheap thing first (counts, phase, score) before deep object shape
- Keep fixtures minimal but representative of the real relationships (suspect → statement → contradiction → evidence)
- Comment only non-obvious fixture setup; prefer descriptive test names over comments that restate the code
