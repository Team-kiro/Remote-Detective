---
inclusion: always
---

# Game Store Steering

Source: `.github/instructions/game-store.instructions.md`

- `src/store/` is the only state-mutation layer.
- Keep the public action surface minimal and unchanged unless explicitly required:
  - `startGame`, `openCaseFile`, `openEvidence`, `openAccusation`, `returnToDesktop`
  - `startCall`, `endCall`, `askQuestion`, `presentEvidence`, `submitAccusation`
  - `clearFeedback`, `triggerTimeDefeat`, `resetGame`
- Do not expose forbidden setters/internal actions (`setActiveView('call')`, `processResponse`, custom feedback setter).
- `askQuestion` accepts only text; `submitAccusation` accepts only `AccusationInput`.
- `presentEvidence` is atomic and checks confession using updated state.
- Timer defeat precedence and finalize flow must remain idempotent.
- Preserve strict pre-await and post-await guard ordering in `askQuestion`.
- Bedrock is optional and cannot change game rules:
  - accept only strict `{ text, statementId }` contract
  - discard entire invalid remote payload and use local candidate
  - fallback to suspect generic response when needed
- Keep final commit in one atomic `set()` with stale-request rechecks.
- Persistence rules:
  - persist active games only after significant events
  - persist `timerEndTimestamp`, never remaining time
  - never persist transient request/call/loading/feedback internals
  - validate hydrated payloads; degrade safely when storage unavailable

