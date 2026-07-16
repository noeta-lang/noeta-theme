# @noeta/theme

The Noeta web design system — **"Ink & Signal"** — shared by every noeta.dev property
(landing, docs, registry, playground): warm near-black ink, paper-cream type, one
terminal-amber accent. Instrument Serif for display, Hanken Grotesk for body, Spline Sans
Mono for code (all self-hosted via Fontsource, declared as dependencies here).

## Contents

- `@noeta/theme/theme.css` — design tokens (`--ink-*`, `--paper-*`, `--signal*`, `--syn-*`,
  fonts, radii) plus the chrome every site shares: the atmospheric `.field` background,
  `.site-head`/`.site-foot`, `.btn*`, `.card`, `.code-window` + `tok-*` syntax colors,
  `.section`/`.section-head`, and the `.reveal` staggered load motion
  (reduced-motion-aware). Page-specific layout stays in each site.
- `@noeta/theme/fonts.css` — the three faces via Fontsource `@import`s.
- `@noeta/theme/highlight` — `highlightNoeta(code) → html`, the tiny build-time Noeta
  tokenizer that emits `tok-*` spans.

## Consuming

Sibling-checkout dependency (all noeta web repos live side by side):

```jsonc
// package.json
"dependencies": { "@noeta/theme": "file:../noeta-theme" }
```

```astro
---
import "@noeta/theme/fonts.css";
import "@noeta/theme/theme.css";
import { highlightNoeta } from "@noeta/theme/highlight";
---
```

In CI, clone this repo next to the site checkout before `pnpm install` (see the sites'
deploy workflows).

After editing the theme, run `pnpm install` in consuming repos to re-copy the `file:`
dependency (or use `pnpm dev`'s restart).

Generated with assistance from Claude Code.
