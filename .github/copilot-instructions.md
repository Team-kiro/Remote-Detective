# GitHub Copilot Instructions

This repository's agent guidance lives in [`AGENTS.md`](../AGENTS.md) at the repository root. Read it first — it covers the architecture, the frozen narrative data, the layer boundaries, and the commands to run.

Path-specific rules live in [`.github/instructions/`](instructions/) and apply automatically to the files they match:

| File | Applies to |
|---|---|
| `narrative-data.instructions.md` | `remote-detective/src/data/**/*.ts` |
| `logic-engines.instructions.md` | `remote-detective/src/logic/**/*.ts` |
| `game-store.instructions.md` | `remote-detective/src/store/**/*.ts` |
| `react-ui.instructions.md` | `remote-detective/src/components/**/*.tsx` |
| `styles.instructions.md` | `remote-detective/src/**/*.css` |
| `unit-tests.instructions.md` | `**/*.test.{ts,tsx}` |

The product and visual system are defined in [`PRODUCT.md`](../PRODUCT.md) and [`DESIGN.md`](../DESIGN.md). The functional specification is in `remote-detective/.kiro/specs/remote-detective/` (`requirements.md`, `design.md`, `tasks.md`), mirrored in `remote-detective/openspec/` — keep both copies in sync.
