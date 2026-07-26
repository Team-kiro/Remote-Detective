---
description: 'React 19 components, CSS Modules, drag-and-drop, and the read-only UI contract'
applyTo: 'remote-detective/src/components/**/*.tsx'
---

# React UI Instructions

Components render state and call public store actions. They are the **presentation layer only** — they never compute or fabricate a game outcome.

## The UI contract

- Pass question **text** to `askQuestion`, and an `AccusationInput` to `submitAccusation`. Never a `ChatMessage`, a `statementId`, a `requestId`, or a result
- Drag-and-drop calls `presentEvidence(evidenceId, statementId)` and nothing else; the store decides valid / already discovered / related-but-insufficient / incorrect, and whether a confession fires
- Read `lastContradictionFeedback`; never write it
- Render statements using their canonical text from the store, never text assembled in a component
- Never render `_internal` metadata: narrative relevance, related suspects, or which contradiction an evidence resolves. Consume `src/data/viewModels.ts`

## Component structure

- Function components with an explicit `React.JSX.Element` return type; typed `Props` interfaces exported alongside the component
- Subscribe with narrow selectors (`useGameStore((state) => state.score)`) — never destructure the whole store
- Do not duplicate global state in `useState`. Local state is for presentation-only concerns (an open panel, a draft input)
- Wrap handlers passed to children in `useCallback` to keep the React Compiler and `react-hooks` rules satisfied
- Keep the module header comment naming the component's job and its `Requirements:` trailer

## Views and navigation

- The persistent HUD (timer in `mm:ss`, score) stays visible in every active-game view: desktop, case file, evidence, call, and accusation
- Every view offers a visible way back to the desktop without losing game state
- The call view is entered only through `startCall`

## Accessibility

- Semantic landmarks and headings; associate every heading with its region via `aria-labelledby`
- Every interactive control is a real `button`, `input`, or `select` with an accessible name
- Keep visible `:focus-visible` styling; drag-and-drop must be operable by keyboard as well as pointer
- Disabled submit states must also explain why (missing fields, attempt already used)

## Styling

- One co-located CSS Module per component (`Component.module.css`), imported via the `@/` alias
- Follow the tokens in `DESIGN.md`; do not introduce colors or fonts that are not documented there
- Below 1024px reflow to a single column, keep the HUD legible, and surface the "play on a computer" recommendation rather than building advanced touch drag-and-drop
