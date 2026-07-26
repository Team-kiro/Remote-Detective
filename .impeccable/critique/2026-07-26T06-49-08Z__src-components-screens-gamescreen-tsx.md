---
target: in-game experience (GameScreen)
total_score: 26
max_score: 40
na_heuristics: 
p0_count: 1
p1_count: 3
timestamp: 2026-07-26T06-49-08Z
slug: src-components-screens-gamescreen-tsx
---
Method: dual-agent (A: assessment-a · B: assessment-b)

Target: the in-game experience, anchored at `src/components/screens/GameScreen.tsx`. Mode: **Operate** — the player is completing a task (solve the case) under a hard timer, so all ten heuristics apply.

## Design Health Score

| # | Heuristic | Score | Key Issue |
|---|-----------|-------|-----------|
| 1 | Visibility of System Status | 3 | Timer, score, pressure %, loading state and char count are all present. But `role="timer"` carries `aria-live="off"` and `ScoreDisplay` has no role at all — the two numbers that define the session are silent to assistive tech. |
| 2 | Match System / Real World | 2 | Accusing a murderer is modeled as three "Sin seleccionar" dropdowns plus a checkbox grid. Interrogation is a support-ticket thread. The mental model is *web form*, not *detective*. |
| 3 | User Control and Freedom | 3 | "Volver al escritorio" is everywhere and the accusation has a real two-step confirm. "Terminar llamada" has no confirm and doesn't reassure that history survives. |
| 4 | Consistency and Standards | 3 | Color, spacing and radius are rigorously tokenized (detector: zero findings in all three). But 32 off-ramp font sizes and native OS `<select>`/checkbox chrome break the system at its most-used controls. |
| 5 | Error Prevention | 3 | Submit disabled until valid, explicit missing-field list, confirm dialog on the irreversible act. Nothing warns before ending a call or before time expires. |
| 6 | Recognition Rather Than Recall | 2 | The player must *guess* which free-text questions unlock declarations. No cues, no prompts, no affordance for what is askable. |
| 7 | Flexibility and Efficiency | 2 | Enter inserts a newline in the question box; there is no submit shortcut, so every question costs a mouse trip against a countdown. No suspect quick-switch, no evidence filter. |
| 8 | Aesthetic and Minimalist Design | 4 | Genuinely excellent. Restrained palette, flat surfaces, purposeful grain, zero decorative slop — and the deterministic scan corroborates it. |
| 9 | Error Recovery | 2 | The interrogation dead-end ("No sé qué quieres que te diga") is a soft failure with no path forward. The player is told they failed, never how to succeed. |
| 10 | Help and Documentation | 2 | "Cómo jugar" is accurate but is a five-paragraph wall reachable **only from the title screen** — once the timer starts, help is unreachable. |
| **Total** | | **26/40** | **Competent — strong skin, weak loop** |

## Design Specificity Verdict

**The surface is authored; the interactions are borrowed.**

The noir dressing is real and specific: the "EXPEDIENTE CONFIDENCIAL" kicker, serif editorial type, a single rust accent, ambient photography under a scrim, the film-grain and vignette layer, cinematic portraits. Nobody would mistake the title screen for a SaaS admin panel.

Strip the skin and the interaction language is category-interchangeable. The evidence panel is stock master-detail ("LISTADO / DETALLE") — swap the copy and it's a CRM. The accusation is three native dropdowns and a checkbox grid; the single most dramatic beat in a murder mystery is rendered as *Sospechoso / Motivo / Método* reading "Sin seleccionar." The call panel is a chat transcript with a textarea and "Enviar" — nothing about it says *telephone*, *wiretap*, or *pressure*.

The sharpest missed opportunity: the countdown is the entire premise, and it is the quietest element on the screen. The second sharpest: drag-and-drop contradiction proof is the only genuinely game-native mechanic in the product, and it lives at the bottom of a scrolling panel behind a guessing game.

**Deterministic scan** (`detect.mjs --json src`, exit 2): **32 findings, all `design-system-font-size`, all advisory.** Every flagged value is genuinely off the DESIGN.md ramp (which documents only 4.25 / 2.75 / 2 / 1.6 / 1 / 0.7rem), concentrated in `CallPanel.module.css` (11), `CaseFile.module.css` (4), and the shared HUD. Notably: **zero** hardcoded-color, spacing, or border-radius findings. The color and space systems are clean; the type scale is the one axis with undocumented drift.

**Visual overlays:** not available. `live-server.mjs` exists, but the browser automation in this session is headless, so no overlay would have been visible to you. Fallback signal: measured DOM evidence instead of an injected overlay.

## Overall Impression

This is a beautifully skinned game with a hollow middle. The visual system is disciplined enough that the detector can't find a color or spacing violation in 15 CSS files — that is rare. But the loop the whole thing exists to serve (ask → unlock declaration → catch contradiction) silently fails a sincere player, and the mechanic that makes this a *game* rather than a form is the least visible thing on screen.

**The single biggest opportunity:** make the interrogation loop teach itself. Everything else here is polish; that one is the product.

## What's Working

1. **Token discipline (`src/styles/global.css`).** Every color, space, and border reads from a variable sourced from DESIGN.md; no module hardcodes a hex. It works because consistency *is* the aesthetic — an "expediente técnico" identity collapses the moment something goes soft or off-palette, and nothing does. Independently confirmed: zero color/spacing/radius detector findings.
2. **The accusation confirmation flow (`AccusationPanel.tsx`).** Disabled-until-valid submit, an explicit list of what's missing, then a modal restating the whole accusation in prose with "esta decisión es definitiva." For one irreversible action under time pressure, this is textbook, and it respects the stakes.
3. **Focus visibility.** Tabbing 10–11 elements per view across two viewports produced **zero** elements focused without a visible indicator. The global `:focus-visible` ring earns its place — most projects fail this.

## Priority Issues

### [P0] The core interrogation loop dead-ends silently

**Why it matters:** A first-time player types "¿Dónde estabas la noche del asesinato?", gets "No sé qué quieres que te diga," and sees "Todavía no hay declaraciones registradas" under six draggable evidence chips. Nothing registers. They can burn minutes of a 12-minute timer never learning that declarations must be *unlocked* — and lose without ever touching the drag-and-drop mechanic the game is built around. This is the failure mode where the product looks finished and plays broken.

**Fix:** Scaffold the ask. Surface 3–4 suggested question chips per suspect (topics, not answers) so a sincere question reliably lands. When the fallback fires, make it productive: "Esa pregunta no reveló nada nuevo — prueba con su coartada o el testamento." Keep the free-text box for players who want it.

**Suggested command:** `$impeccable onboard`

### [P1] Every section title fails WCAG contrast

**Why it matters:** The `<h2>` on all five in-game views ("Escritorio", "Expediente del caso", "Evidencias", "Sistema de llamadas", "Acusación final") renders rust `#b44a42` on panel `#171717` at **16px / weight 700 = 3.41:1**. Bold 16px is not "large text" under WCAG (that threshold is 18.66px bold), so this fails the 4.5:1 body requirement on every screen. The rust accent is doing double duty as both *brand* and *heading text*, and it isn't legible enough for the second job.

**Fix:** Either lift the heading to ≥18.66px bold (which legitimizes 3:1) or set headings in `--text-primary` and keep rust for a rule, a kicker, or the accent bar beside the title. Same drama, passing contrast.

**Suggested command:** `$impeccable audit`

### [P1] The layout breaks below ~400px and buries the suspects at 768px

**Why it matters:** Two separate failures in the responsive path the last PR shipped.

At **360px** the accusation view overflows horizontally — `scrollWidth 420` vs `clientWidth 345`. Both `<nav>` and `<main>` measure 420px because a `1fr` grid track refuses to shrink below its content's min-width. Visible result: "EXPEDIENTE" clipped mid-word, body copy cut off, a horizontal scrollbar. It reads as a rendering bug, which undermines the polish the rest of the app earns.

At **768px** each suspect card in the call view is roughly 650px tall — `width: 100%; aspect-ratio: 1` makes every portrait fill the column, so choosing among four suspects means scrolling through four full-screen photographs. The asset is beautiful and the layout wastes it.

**Fix:** `grid-template-columns: minmax(0, 1fr)` on `.body` plus `min-width: 0` on `.panel` and `.nav` kills the overflow. Below 1024px, cap the suspect portrait (a fixed height with `object-fit: cover`, or a horizontal card with the portrait as a 5rem thumbnail) so all four fit in roughly one screen.

**Suggested command:** `$impeccable adapt`

### [P1] The climactic button is the quietest one

**Why it matters:** "Presentar acusación" is a 1px rust border on dark maroon — a *ghost* treatment, identical in weight to "Volver al escritorio" and the nav active state. Meanwhile "Iniciar partida" on the title screen is a fully filled rust primary. The most consequential, least reversible action in the product is styled as the least emphatic thing on the panel, and inside the confirm dialog both buttons are dark, which invites a mis-click on an irreversible choice.

**Fix:** Reserve the filled rust primary for "Confirmar acusación" and make "Cancelar" the ghost. Weight should track consequence.

**Suggested command:** `$impeccable layout`

### [P2] The countdown generates no felt pressure

**Why it matters:** "Solve it before time runs out" is the hook, and the clock is a quiet 1.5rem ivory `mm:ss` in a header corner that only recolors under 2:00 — no size change, no pulse, no announcement, `aria-live="off"`. A player heads-down in a call gets ambushed rather than tensed. For a low-vision player it's worse: the defining state of the session is never spoken.

**Fix:** Graduated states — calm, amber caution near 4:00, rust urgency with a subtle pulse near 1:00, gated on `prefers-reduced-motion`. Announce milestone crossings politely (`aria-live="polite"` on threshold changes only, not every tick). One "1 minuto restante" moment.

**Suggested command:** `$impeccable animate`

### [P2] 12.31 MB of images, no responsive variants

**Why it matters:** 17 image requests totaling **12.31 MB**, identical at 1440px and 360px — no `srcset`, no format negotiation. `office.png` alone is 2.09 MB on the title screen's first paint; the call view pulls a 1.66 MB backdrop plus a ~1.8 MB portrait. On anything but a fast connection the noir atmosphere arrives after the player does.

**Fix:** Convert to WebP/AVIF at 2–3 widths with `srcset`. Expect >90% reduction with no visible quality loss at these sizes.

**Suggested command:** `$impeccable optimize`

## Where the Two Assessments Met

**They agreed, from opposite directions:** the design review called native `<select>`/checkbox chrome a break in the noir language; the measurement pass independently flagged those same six evidence checkboxes at **13×13 px** — under a third of the 44×44 target minimum. One root cause, an aesthetic symptom and an accessibility symptom. Fix the control, fix both. (Three more targets miss narrowly: "Volver al escritorio" at 40px tall, the selects at 42, "Presentar acusación" at 43.)

**The detector caught what the review missed:** 32 off-ramp font sizes. The review praised token discipline — correctly for color and space — but the type scale has drifted to fifteen-odd unique values against a six-step documented ramp.

**The measurement pass caught what the review missed:** the 3.41:1 heading contrast and the 360px overflow. Neither is visible to taste; both are visible to a ruler.

**The review caught what no detector could:** the interrogation dead-end. No static rule detects a semantic cul-de-sac in a game loop. That it is also the P0 is worth remembering the next time a clean detector run feels like a passing grade.

**False positives, discarded:** the review reported a sticky-header/nav collision at 768px producing clipped slivers. I verified directly — the header is opaque `#121212` at `z-index: 10`, the nav is static and scrolls cleanly beneath it. Not a bug. The measurement pass self-corrected an initial "no accessible name" flag on the checkboxes; they are `<label>`-wrapped and correctly named.

**Clean bills of health worth stating:** zero console errors or warnings at either viewport. Zero `<img>` without `alt`. Zero heading-level skips. Zero unlabeled form controls. Zero focus traps or invisible focus states.

## Persona Red Flags

**Elena, first-time player (didn't read the manual):** Opens a call, types a natural question, receives "No sé qué quieres que te diga," and stares at "Todavía no hay declaraciones registradas" beneath six draggable chips. She cannot reach "Cómo jugar" — it lives on the title screen, behind the running timer. Exact breakers: the `#call-question` box with no prompts, the fallback copy, and the empty `styles.statements` list.

**Marc, keyboard-first power user:** Enter inserts a newline in the question textarea; there is no Ctrl/⌘-Enter submit, so every question is a mouse round-trip while the clock runs. The keyboard drag-and-drop path exists (`KeyboardSensor`) but is explained in one prose sentence — "enfoca la evidencia, pulsa Espacio, muévete con las flechas" — with no visible affordance on the chips. No shortcut switches suspects or views.

**Rocío, screen-reader user:** The timer is `role="timer"` with `aria-live="off"`. The single most important state in a timed game is never announced; she gets no warning as time evaporates. `ScoreDisplay` has no role or live region either. The pressure meter announces twice — the visible "Presión: 0%" text and the `<progress>` aria-label duplicate each other.

## Minor Observations

- The case file repeats all four victim facts verbatim from the desktop summary. Two views, same content — make one a summary and one a dossier.
- "MODO LOCAL" surfaces an engineering flag to the player with no in-fiction meaning. Theme it ("Línea segura") or hide it.
- All four suspect cards show "Presión: 0%" with identical empty bars at start — four zero-state meters that carry no information yet.
- "Terminar llamada" wears a rust border that implies danger but performs a benign, reversible navigation. Color is over-promising.
- Evidence category tags (DIGITAL / FÍSICA / DOCUMENTO) are displayed but never used to sort, filter or chunk. Latent structure going unused — and three 6-item groups (evidence list, accusation checkboxes, call tray) all exceed the ≤4 chunking guideline.
- The instructions screen is five equal-weight paragraphs with no rhythm or scanning aid.

## Questions to Consider

- If the countdown is the entire promise of the product, why is it the quietest element on the screen — and what changes if the timer, not the wordmark, anchors the HUD?
- Should accusing a murderer ever look like three dropdowns? What would it feel like to *assemble* the accusation from the portraits and evidence the player already gathered?
- The contradiction drag-and-drop is the only truly game-native mechanic here. Why is it last on a scrolling panel, gated behind a guessing game, instead of the centerpiece?
- If a player never discovers how to register a declaration, the game has failed silently. Whose job is that — the copy, the layout, or the response engine?
- The noir skin is authored with real care; the interactions default to dashboard patterns. Is this a detective game with a noir theme, or a noir theme with a form underneath — and would the player feel the difference?
