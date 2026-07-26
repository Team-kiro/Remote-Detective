---
inclusion: always
---

# Logic Engines Steering

Source: `.github/instructions/logic-engines.instructions.md`

- `src/logic/` must stay pure and deterministic.
- No React, Zustand/store, components, or services imports.
- No argument mutation; return new values.
- No internal clock reads (`Date.now()`); pass time in as arguments.
- No randomness or I/O.
- Preserve engine contracts:
  - contradiction classification (`valid`, `already_discovered`, `incorrect`)
  - scoring formula and floor at 0
  - confession requires full conjunction of conditions
  - accusation checks culprit + motive + method + required evidence subset
  - timer floors negative time to 0
  - local response always returns fallback response
- Keep signatures aligned with spec/design.
- Use explicit parameter/return types; no `any`.
- Keep `Requirements:` trailers accurate when scope changes.

