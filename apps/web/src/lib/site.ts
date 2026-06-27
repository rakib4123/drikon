/**
 * Absolute site origin for SEO (sitemap, canonical URLs, OpenGraph).
 * Set NEXT_PUBLIC_APP_URL in production; Vercel's production URL is a fallback.
 */
export const SITE_URL = (
  process.env.NEXT_PUBLIC_APP_URL ||
  (process.env.VERCEL_PROJECT_PRODUCTION_URL
    ? `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`
    : 'http://localhost:3000')
).replace(/\/+$/, '');
