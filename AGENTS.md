# Remote Detective — Development Guidelines

Remote Detective is a **noir criminal-investigation game** built as a single **React 19 + TypeScript + Vite** SPA rooted at the repository root. The player works from a virtual detective desktop, inspects evidence, interrogates four suspects, proves contradictions via drag-and-drop, and files one final accusation before a 12-minute timer runs out.

The defining architectural rule of this project: **a complete game must be winnable and losable with local deterministic logic only.** Amazon Bedrock, AWS Lambda, API Gateway, and `sessionStorage` are important for the presentation but must never block the build, the deploy, or a full playthrough.

Specs are the source of truth. Read them before changing behavior:

- `.kiro/specs/remote-detective/requirements.md` — numbered EARS requirements (`_Requirements: 8.2-8.9_` references in code and tasks point here)
- `.kiro/specs/remote-detective/design.md` — frozen narrative data, engine signatures, store surface, and the 31 Correctness Properties
- `.kiro/specs/remote-detective/tasks.md` — the implementation plan and its completion state
- `openspec/specs/` — mirror of the same three documents for the OpenSpec tooling

## Agent notes

- Explore the project and read the relevant spec sections before generating code
- Create todo lists for long operations
  - Before each step in a todo list, reread the instructions to ensure you always have the right directions
- Always use instructions files when available, reviewing before generating code
- Do not generate summary markdown files upon completion of a task
- Always use absolute paths when running scripts and shell commands
- Once a PR exists, comment on it every time you push new changes, so the review history explains what moved and why
- **NEVER commit or push to main automatically unless explicitly instructed to do so**

## Code standards

### Required before each commit

#### Testing guidelines

- Run `npm run test` (Vitest, non-interactive) and `npm run lint` (ESLint, `--max-warnings 0`) before every commit
- Run `npm run test:e2e` (Playwright, Chromium against the production bundle) when a change touches screens, navigation, or the accusation flow
- Run `npm run build` for any change that touches types, components, or config — the build is the TypeScript gate
- Tests are **deterministic Vitest cases with concrete values**. Do not introduce `fast-check` or property-based testing; the design explicitly rejects it
- Review existing tests before adding new ones; the seven approved test groups already cover the 31 Correctness Properties and duplicating them is waste
- Test code is production code: same typing discipline, same DRY expectations
- When you change an engine, the store, or persistence, update the co-located test file in the same change
- Vitest owns `frontend/src/**/*.test.{ts,tsx}`; Playwright owns `frontend/e2e-tests/**/*.spec.ts`. E2E specs verify player-visible flows, never engine arithmetic

#### Project guidelines

- When a task from `tasks.md` is completed, tick its checkbox in **both** `.kiro/specs/` and `openspec/specs/` copies so the two stay in sync
- When adding new functionality, update `README.md` and the relevant instruction files
- Never add narrative content: four suspects, six evidence items, six canonical statements, six contradictions, and Daniel Rivas as the culprit are **frozen** by the spec
- Never expose `_internal` metadata (narrative relevance, related suspects, resolved contradiction) to the rendered UI — route presentation data through `frontend/src/data/viewModels.ts`

### Code formatting requirements

- TypeScript strict mode; explicit types on function parameters and return values, especially in `frontend/src/data/`, `frontend/src/logic/`, and `frontend/src/store/`
- `@typescript-eslint/no-explicit-any` is an **error** — `any` is banned in exported APIs
- Prefer `interface` for object shapes and `import type` for type-only imports
- Import intra-project modules through the `@/` alias (`@/store/gameStore`), not deep relative chains
- All code must pass `typescript-eslint` `strictTypeChecked`

### Comment and documentation standards

- Comment intent, decisions, and constraints — not mechanics. Explain *why* code exists, why a tradeoff was chosen, or why a non-obvious edge case matters. Delete comments that only restate the next line
- Keep the requirement trailers (`Requirements: 6.3-6.11, 16.1-16.6`) in module headers current when scope changes; treat a stale trailer as a bug
- Keep comments in the language already used by the file (module docs in this codebase are Spanish)
- Avoid inline ESLint disables. If one is unavoidable, include a short justification

## Layer architecture

The strict separation between the four layers is what makes the game auditable. Each layer has its own instructions file.

| Layer | Path | Rule | Instructions |
|---|---|---|---|
| Narrative data | `frontend/src/data/` | Frozen constants and types. No React, no store, no logic imports | `narrative-data.instructions.md` |
| Logic engines | `frontend/src/logic/` | Pure deterministic functions. No React, no Zustand, no network | `logic-engines.instructions.md` |
| State | `frontend/src/store/` | The only place game rules mutate state. Owns the minimal public surface | `game-store.instructions.md` |
| UI | `frontend/src/components/` | Renders state and calls public actions. Cannot fabricate outcomes | `react-ui.instructions.md` |
| E2E | `frontend/e2e-tests/` | Playwright specs over the built app. Verify flows, not engine arithmetic | `playwright.instructions.md` |

Two cross-cutting rules that no layer may break:

1. **The UI cannot manufacture a game outcome.** It passes question *text* to `askQuestion` and an `AccusationInput` to `submitAccusation`; the store decides feedback, pressure, score, confession, victory, and defeat.
2. **Bedrock cannot change a game rule.** Any response that fails the full contract (`{ text, statementId }`, text non-empty and ≤500 chars, `statementId` known and belonging to the answering suspect) is discarded *in its entirety* — text included — in favor of the complete local candidate response.

## Scripts

All scripts run from the repository root, which is a script router — it forwards to
`frontend/` (or `backend/`) so the two packages install and version independently:

- `npm run install:all` — install both packages (`npm ci` in `frontend/` and `backend/`)
- `npm run dev` — start the Vite dev server
- `npm run preview` — serve the production bundle locally (used by the E2E suite)
- `npm run test` — run the Vitest suite once, non-interactive
- `npm run test:e2e` — run the Playwright E2E suite (builds and previews automatically)
- `npm run test:e2e:install` — download the Chromium binary Playwright needs (once per machine)
- `npm run build` — type-check (`tsc -b`) and produce the production bundle
- `npm run typecheck` — type-check without emitting
- `npm run lint` — ESLint with `--max-warnings 0`
- `npm run backend:build` / `npm run backend:test` — the Lambda package's own gates

CI (`.github/workflows/run-tests.yml`) runs lint, type-check, unit tests, and the E2E suite as four parallel jobs on pull requests to `main` and pushes to `main`, plus an independent `backend` job that builds and tests the Lambda package and then verifies with `sam validate --lint` and `sam build` that the deployable artifact is actually produced. `copilot-setup-steps.yml` preinstalls dependencies and the Chromium binary for the coding agent.

## Repository structure

The two packages are deliberately separate: each keeps its own `package.json` and
`package-lock.json` so the backend's absence or failure can never block the
frontend's build, tests, or deploy (requirement 17.7), and so SAM can package
`backend/` on its own.

```
Remote-Detective/
├── package.json                       # script router only; no dependencies
├── AGENTS.md, PRODUCT.md, DESIGN.md   # agent, product, and visual design context
├── .github/instructions/              # path-scoped agent instruction files
├── .github/workflows/                 # CI: lint, type-check, unit tests, E2E, backend
├── .kiro/specs/remote-detective/      # requirements.md, design.md, tasks.md
├── .kiro/steering/                    # Kiro mirror of the instruction files
├── openspec/specs/                    # OpenSpec mirror of the same specs
├── frontend/
│   ├── e2e-tests/                     # Playwright specs (*.spec.ts)
│   ├── src/
│   │   ├── data/                      # frozen narrative data, types, view models
│   │   ├── logic/                     # pure deterministic engines
│   │   ├── store/                     # Zustand store, persistence, store types
│   │   ├── services/                  # bedrockService.ts (optional remote path)
│   │   ├── components/{screens,desktop,shared}/
│   │   ├── hooks/                     # useTimer
│   │   ├── assets/{suspects,evidence,backgrounds,ui}/
│   │   ├── styles/global.css
│   │   └── config.ts                  # timer duration, timeout, interrogation mode
│   └── vite.config.ts, vitest.config.ts, playwright.config.ts, eslint.config.js, tsconfig*.json
└── backend/
    ├── src/                           # validator, promptBuilder, bedrockClient, handler
    ├── src/__tests__/                 # Jest suite (test group (g))
    └── template.yaml, tsconfig.json, jest.config.js
```

## Out of scope

The MVP explicitly excludes: authentication, databases, S3, multiplayer, multiple cases, difficulty selection, a case editor, leaderboards, payments, chat, a native mobile app, hidden or unlockable evidence, and advanced touch drag-and-drop. Do not add them.
