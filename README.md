# @noeta/theme

The Noeta web design system — **"Signal"** — shared by every noeta.dev property
(landing, docs, registry, playground): a cool slate theme built for reading, with two
accents split by voice — blue for the human/interactive one (brand, links, buttons,
emphasis) and mint for the machine/terminal one (shell prompts, CLI commands, the code
caret, syntax keywords). All sans-serif — Inter for prose, JetBrains Mono for machine
text — with no italics and no grid. Dark by default, with a paper light mode that follows
the browser preference (`prefers-color-scheme`, no JS). Fonts are self-hosted via
Fontsource, declared as dependencies here.

## Contents

- `@noeta/theme/theme.css` — design tokens (`--bg`, `--surface-*`, `--text-*`, `--accent*`,
  `--accent-2*`, `--danger`/`--warning`, `--syn-*`, fonts, radii) plus a `prefers-color-scheme`
  light palette and the chrome every site shares: the atmospheric `.field` background,
  `.site-head`/`.site-foot`, `.btn*`, `.card`, `.code-window` + `tok-*` syntax colors,
  `.section`/`.section-head`, and the `.reveal` staggered load motion
  (reduced-motion-aware). Page-specific layout stays in each site.
- `@noeta/theme/fonts.css` — the two faces (Inter, JetBrains Mono) via Fontsource `@import`s.
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
