# GitHub Copilot Instructions

This repository's agent guidance lives in [`AGENTS.md`](../AGENTS.md) at the repository root. Read it first — it covers the architecture, the frozen narrative data, the layer boundaries, and the commands to run.

Path-specific rules live in [`.github/instructions/`](instructions/) and apply automatically to the files they match:

| File | Applies to |
|---|---|
| `narrative-data.instructions.md` | `src/data/**/*.ts` |
| `logic-engines.instructions.md` | `src/logic/**/*.ts` |
| `game-store.instructions.md` | `src/store/**/*.ts` |
| `react-ui.instructions.md` | `src/components/**/*.tsx` |
| `styles.instructions.md` | `src/**/*.css` |
| `unit-tests.instructions.md` | `**/*.test.{ts,tsx}` |
| `playwright.instructions.md` | `**/*.spec.ts` |

The product and visual system are defined in [`PRODUCT.md`](../PRODUCT.md) and [`DESIGN.md`](../DESIGN.md). The functional specification is in `.kiro/specs/remote-detective/` (`requirements.md`, `design.md`, `tasks.md`), mirrored in `openspec/` — keep both copies in sync.
