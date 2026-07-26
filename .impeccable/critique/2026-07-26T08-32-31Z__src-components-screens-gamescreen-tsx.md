---
target: src/components/screens/GameScreen.tsx
total_score: 28
max_score: 40
na_heuristics: 
p0_count: 0
p1_count: 2
timestamp: 2026-07-26T08-32-31Z
slug: src-components-screens-gamescreen-tsx
---
# Design Critique — Detective desktop (`src/components/screens/GameScreen.tsx`)

Method: dual-agent (A: assessment-a-1 · B: assessment-b-1)
Mode: Operate (the player is completing a task under a clock)
Run: second critique of this surface — previous run scored 26/40

## Design Health Score

| # | Heuristic | Score | Note |
|---|---|---|---|
| 1 | Visibility of system status | 3 | Timer escalates in three color levels with sr-only threshold announcements; score is a polite live region. The defeat screen still reveals nothing. |
| 2 | Match between system and real world | 2 | Accusing a murderer is three `<select>`s reading "Sin seleccionar" plus a checkbox grid. Noir paint, web-form model. |
| 3 | User control and freedom | 3 | Two-step confirm, cancel doesn't burn the attempt, "Volver al escritorio" everywhere. |
| 4 | Consistency and standards | 3 | Selects and checkboxes now custom-styled and on-token; emoji nav glyphs are the last off-key note. |
| 5 | Error prevention | 3 | Disabled-until-valid submit, explicit missing-field list, confirm on the irreversible act. |
| 6 | Recognition rather than recall | 3 | Four topic chips per suspect turned a dead-end loop into a teachable one. Free-text still guesses. |
| 7 | Flexibility and efficiency | 3 | Enter submits, Shift+Enter newlines. No suspect quick-switch, no evidence filter. |
| 8 | Aesthetic and minimalist design | 4 | Restrained, atmospheric, zero slop — and now internally consistent. |
| 9 | Recognize / recover from errors | 2 | Defeat gives no solution and no partial credit; the free-text fallback redirects nowhere. |
| 10 | Help and documentation | 2 | "Cómo jugar" is well-structured but reachable only from the title screen. |
| | **Total** | **28 / 40** | up from 26/40 |

## Design specificity verdict

**Authored on the surface, borrowed underneath — but the gap narrowed.**

The noir identity earns its keep in the shell: the confidential-file kicker, the serif headline, one rust accent, ambient office photography under a scrim, cinematic portraits. The defeat screen is genuinely filmic. Two things got measurably *more* specific this round: the accusation controls stopped being OS chrome (`appearance: none`, custom caret, 44px, rust `accent-color`), and section headings became a rust kicker plus an ivory serif headline instead of illegible rust body text.

Strip the skin, though, and the *interaction grammar* is still category-interchangeable. Evidence is textbook master–detail. Interrogation is a support-ticket thread. The one truly game-native mechanic — drag evidence onto a lie — is still below the fold at the bottom of a scrolling call panel.

## What's working

1. **The chip scaffold turned a broken loop into a teachable one.** Click "Hora de llegada" → an editable, in-character question → an answer that materializes as a labelled drop target. The mechanic the whole game exists to serve now teaches itself inside the clock, without removing the free-text box.
2. **The custom noir form controls.** The last place the operating system leaked through is sealed.
3. **Consequence-weighted confirmation.** Filled-rust "Confirmar" beside a ghost "Cancelar", with the accusation restated in prose. For one irreversible act under time pressure, the button weight finally tracks the stakes.

## Verification of the previous critique's fixes

| Prior finding | Status | Measured |
|---|---|---|
| P0 interrogation dead-ends silently | Core landed, fallback not | Chips register statements reliably; the generic fallback copy is unchanged |
| P1 heading contrast 3.41:1 | Fixed | 13.86–13.97:1 (`#e7e2d5` on `#161616`) |
| P1 overflow below 400px | Fixed | 360px: `scrollWidth 345 === clientWidth 345`, zero overflowing elements |
| P1 climactic button quietest | Fixed | Filled rust primary, ghost secondary, both 44px |
| P2 no felt time pressure | Partial | Three color levels + announcements; **zero animations exist in the codebase**, so no pulse |
| P2 12.31 MB of images | Fixed | ≈0.11 MB WebP — a 99% cut |
| Native select/checkbox chrome | Fixed | Custom caret, 44px; checkboxes 13×13 → 18×18 |
| 32 off-ramp font sizes | Fixed | **0** — detector exit code 0, verified live with a crafted failing fixture |
| Touch targets 40/42/43px | Fixed | All ≥44px except the two noted below |

## Priority issues

### P1 — The ending reveals nothing and rewards nothing

`EndScreen.tsx:44` says only "La acusación confirmada no coincide con la solución del caso" with a score of 0. There is no reveal of the real culprit, motive or method, and no axis-by-axis breakdown. A player who names the right killer but the wrong motive gets the same blank zero as one who guessed at random. This is the peak-end moment of a twelve-minute narrative investment, and it's a locked door. For a screen-reader player it's worse: "Derrota", and nothing else.

Fix: reveal the solution on both outcomes and break the accusation down per axis (✓ suspect, ✗ motive, ✓ method). Consider partial score for a correct suspect.

`$impeccable clarify src/components/screens/EndScreen.tsx`

### P1 — The free-text interrogation still dead-ends without redirecting

`localResponses.ts:87` returns "No sé qué quieres que te diga. Ya expliqué todo lo que sé sobre esa noche." — no pointer to the chips sitting directly above the textarea. The chips rescue players who use them; players who type first, which is the instinctive move in a chat box, still hit a wall and burn clock. The trap sits right beside the ladder.

Fix: make the fallback self-referential — "Esa pregunta no reveló nada nuevo. Prueba con un tema de arriba, como su coartada o el veneno."

`$impeccable clarify src/data/localResponses.ts`

### P2 — The confirmation "dialog" is not modal

`AccusationPanel.tsx:209` carries `role="dialog"` but renders inline at the bottom of the panel, with no backdrop, no focus trap, and a still-enabled "Presentar acusación" above it. Two identical filled-rust buttons are on screen simultaneously. At 360px on the long form it can land below the fold.

Fix: centered overlay with a scrim and a focus trap; disable or hide "Presentar" while it's open.

`$impeccable harden src/components/desktop/AccusationPanel.tsx`

### P2 — Time pressure is color-only

The countdown escalates by color and announces at thresholds, but the codebase contains **zero** `transition`, `animation` or `@keyframes` rules — the `prefers-reduced-motion` guard in `global.css` is currently a no-op. There is no distinct final-minute beat. A head-down player is ambushed rather than tensed. The clock is the entire hook and it whispers.

Fix: one scale/pulse on the critical timer behind the existing reduced-motion guard, plus a one-minute announcement.

`$impeccable animate src/components/shared/Timer.tsx`

### P3 — Two remaining small targets

Six accusation checkboxes at **18×18px** (mitigated by full-row `<label>` hit areas) and six call-view evidence chips at **149×33px** — the chips double as the keyboard-drag sources, so the short height is the more consequential of the two.

`$impeccable adapt src/components/call/CallPanel.module.css`

## Persona red flags

- **First-time player who skipped the manual.** Better served than last round — the chips give her a foothold. But typing first still yields the flat fallback, help is unreachable once the timer starts, and the ending tells her nothing.
- **Screen-reader user.** Score and call feedback are now announced, the double-announcing pressure meter is fixed, focus is visible on all 26 tab stops. Remaining gap: `role="timer"` is still `aria-live="off"` (mitigated by the parallel status region) and the ending conveys the outcome but not the story.
- **Keyboard-first player.** Enter-to-submit landed. Keyboard drag-and-drop was verified end to end: focus → Space ("Picked up draggable item") → arrows ("moved over droppable area") → Space ("dropped over"). It genuinely works — it's just explained in one prose sentence with no visible affordance on the chips.

## Minor observations

- Heading inversion: the dominant serif title is a `<p>` while the tiny uppercase kicker is the `<h2>`. The outline doesn't match the visual hierarchy.
- Emoji nav glyphs (🗄️📁🔍📞⚖️) render as color emoji against serif uppercase labels — the one un-noir note in a disciplined system.
- At 768px the suspect role label wraps and crowds "Presión: 0%".
- Evidence "Detalle" is a large empty column with a bare empty state until something is selected.
- Category tags (DIGITAL / DOCUMENTO / FÍSICA) never filter, sort or chunk anything.
- Four identical "Presión: 0%" meters at game start are four zero-information bars.
- "Terminar llamada" wears a rust border implying danger for a benign, reversible action.
- An empty `<span role="status">` sits in the header carrying no text.
- Suspect portraits are 800×800 natural, rendered at 72px on tablet, with no `srcset` — now trivial in bytes, still dimensionally oversized.

## Questions

1. The player can name the correct killer and be told only "no coincide", score 0. Is withholding the solution a deliberate anti-spoiler rule, or just unfinished — and does the frozen narrative spec allow the ending to reveal it?
2. The chips fixed discoverability by handing over the questions. Once Bedrock lands, do the chips disappear, or become a hint tier?
3. Should the accusation stay a form, or become a case board where the player drags the guilty face and the damning evidence they already touched?
4. Is a strict all-or-nothing score intended, or would partial credit for the right suspect better match the fiction?

## Run Notes

- Two isolated agents; B's detector output was not read until A's subjective review had landed.
- Detector: `detect.mjs --json src/components src/styles index.html` → exit 0, `[]`. Verified live with a crafted failing CSS fixture (fired `design-system-color`, exit 2), so the clean result is real, not a silent no-op.
- Measurements at 1440×900, 768×1024, 360×740 across title, instructions, desktop, expediente, evidencias, call (empty and answered), accusation (empty, filled, confirm) and an end screen.
- Console across the whole session: 0 errors, 0 warnings.
- Not measured: the sub-2:00 timer recolor live (clock not run down); a matching evidence↔statement pair (mechanic verified, resolution state not observed).
- Scored over the full 40; no heuristic was N/A.
