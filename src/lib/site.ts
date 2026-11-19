// Public origin of the site, used for canonical URLs, the sitemap and robots.txt.
// GitHub Pages sets SITE_URL in its workflow; Vercel provides VERCEL_PROJECT_PRODUCTION_URL.
export const SITE_URL = (
  process.env.SITE_URL ||
  (process.env.VERCEL_PROJECT_PRODUCTION_URL ? `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}` : "") ||
  "http://localhost:3000"
).replace(/\/$/, "");

export const BASE_PATH = process.env.NEXT_PUBLIC_BASE_PATH ?? "";

/** Absolute URL for a site path like "/learn/x/y/". SITE_URL already includes any base path. */
export const absUrl = (p: string) => `${SITE_URL}${p}`;
