/** The property a page belongs to. Drives the wordmark suffix and the nav set. */
export type ChromeSite = "home" | "docs" | "registry" | "playground";

export interface ChromeLink {
  label: string;
  href: string;
  suffix?: string;
}

/** Every property in the ring, keyed by site, plus `github`. */
export const CHROME_LINKS: Record<ChromeSite | "github", ChromeLink>;

export interface HeaderOptions {
  site: ChromeSite;
  /** Release tag for the version pill. Omitted from the markup when null. */
  version?: string | null;
  /** Where the wordmark points. Defaults to this site's root. */
  homeHref?: string;
}

export interface FooterOptions {
  site: ChromeSite;
  /** The closing line. Defaults to the shared pre-alpha notice. */
  footMeta?: string;
}

/** The site header — wordmark, version pill, nav, and the drawer it folds into. */
export function renderHeader(options: HeaderOptions): string;

/** The site footer — tagline, nav, and the closing line. */
export function renderFooter(options: FooterOptions): string;

/**
 * Drawer enhancement, as source so the registry can inline it under a CSP hash
 * and the Astro sites can ship it verbatim.
 */
export const DRAWER_SCRIPT: string;
