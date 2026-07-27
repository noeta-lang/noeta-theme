/* The copy-to-clipboard control for code blocks, shared by every noeta.dev property.
 *
 * It started on the registry, where every `.snippet` (sidebar install lines, README fences, docs
 * signatures) gets a hover-revealed clipboard button. Docs wanted the same control, and the choice
 * was to copy the markup and the CSS into a second place or to move it here — the same choice the
 * header and footer already faced, and it lives in `chrome.js` for the same reason.
 *
 * Plain strings rather than a component, because the registry is a hand-rolled Worker that renders
 * with template literals and has no build step: it inlines `COPY_SCRIPT` under a CSP hash and
 * inlines `COPY_CSS` into its stylesheet, while Astro sites import the same two values. One source
 * of truth means the button cannot drift the way the chrome once did.
 *
 * A consumer that changes `COPY_SCRIPT` must recompute the CSP hash pinning it — the registry's
 * web.test.ts hashes the served bytes and fails until the two agree.
 */

/** Clipboard glyph. Inline SVG: a strict CSP allows no external assets. */
export const COPY_ICON =
  `<svg class="ic-copy" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg>`;

/** The confirmation glyph CSS swaps in for ~2s on `[data-copied]`. */
export const CHECK_ICON =
  `<svg class="ic-check" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M20 6 9 17l-5-5"/></svg>`;

/**
 * The one listener the button needs, delegated from the document so server-rendered blocks need no
 * wiring — and blocks added later (a fetched fragment, a folded example) work without re-binding.
 *
 * The payload is an element's `textContent`: the browser has already decoded the entities and
 * dropped the highlight spans, so a highlighted block copies as its exact raw source.
 *
 * Which element is deliberate. Normally it is the block's own `<code>`. But a docs sample may show
 * only the region worth reading and fold the context that makes it compile — copying what is on
 * screen would hand the reader something that does not run, which is the opposite of what a copy
 * button is for. Such a block marks the full program `[data-copy-source]`, and that wins.
 */
export const COPY_SCRIPT =
  `document.addEventListener("click",function(e){var t=e.target;var b=t&&t.closest?t.closest(".copy-btn"):null;if(!b)return;var s=b.closest(".snippet")||b.parentElement;if(!s)return;var c=s.querySelector("[data-copy-source]")||s.querySelector("code");if(!c||!navigator.clipboard)return;navigator.clipboard.writeText(c.textContent).then(function(){b.setAttribute("data-copied","");b.setAttribute("aria-label","Copied");setTimeout(function(){b.removeAttribute("data-copied");b.setAttribute("aria-label","Copy to clipboard")},2000)})});`;

/**
 * The button's styles, as a string so the Worker can inline them and a bundler site can inject them
 * — the alternative was a `.css` file plus a hand-kept copy in the registry, which is exactly the
 * lockstep-by-hand arrangement that let the chrome drift.
 *
 * Revealed on hover and on keyboard focus (`:focus-visible`), so it is reachable without a pointer
 * rather than merely invisible. `[data-copied]` keeps it visible while it reads "Copied".
 */
export const COPY_CSS = `
.snippet{position:relative}
.snippet pre{margin:0}
.copy-btn{position:absolute;top:.4rem;right:.4rem;display:inline-flex;align-items:center;justify-content:center;padding:.28rem;border:1px solid var(--line-strong);border-radius:6px;background:color-mix(in srgb,var(--surface-2) 90%,transparent);color:var(--text-1);cursor:pointer;opacity:0;transition:opacity 140ms ease,color 140ms ease,border-color 140ms ease}
.copy-btn svg{display:block;width:.85rem;height:.85rem}
.copy-btn .ic-check{display:none}
.snippet:hover .copy-btn,.copy-btn:focus-visible{opacity:1}
.copy-btn:hover{color:var(--text-0);border-color:var(--accent)}
.copy-btn[data-copied]{opacity:1;color:var(--accent-2-bright);border-color:color-mix(in srgb,var(--accent-2) 45%,var(--line-strong))}
.copy-btn[data-copied] .ic-copy{display:none}
.copy-btn[data-copied] .ic-check{display:block}
@media (prefers-reduced-motion:reduce){.copy-btn{transition:none}}
`;

/** The button itself — markup only; [`COPY_SCRIPT`] does the work. */
export function copyButton() {
  return `<button class="copy-btn" type="button" aria-label="Copy to clipboard">${COPY_ICON}${CHECK_ICON}</button>`;
}

/**
 * Wrap already-rendered code HTML (escaped, possibly carrying highlight spans) in the copyable
 * `.snippet` shell. `preClass` lands on the `<pre>` for callers that style blocks by class.
 */
export function snippetHtml(codeHtml, preClass = "") {
  return `<div class="snippet"><pre${preClass ? ` class="${preClass}"` : ""}><code>${codeHtml}</code></pre>${copyButton()}</div>`;
}
