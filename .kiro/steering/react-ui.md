---
inclusion: always
---

# React UI Steering

Source: `.github/instructions/react-ui.instructions.md`

- UI renders state and calls store actions; it never computes outcomes.
- Pass question text to `askQuestion`; pass `AccusationInput` to `submitAccusation`.
- Drag-and-drop only calls `presentEvidence(evidenceId, statementId)`.
- Read `lastContradictionFeedback`; do not write it.
- Render canonical statement text from store only.
- Never render `_internal` narrative metadata; use `src/data/viewModels.ts`.
- Keep typed function components with explicit `React.JSX.Element` return.
- Use narrow store selectors; avoid full-state subscriptions.
- Use local state only for presentation concerns.
- Keep call view entrance through `startCall` only.
- Preserve accessibility basics:
  - semantic regions/headings
  - real form controls with accessible names
  - visible `:focus-visible`
  - keyboard-operable drag-and-drop
- Keep CSS module usage and design token alignment from `DESIGN.md`.

