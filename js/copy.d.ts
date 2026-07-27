/** The clipboard glyph, inline SVG (a strict CSP allows no external assets). */
export const COPY_ICON: string;

/** The confirmation glyph CSS swaps in on `[data-copied]`. */
export const CHECK_ICON: string;

/**
 * The delegated click listener, as source so the registry can inline it under a CSP hash and the
 * Astro sites can ship it verbatim. Copies `[data-copy-source]` when a block marks one — a folded
 * docs sample points it at the full program, so the clipboard gets code that compiles rather than
 * the fragment on screen — else the block's own `<code>`.
 */
export const COPY_SCRIPT: string;

/** The button's styles, as source, for inlining into a Worker's stylesheet or an Astro `<style>`. */
export const COPY_CSS: string;

/** The button markup on its own, for callers that own the surrounding wrapper. */
export function copyButton(): string;

/** Wrap rendered code HTML in the copyable `.snippet` shell. */
export function snippetHtml(codeHtml: string, preClass?: string): string;
