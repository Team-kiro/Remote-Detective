---
inclusion: always
---

# Unit Tests Steering

Source: `.github/instructions/unit-tests.instructions.md`

- Test stack: Vitest via `npm run test` from repo root.
- Keep tests deterministic with concrete values; no property-based generators.
- Co-locate tests and use `<module>.test.ts` / `<Component>.test.tsx`.
- Maintain explicit typing in test helpers/fixtures; no `any`.
- Prefer extending existing approved test groups over creating overlapping suites.
- Determinism rules:
  - pin time/IDs/expected numbers
  - reset store between tests
  - assert exact score/pressure/penalty values
- Cover happy path and failure branches, including:
  - once-only effects
  - boundary inputs (empty/whitespace, length limits, timer floor)
  - stale response cases
  - negative API assertions for forbidden public actions
- UI tests should use accessible queries and verify store-driven outcomes.

