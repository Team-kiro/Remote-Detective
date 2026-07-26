---
inclusion: always
---

# Styles Steering

Source: `.github/instructions/styles.instructions.md`

- Styling uses plain CSS Modules only.
- Keep one co-located module per component plus `src/styles/global.css` for shared base styles.
- Use semantic camelCase class names.
- Reuse via `composes:` instead of duplicating declarations.
- Follow noir visual system from `DESIGN.md`:
  - near-monochrome palette + limited accents
  - flat surfaces, subtle elevation only where intended
  - documented serif/label typography system
- Do not introduce new color/font tokens outside `DESIGN.md` without deliberate design update.
- Accessibility:
  - maintain contrast targets
  - keep visible `:focus-visible` with offset
  - respect `prefers-reduced-motion`
- Responsive baseline:
  - desktop-first at >=1024px
  - below 1024px single-column reflow with legible HUD
  - do not build advanced touch DnD.

