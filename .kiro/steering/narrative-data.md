---
inclusion: always
---

# Narrative Data Steering

Source: `.github/instructions/narrative-data.instructions.md`

- Keep `src/data/` as frozen case data and types only.
- Do not add or change core narrative counts (4 suspects, 6 evidence, 6 canonical statements, 6 contradictions).
- Keep Daniel Rivas as culprit.
- No React, store, logic, or service imports in this layer.
- No randomness, clock, env lookups, or side effects.
- Keep ID unions strict (`SuspectId`, `EvidenceId`, `StatementId`, etc.); never widen to `string`.
- Export deterministic constants with `as const` or explicit typing.
- Keep cross-reference integrity between IDs (contradictions, solution, required evidence).
- Do not expose `_internal` metadata to UI; UI uses `src/data/viewModels.ts`.
- Local response rules:
  - Match keyword group only when all terms in group are present.
  - Prefer more specific groups first, then `priority`.
  - Response `statementId` must exist and belong to answering suspect.
  - Keep exactly one stable generic fallback response per suspect.

