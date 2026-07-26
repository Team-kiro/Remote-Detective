---
description: 'Zustand game store, its minimal public surface, async interrogation, and sessionStorage persistence'
applyTo: 'src/store/**/*.ts'
---

# Game Store Instructions

`src/store/` is the **only** place where game state changes. It composes the pure engines, owns the timer, the score, pressure, contradictions, call history, and the single accusation attempt, and it is the boundary that keeps the UI and Bedrock from inventing outcomes.

## The public surface is deliberately small

Available actions: `startGame`, `openCaseFile`, `openEvidence`, `openAccusation`, `returnToDesktop`, `startCall`, `endCall`, `askQuestion`, `presentEvidence`, `submitAccusation`, `clearFeedback`, `triggerTimeDefeat`, `resetGame`.

Actions that must **not** exist publicly:

- `setActiveView('call')` — the call view opens only through `startCall`, which is also the only generator of `callSessionId`
- `processResponse`, `registerStatement`, `triggerConfession` — outcomes are internal
- Any setter for `lastContradictionFeedback` — feedback is read-only for the UI

`askQuestion` accepts **only** question text. `submitAccusation` accepts **only** an `AccusationInput`. Neither ever accepts a `ChatMessage`, a `statementId`, a `requestId`, or a precomputed result.

## Contradictions and confession

- `presentEvidence(evidenceId, statementId)` is atomic: evaluate, apply points/pressure or the single penalty, then check confession **using the newly written pressure and contradiction set**, not the pre-update values
- Only statements already registered in the call history are valid targets
- The third mandatory Daniel contradiction during an active call with him, once the pressure threshold is met, finalizes the game as `victory_confession` inside the same action

## Finalization

- The timer takes precedence over an in-flight accusation or confession
- `finalizeGame` runs `calculateFinalScore` **exactly once**, replaces the score, includes the contradiction that just landed, stops the timer, and clears the active call, pending request, feedback, and loading
- A second finalization must not alter the result
- `timerEndTimestamp === null` during an active game is a safe `defeat_time`, never a crash

## `askQuestion`: guards and post-`await` order

Before creating a request ID, setting loading, or touching history, **all** of these must hold jointly: `phase === 'active'`, timestamp non-null and not expired, `activeView === 'call'`, `activeCallSuspect !== null`, `callSessionId !== null`, and a non-empty question of at most 300 characters. Any failed guard leaves the request ID, loading state, and history untouched.

After the `await`, the order is literal and must not be reordered:

1. `phase !== 'active'` — ignore
2. timestamp `null` — `defeat_time`, clear loading
3. timestamp expired — `defeat_time`, clear loading
4. wrong suspect — ignore silently
5. stale `callSessionId` — ignore silently
6. stale `currentRequestId` — ignore silently

Steps 2 and 3 run even when the suspect, session, or request are already stale; timer defeat does not depend on the request still being current.

## Bedrock is optional and cannot change a rule

- Bedrock is used only when the configured mode requires it and an endpoint exists; otherwise the local engine answers with no `fetch`
- A response is accepted only if it matches the contract exactly: `{ text, statementId }`, non-empty text of at most 500 characters, and a `statementId` that is known and owned by the answering suspect
- Any violation — invalid JSON, extra fields, wrong types, HTTP error, timeout — discards the **entire** Bedrock response, its text included, in favor of the complete local candidate
- A corrupt local candidate is replaced by that suspect's single generic response, revalidated before use; if both fail, end loading without touching history or statements
- `finalResponse` is revalidated defensively immediately before the commit

## The final commit

One atomic `set()` that adds only the accepted suspect message plus the canonical statement and clears loading. It reads the newest state, rechecks `state.currentRequestId === reqId`, creates fresh copies of `callHistory` and `registeredStatements`, preserves messages appended while awaiting, and returns state unchanged when the request is no longer current. The player's question was already recorded before the await and is never added twice.

`startCall`, `endCall`, `resetGame`, and `finalizeGame` all clear `isInterrogationLoading` explicitly; the two call actions also abort the previous request.

## Persistence (`persistence.ts`)

- Persist only active games, after significant events — never on a timer tick and never while a request is pending
- Persist `timerEndTimestamp`, never a literal remaining time
- Never persist `requestId`, `callSessionId`, `AbortController`, loading, feedback, or any transient pending state
- `Set` values serialize as arrays; validate version, types, and every narrative ID on hydration and return `null` for anything corrupt
- Hydration recomputes elapsed time from the real clock, issues a **new** `callSessionId` for a restored call, repairs inconsistent call/view combinations back to `desktop`, and never resumes a pending request
- An expired timestamp hydrates directly into `defeat_time`
- Degrade safely when `sessionStorage` is unavailable, and clear the session on finish or reset
