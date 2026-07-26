/**
 * Chrome regression guard: asserts the header actually folds into a working
 * drawer on a phone, and unfolds again on a desktop.
 *
 * This exists because a DOM-level check is not enough. The first version of the
 * drawer cloned the site nav into it *with its .site-nav class still on*, so the
 * same rule that hides the header nav at this breakpoint hid the copy too: the
 * links were present in the DOM, addressable by text, and 0px tall. Everything
 * short of measuring them said it worked. So this measures them.
 *
 * Usage:
 *   node check-chrome.mjs --dist dist
 *   node check-chrome.mjs --base-url http://127.0.0.1:8787 [--path /]
 *
 * Set CHROME_CHECK_SKIP=1 to skip (environments without Chromium).
 */

import { chromium } from "playwright-core";
import { createServer } from "node:http";
import { readFile } from "node:fs/promises";
import { existsSync, statSync } from "node:fs";
import { extname, join, normalize, resolve } from "node:path";

if (process.env.CHROME_CHECK_SKIP) {
  console.log("  [chrome] CHROME_CHECK_SKIP set — skipping");
  process.exit(0);
}

const args = process.argv.slice(2);
const flag = (name) => {
  const i = args.indexOf(`--${name}`);
  return i === -1 ? undefined : args[i + 1];
};

const distArg = flag("dist");
const baseUrl = flag("base-url");
const path = flag("path") ?? "/";

if (!distArg && !baseUrl) {
  console.error("  [chrome] need --dist <dir> or --base-url <url>");
  process.exit(2);
}

const MIME = {
  ".html": "text/html; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".mjs": "text/javascript; charset=utf-8",
  ".svg": "image/svg+xml",
  ".png": "image/png",
  ".woff2": "font/woff2",
  ".woff": "font/woff",
  ".json": "application/json",
  ".ico": "image/x-icon",
  ".wasm": "application/wasm",
};

let server;
let origin = baseUrl;

if (distArg) {
  const dist = resolve(process.cwd(), distArg);
  if (!existsSync(dist)) {
    console.error(`  [chrome] no build at ${dist} — run the build first`);
    process.exit(2);
  }
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

const failures = [];
const fail = (msg) => failures.push(msg);

const browser = await chromium.launch();
try {
  // --- phone: the nav must be *in the drawer*, and actually rendered ---------
  {
    const context = await browser.newContext({ viewport: { width: 375, height: 844 } });
    const page = await context.newPage();
    await page.goto(`${origin}${path}`, { waitUntil: "networkidle" });
    await page.evaluate(() => document.fonts.ready);

    const state = await page.evaluate(() => {
      const toggle = document.getElementById("site-drawer-open");
      const headerNav = document.querySelector(".site-head .wrap .site-nav");
      return {
        enhanced: document.documentElement.hasAttribute("data-chrome-enhanced"),
        toggleShown: toggle ? toggle.offsetHeight > 0 : false,
        toggleBox: toggle ? [toggle.offsetWidth, toggle.offsetHeight] : null,
        headerNavShown: headerNav ? headerNav.offsetHeight > 0 : null,
      };
    });

    if (!state.enhanced) fail("the drawer script did not run (no data-chrome-enhanced)");
    if (!state.toggleShown) fail("the drawer toggle is not visible at 375px");
    if (state.toggleBox && Math.min(...state.toggleBox) < 44) {
      fail(`the drawer toggle is ${state.toggleBox.join("x")}px, under the 44px tap target`);
    }
    if (state.headerNavShown) fail("the header nav is still visible at 375px — it should be in the drawer");

    if (state.toggleShown) {
      await page.click("#site-drawer-open");
      await page.waitForTimeout(250);
      const open = await page.evaluate(() => {
        const drawer = document.getElementById("site-drawer");
        const links = [...drawer.querySelectorAll(".drawer-nav a")];
        const owned = [...document.querySelectorAll("[data-drawer-content]")];
        return {
          isOpen: drawer.open,
          linkCount: links.length,
          // The bug this file exists for: present in the DOM, zero-height.
          renderedLinks: links.filter((a) => a.offsetHeight > 0).length,
          shortLinks: links.filter((a) => a.offsetHeight > 0 && a.offsetHeight < 44).length,
          ownedCount: owned.length,
          ownedInDrawer: owned.filter((el) => el.closest(".drawer-body")).length,
          ownedRendered: owned.filter((el) => el.offsetHeight > 0).length,
        };
      });

      if (!open.isOpen) fail("clicking the toggle did not open the drawer");
      if (open.linkCount === 0) fail("the drawer has no site links");
      if (open.renderedLinks !== open.linkCount) {
        fail(`${open.linkCount - open.renderedLinks} of ${open.linkCount} drawer links render at 0px`);
      }
      if (open.shortLinks) fail(`${open.shortLinks} drawer links are under the 44px tap target`);
      if (open.ownedCount && open.ownedInDrawer !== open.ownedCount) {
        fail(`${open.ownedCount - open.ownedInDrawer} [data-drawer-content] element(s) were not moved into the drawer`);
      }
      if (open.ownedCount && open.ownedRendered !== open.ownedCount) {
        fail("[data-drawer-content] is in the drawer but renders at 0px");
      }
      console.log(
        `  [chrome] 375px: drawer opens with ${open.renderedLinks} site links` +
          (open.ownedCount ? ` + ${open.ownedInDrawer} page section(s)` : ""),
      );
    }
    await context.close();
  }

  // --- desktop: no toggle, nav back in the header ---------------------------
  {
    const context = await browser.newContext({ viewport: { width: 1200, height: 900 } });
    const page = await context.newPage();
    await page.goto(`${origin}${path}`, { waitUntil: "networkidle" });
    await page.evaluate(() => document.fonts.ready);
    const state = await page.evaluate(() => {
      const toggle = document.getElementById("site-drawer-open");
      const headerNav = document.querySelector(".site-head .wrap .site-nav");
      const owned = [...document.querySelectorAll("[data-drawer-content]")];
      return {
        toggleShown: toggle ? toggle.offsetHeight > 0 : false,
        headerNavShown: headerNav ? headerNav.offsetHeight > 0 : null,
        ownedInDrawer: owned.filter((el) => el.closest(".drawer-body")).length,
      };
    });
    if (state.toggleShown) fail("the drawer toggle is visible at 1200px");
    if (state.headerNavShown === false) fail("the header nav is hidden at 1200px");
    if (state.ownedInDrawer) fail("[data-drawer-content] was left in the drawer at 1200px");
    console.log("  [chrome] 1200px: header nav shown, no toggle, page sections restored");
    await context.close();
  }
} finally {
  await browser.close();
  if (server) await new Promise((r) => server.close(r));
}

if (!failures.length) {
  console.log("  [chrome] chrome folds and unfolds correctly");
  process.exit(0);
}
console.error(`\n  [chrome] ${failures.length} problem(s):`);
for (const f of failures) console.error(`      ${f}`);
process.exit(1);
