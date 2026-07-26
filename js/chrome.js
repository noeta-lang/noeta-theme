/* The shared site chrome — header and footer — for every noeta.dev property.
 *
 * This markup used to be copy-pasted into five places (landing index + 404,
 * docs, playground, registry), which is how the four sites drifted apart: the
 * landing 404 and the registry lost the .brand wrapper and the version pill,
 * and each site folded at a different width. It lives here now, as plain
 * functions returning HTML strings rather than an .astro component, because the
 * registry is a hand-rolled Worker that renders with template literals and
 * cannot consume one.
 *
 * The nav is derived, not listed: every property links to all the others plus
 * GitHub, so adding a site here updates all four at once.
 */

/** Every property in the ring, in nav order. */
export const CHROME_LINKS = {
  home: { label: "noeta.dev", href: "https://noeta.dev", suffix: ".dev" },
  docs: { label: "docs", href: "https://docs.noeta.dev", suffix: ".dev/docs" },
  registry: { label: "registry", href: "https://registry.noeta.dev", suffix: ".dev/registry" },
  playground: { label: "playground", href: "https://play.noeta.dev", suffix: ".dev/play" },
  github: { label: "github", href: "https://github.com/noeta-lang/noeta" },
};

const ORDER = ["home", "docs", "registry", "playground", "github"];

const DEFAULT_FOOT_META =
  "Noeta is pre-alpha and built in the open — anything may change without notice.";

const escape = (value) =>
  String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");

/** Every property except the one we are on. GitHub is never "self". */
function siblings(site) {
  return ORDER.filter((key) => key !== site).map((key) => CHROME_LINKS[key]);
}

function links(site, extraClass = "") {
  return siblings(site)
    .map((l) => `<a${extraClass} href="${escape(l.href)}">${escape(l.label)}</a>`)
    .join("");
}

/**
 * The site header: wordmark, optional version pill, nav, and the drawer that
 * the nav folds into on narrow screens.
 *
 * @param {object} options
 * @param {"home"|"docs"|"registry"|"playground"} options.site  which property this is
 * @param {string|null} [options.version]  release tag for the pill; omitted when null
 * @param {string} [options.homeHref]  where the wordmark points (default: this site's root)
 */
export function renderHeader({ site, version = null, homeHref = "/" }) {
  const suffix = CHROME_LINKS[site]?.suffix ?? ".dev";
  const pill =
    version === null || version === undefined || version === ""
      ? ""
      : `<a class="version-pill" href="${escape(`${CHROME_LINKS.github.href}/releases/tag/${version}`)}"` +
        ` title="Noeta ${escape(version)}">${escape(version)}</a>`;

  // The toggle ships hidden and is revealed by CSS only once the drawer script
  // has marked the document as enhanced, so a no-JS reader keeps a working
  // (wrapping) nav rather than a button that does nothing.
  return (
    `<header class="site-head">` +
    `<div class="wrap">` +
    `<div class="brand">` +
    `<a class="wordmark" href="${escape(homeHref)}">noeta<span class="tld">${escape(suffix)}</span></a>` +
    pill +
    `</div>` +
    `<nav class="site-nav" aria-label="Site">${links(site)}</nav>` +
    `<button type="button" class="drawer-toggle" id="site-drawer-open"` +
    ` aria-haspopup="dialog" aria-controls="site-drawer" aria-label="Open menu">` +
    `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" aria-hidden="true">` +
    `<line x1="3" y1="7" x2="21" y2="7"></line>` +
    `<line x1="3" y1="12" x2="21" y2="12"></line>` +
    `<line x1="3" y1="17" x2="21" y2="17"></line>` +
    `</svg>` +
    `</button>` +
    `</div>` +
    `<dialog class="site-drawer" id="site-drawer" aria-label="Menu">` +
    `<div class="drawer-head">` +
    `<span class="drawer-title">Menu</span>` +
    `<button type="button" class="drawer-close" aria-label="Close menu">` +
    `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" aria-hidden="true">` +
    `<line x1="6" y1="6" x2="18" y2="18"></line>` +
    `<line x1="18" y1="6" x2="6" y2="18"></line>` +
    `</svg>` +
    `</button>` +
    `</div>` +
    `<div class="drawer-body"></div>` +
    `</dialog>` +
    `</header>`
  );
}

/**
 * The site footer.
 *
 * @param {object} options
 * @param {"home"|"docs"|"registry"|"playground"} options.site
 * @param {string} [options.footMeta]  the closing line; sites override it to say
 *   something specific about themselves.
 */
export function renderFooter({ site, footMeta = DEFAULT_FOOT_META }) {
  return (
    `<footer class="site-foot">` +
    `<div class="wrap">` +
    `<span class="tagline">AI-native, <em>human-first.</em></span>` +
    `<nav class="foot-nav" aria-label="Footer">${links(site)}</nav>` +
    `<p class="foot-meta">${footMeta}</p>` +
    `</div>` +
    `</footer>`
  );
}

/**
 * Progressive enhancement for the header drawer, as a source string so the
 * registry can inline it under its CSP hash and the Astro sites can ship it as
 * a module. Keep it dependency-free and side-effect-free until called.
 *
 * It marks the document enhanced (which is what actually reveals the toggle),
 * clones the site nav into the drawer, and *moves* any [data-drawer-content]
 * element in while the compact breakpoint matches — moving rather than cloning
 * so nothing with wired-up listeners or an id gets duplicated. Docs uses that
 * to fold its contents tree in beside the site links.
 */
export const DRAWER_SCRIPT = `(() => {
  const toggle = document.getElementById("site-drawer-open");
  const drawer = document.getElementById("site-drawer");
  if (!toggle || !(drawer instanceof HTMLDialogElement)) return;
  const body = drawer.querySelector(".drawer-body");
  const nav = document.querySelector(".site-head .site-nav");
  if (!body || !nav) return;

  document.documentElement.setAttribute("data-chrome-enhanced", "");

  const navCopy = nav.cloneNode(true);
  // Drop .site-nav: the drawer lives inside <header class="site-head">, so the
  // rule that hides the header nav at this breakpoint would hide the copy too.
  navCopy.classList.remove("site-nav");
  navCopy.classList.add("drawer-nav");
  navCopy.removeAttribute("aria-label");
  body.appendChild(navCopy);

  // Page-owned content (the docs contents tree) is moved in and out rather than
  // copied, so ids and listeners stay unique. Remember where it came from.
  const owned = [...document.querySelectorAll("[data-drawer-content]")].map((el) => ({
    el,
    parent: el.parentNode,
    next: el.nextSibling,
    wasOpen: el instanceof HTMLDetailsElement ? el.open : null,
  }));

  const compact = window.matchMedia("(max-width: 38rem)");

  const place = () => {
    for (const item of owned) {
      if (compact.matches) {
        if (item.el.parentNode !== body) body.appendChild(item.el);
        // A <details> is a collapse for the no-JS case; inside the drawer the
        // drawer itself is the collapse, so show the whole tree.
        if (item.el instanceof HTMLDetailsElement) item.el.open = true;
      } else if (item.el.parentNode === body) {
        item.parent.insertBefore(item.el, item.next);
        if (item.el instanceof HTMLDetailsElement && item.wasOpen !== null) {
          item.el.open = item.wasOpen;
        }
      }
    }
    if (!compact.matches && drawer.open) drawer.close();
  };

  place();
  compact.addEventListener("change", place);

  toggle.addEventListener("click", () => {
    if (!drawer.open) drawer.showModal();
  });
  drawer.querySelector(".drawer-close")?.addEventListener("click", () => drawer.close());
  // Click on the backdrop (the dialog itself, outside the panel) closes it.
  drawer.addEventListener("click", (event) => {
    if (event.target === drawer) drawer.close();
  });
  // Following a link should not leave the drawer open behind the new page.
  drawer.addEventListener("click", (event) => {
    if (event.target instanceof HTMLAnchorElement) drawer.close();
  });
})();`;
