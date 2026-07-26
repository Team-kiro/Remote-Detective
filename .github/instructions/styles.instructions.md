---
description: 'CSS Modules and the noir visual system'
applyTo: 'frontend/src/**/*.css'
---

# Styling Instructions

Styling uses **plain CSS Modules** — no Tailwind, no CSS-in-JS, no preprocessor. `DESIGN.md` at the repository root is the normative token source; this file is how those tokens are applied.

## Structure

- One `Component.module.css` co-located with each component; global resets and the base type/color stack live in `src/styles/global.css`
- Class names are camelCase and semantic (`primaryAction`, `pendingTitle`), never presentational (`redButton`)
- Use `composes:` for a variant of an existing class instead of duplicating declarations

## The noir system

- Palette: near-monochrome carbon and ivory neutrals with the rust accent for action and risk, and the amber accent reserved for victory. Maximum two accents
- Surfaces are flat: 1px borders, no perceptible corner radius, shadows only to lift a centered state screen off the background
- Type: the documented serif stack, uppercase wide-tracked labels for HUD, controls, and metadata
- Any color or font not in `DESIGN.md` is drift — add it to `DESIGN.md` deliberately or use an existing token

## Accessibility

- Body and placeholder text at >= 4.5:1 contrast, large text >= 3:1
- Always keep a visible `:focus-visible` outline with offset; `filter: brightness()` alone is not a focus indicator
- Respect `prefers-reduced-motion` for any transition or animation

## Responsive

- Desktop-first: the fully supported experience is >= 1024px
- Below 1024px collapse to a single column and keep the HUD, timer, and score legible
- Do not build advanced touch drag-and-drop; show the desktop recommendation instead
