---
description: 'Pure deterministic engines for contradictions, scoring, confession, accusation, timer, and local responses'
applyTo: 'frontend/src/logic/**/*.ts'
---

# Logic Engine Instructions

`src/logic/` contains the deterministic rules of the game as **pure functions**. They are the only place where a game outcome is computed, and they are computable without a browser, a store, or a network.

## Purity contract

- No imports from React, Zustand, `src/store/`, `src/components/`, or `src/services/`
- No mutation of arguments — return new values; never mutate a passed `Set` or array
- No `Date.now()` inside an engine. Time enters as an explicit `endTimestamp` argument so tests can pin it
- Same inputs always produce the same output. No randomness, no clock, no I/O

## Engine responsibilities

| Engine | Contract |
|---|---|
| `contradictionEngine` | Classifies an evidence/statement pair as `valid`, `already_discovered`, or `incorrect` against local data only |
| `scoringEngine` | `baseScore = sum(discovered points) - incorrectAttempts * penalty`, floored at 0; the final score adds the victory bonus and `floor(timeRemainingMs / 1000) * factor` |
| `confessionEngine` | Returns `true` only when **all** conditions hold: game active, call active, timer active, the called suspect is the culprit, pressure >= threshold, and all mandatory contradictions discovered |
| `accusationEngine` | Compares culprit, motive, method, and required-evidence subset; extra evidence is allowed, missing required evidence is not |
| `timerEngine` | Computes remaining ms / seconds and expiry from a timestamp, floored at 0 |
| `localResponseEngine` | Normalizes input, resolves the best keyword match, and **always** returns a `LocalResponseDef` |

## Rules that tests enforce

- A valid contradiction awards its catalogued points and pressure **exactly once**; a repeat is `already_discovered` and changes nothing
- An incorrect combination applies **one** penalty and the score never drops below 0
- Confession requires the full conjunction — every partial combination must return `false`, including an expired timer or a `null` called suspect (which must not throw)
- Negative or expired remaining time is treated as `0`, never as a negative bonus
- `normalizeInput` lowercases, strips diacritics (NFD), removes punctuation, collapses whitespace, and trims; empty input and input over 300 characters normalize to `''`
- `getLocalResponse` never returns `null`: on no match it falls back to the suspect's single generic response

## Style

- Export one clearly named function per rule; keep the signature from `design.md` intact so the store and tests stay aligned
- Explicit parameter and return types; no `any`
- Document the *why* of a threshold or an ordering rule, not the mechanics of the code
- Keep the `Requirements:` trailer in the module header accurate when the scope of a function changes
