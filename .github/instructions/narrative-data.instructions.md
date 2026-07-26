---
description: 'Frozen narrative data, stable identifiers, and view models'
applyTo: 'frontend/src/data/**/*.ts'
---

# Narrative Data Instructions

`src/data/` holds the **frozen** case: the suspects, evidence, statements, contradictions, solution, local response catalogue, scoring rules, and accusation options approved in `design.md`. This layer is data and types only.

> [!IMPORTANT]
> The case is closed content, not a feature surface. Adding a suspect, an evidence item, a contradiction, or changing the culprit breaks the approved solution path and every test group that verifies it.

## Hard constraints

These counts are verified by `narrativeData.test.ts` and `narrativeRules.test.ts`:

- Exactly **4** suspects (`daniel`, `elena`, `roberto`, `sofia`); Daniel Rivas is the culprit
- Exactly **6** evidence items, all available from the start — there is no unlock mechanic
- Exactly **6** canonical statements, one usable statement per contradiction
- Exactly **6** contradictions, distributed 3 (Daniel) / 1 / 1 / 1
- **>=5** specific local responses plus **exactly 1** generic response per suspect
- Every required statement must be reachable through **at least two** reasonable phrasings

## Purity rules

- No imports from React, Zustand, `src/store/`, `src/logic/`, or `src/services/`
- No side effects at module scope beyond declaring constants
- Values are literal and deterministic — never `Math.random()`, `Date.now()`, or environment lookups

## Types and identifiers

- Every domain identifier is a string-literal union in `types.ts` (`SuspectId`, `EvidenceId`, `StatementId`, `ContradictionId`, `MotiveId`, `MethodId`). Widening one of these to `string` is a defect
- Export data with `as const` or an explicit typed annotation so a typo becomes a compile error
- Cross-references (a contradiction's `evidenceId` / `statementId`, the solution's `requiredEvidenceIds`) must resolve to declared IDs

## Internal metadata

- `EvidenceDef._internal` (`relevance`, `relatedSuspects`) and any "which contradiction does this solve" knowledge is **game logic only**
- The UI never reads these fields. Presentation shapes live in `viewModels.ts` and must omit them by construction, not by the component choosing not to render them

## Local responses

- Keyword groups match only when **every** term in the group is present in the normalized input; one matching group is enough
- Ties resolve by the more specific group (more terms) first, then by higher `priority`
- Only a `statementId` declared in `statements.ts` and owned by the same suspect may appear on a response
- The generic response per suspect must stay in character and have a stable ID — it is the guaranteed fallback and is asserted by tests
