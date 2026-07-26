/**
 * Responsive regression guard: fails if any page scrolls horizontally at phone
 * widths.
 *
 * Every noeta.dev property has shipped this bug at least once, always the same
 * way — a desktop grid written as `minmax(0, 1fr)` collapses to a bare `1fr` in
 * the mobile override, which keeps `min-width: auto` and floors the column at
 * its widest item's min-content instead of the viewport. The symptom is subtle
 * (the page just scrolls sideways) and easy to miss by eye, so it gets asserted
 * here instead.
 *
 * Two things make this class of bug invisible to a naive check:
 *
 *  - It only appears once webfonts load. JetBrains Mono is wider than the
 *    fallback, so a pre-font measurement reads clean. We await document.fonts
 *    .ready before measuring.
 *  - Code blocks and prose tables are *supposed* to scroll internally. An
 *    element is only reported if no ancestor is itself a scroll container, so
 *    intentional overflow doesn't trip the check.
 *
 * Usage:
 *   node check-overflow.mjs --dist dist [--paths /,/foo] [--widths 320,414]
 *   node check-overflow.mjs --base-url http://127.0.0.1:8787 --paths /,/para/p2p
 *
 * With --dist and no --paths, every index.html in the build is checked. Set
 * OVERFLOW_CHECK_SKIP=1 to skip (environments without Chromium).
 */

import { chromium } from "playwright-core";
import { createServer } from "node:http";
import { readFile, readdir } from "node:fs/promises";
import { existsSync, statSync } from "node:fs";
import { extname, join, normalize, relative, resolve } from "node:path";

if (process.env.OVERFLOW_CHECK_SKIP) {
  console.log("  [overflow] OVERFLOW_CHECK_SKIP set — skipping");
  process.exit(0);
}

const args = process.argv.slice(2);
const flag = (name) => {
  const i = args.indexOf(`--${name}`);
  return i === -1 ? undefined : args[i + 1];
};

const distArg = flag("dist");
const baseUrl = flag("base-url");
const widths = (flag("widths") ?? "320,360,390,414").split(",").map((w) => Number(w.trim()));
const limit = Number(flag("limit") ?? 0);

if (!distArg && !baseUrl) {
  console.error("  [overflow] need --dist <dir> or --base-url <url>");
  process.exit(2);
}

const MIME = {
  ".html": "text/html; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".mjs": "text/javascript; charset=utf-8",
  ".svg": "image/svg+xml",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".webp": "image/webp",
  ".woff2": "font/woff2",
  ".woff": "font/woff",
  ".json": "application/json",
  ".ico": "image/x-icon",
  ".wasm": "application/wasm",
};

// Every directory holding an index.html is a route.
async function discover(dir, root = dir, found = []) {
  for (const entry of await readdir(dir, { withFileTypes: true })) {
    const fp = join(dir, entry.name);
    if (entry.isDirectory()) await discover(fp, root, found);
    else if (entry.name === "index.html") {
      const rel = relative(root, dir).split(/[\\/]/).filter(Boolean).join("/");
      found.push(rel ? `/${rel}/` : "/");
    }
  }
  return found.sort();
}

// Measures the laid-out page, not the stylesheet: anything whose right edge
// clears the viewport without a scrolling ancestor is real horizontal bleed.
function audit() {
  const de = document.documentElement;
  const viewport = de.clientWidth;
  const scrolls = (el) => {
    const ox = getComputedStyle(el).overflowX;
    return ox === "auto" || ox === "scroll" || ox === "hidden";
  };
  const contained = (el) => {
    for (let p = el.parentElement; p && p !== de; p = p.parentElement) {
      if (scrolls(p)) return true;
    }
    return false;
  };
  const offenders = [];
  for (const el of document.querySelectorAll("*")) {
    const r = el.getBoundingClientRect();
    if (!r.width && !r.height) continue;
    const right = r.right + window.scrollX;
    if (right <= viewport + 1 || contained(el)) continue;
    const cls =
      typeof el.className === "string" && el.className.trim()
        ? `.${el.className.trim().split(/\s+/).join(".")}`
        : "";
    offenders.push({
      selector: el.tagName.toLowerCase() + cls,
      right: Math.round(right),
      width: Math.round(r.width),
      text: (el.textContent ?? "").trim().replace(/\s+/g, " ").slice(0, 50),
    });
  }
  offenders.sort((a, b) => b.right - a.right);
  return { viewport, scrollWidth: de.scrollWidth, offenders };
}

let server;
let origin = baseUrl;
let paths = flag("paths")?.split(",").map((p) => p.trim());

if (distArg) {
  const dist = resolve(process.cwd(), distArg);
  if (!existsSync(dist)) {
    console.error(`  [overflow] no build at ${dist} — run the build first`);
    process.exit(2);
  }
  paths ??= await discover(dist);

  // Same minimal static server as build-og-image.mjs: directories fall back to
  // index.html, with a guard against traversal outside dist/.
  server = createServer(async (req, res) => {
    try {
      const urlPath = decodeURIComponent((req.url ?? "/").split("?")[0]);
      let fp = normalize(join(dist, urlPath));
      if (fp !== dist && !fp.startsWith(dist + "/")) {
        res.statusCode = 403;
        return res.end();
      }
      if (existsSync(fp) && statSync(fp).isDirectory()) fp = join(fp, "index.html");
      if (!existsSync(fp)) {
        res.statusCode = 404;
        return res.end();
      }
      res.setHeader("Content-Type", MIME[extname(fp)] ?? "application/octet-stream");
      res.end(await readFile(fp));
    } catch {
      res.statusCode = 500;
      res.end();
    }
  });
  await new Promise((r) => server.listen(0, "127.0.0.1", r));
  origin = `http://127.0.0.1:${server.address().port}`;
}

if (!paths?.length) {
  console.error("  [overflow] nothing to check — pass --paths");
  process.exit(2);
}
if (limit > 0) paths = paths.slice(0, limit);

const failures = [];
const browser = await chromium.launch();
try {
  for (const width of widths) {
    const context = await browser.newContext({ viewport: { width, height: 844 } });
    const page = await context.newPage();
    for (const path of paths) {
      await page.goto(`${origin}${path}`, { waitUntil: "networkidle" });
      await page.evaluate(() => document.fonts.ready);
      const result = await page.evaluate(audit);
      if (result.scrollWidth > result.viewport || result.offenders.length) {
        failures.push({ path, width, ...result });
      }
    }
    await context.close();
  }
} finally {
  await browser.close();
  if (server) await new Promise((r) => server.close(r));
}

const checked = paths.length * widths.length;
if (!failures.length) {
  console.log(`  [overflow] ${checked} page/width combinations clean (${widths.join(", ")}px)`);
  process.exit(0);
}

console.error(`  [overflow] ${failures.length} of ${checked} combinations bleed horizontally:\n`);
for (const f of failures) {
  const over = f.scrollWidth - f.viewport;
  console.error(`  ${f.path} @ ${f.width}px — document ${f.scrollWidth}px vs viewport ${f.viewport}px (+${over})`);
  for (const o of f.offenders.slice(0, 3)) {
    console.error(`      ${o.selector} — ${o.width}px wide, right edge ${o.right}px  "${o.text}"`);
  }
  if (f.offenders.length > 3) console.error(`      … and ${f.offenders.length - 3} more`);
}
console.error(
  "\n  A grid that collapses to a bare `1fr` is the usual cause — it keeps\n" +
    "  min-width:auto, so use minmax(0, 1fr). Long unbroken strings need\n" +
    "  overflow-wrap:anywhere; wide tables need a scrolling wrapper.\n",
);
process.exit(1);
