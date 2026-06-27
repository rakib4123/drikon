import type { SiteSettings, SiteFeature } from '@drikon/shared-types';

// ────────────────────────────────────────────────────────────────────────────
// EDITABLE STOREFRONT CONTENT
//
// Single source of truth for the built-in copy. Every surface reads through
// `resolveContent()`, so any field left blank in the admin panel falls back to
// these defaults — there is no hardcoded marketing copy in the components.
//
// This module is import-safe in both Server and Client Components: it has no
// react/api dependencies (the admin form imports CONTENT_DEFAULTS from here).
// ────────────────────────────────────────────────────────────────────────────

export interface ResolvedContent {
  heroBadge: string;
  heroTitle: string;
  heroHighlight: string;
  heroSubtitle: string;
  heroCtaLabel: string;
  heroCtaHref: string;
  heroCtaAltLabel: string;
  heroCtaAltHref: string;
  features: SiteFeature[];
  ctaHeading: string;
  ctaBody: string;
  ctaButtonLabel: string;
  ctaButtonHref: string;
  dealsTitle: string;
  dealsBlurb: string;
  dealsImage: string;
  topbarPromo: string;
  footerNote: string;
  shippingNote: string;
  returnsNote: string;
  warrantyNote: string;
  seoKeywords: string[];
}

/** Built-in defaults. `{brand}` is substituted with the live site name. */
export const CONTENT_DEFAULTS = {
  heroBadge: 'Genuine components · Fast nationwide shipping',
  heroTitle: 'Build it.\nProgram it.\nDeploy it.',
  heroHighlight: 'Program it.',
  heroSubtitle:
    '{brand} is your robotics & gadgets store — microcontrollers, sensors, motors, drones, and the parts that make things move. Genuine components, expert support, fast delivery.',
  heroCtaLabel: 'Shop all parts',
  heroCtaHref: '/products',
  heroCtaAltLabel: 'New arrivals',
  heroCtaAltHref: '/products?featured=true',
  features: [
    { title: 'Genuine components', body: 'Authentic boards, sensors & modules' },
    { title: 'Fast delivery', body: 'Tracked, nationwide shipping' },
    { title: 'Maker support', body: 'Engineers who actually build' },
    { title: 'Datasheets & docs', body: 'Specs and guides for every part' },
  ] as SiteFeature[],
  ctaHeading: 'From idea to working prototype.',
  ctaBody:
    'Whatever you’re building — a line-following bot, a smart-home gadget, an autonomous drone — {brand} stocks the boards, sensors, motors, and parts to make it real. Genuine components, expert advice.',
  ctaButtonLabel: 'Start building',
  ctaButtonHref: '/register',
  dealsTitle: 'Deals of the week',
  dealsBlurb: 'Hand-picked robotics & gadget gear on sale.',
  dealsImage: '',
  topbarPromo: 'Free shipping over ৳3,000 · Genuine components guaranteed',
  footerNote: 'Built for makers in Dhaka.',
  shippingNote: 'Free shipping over ৳3,000',
  returnsNote: '14-day easy returns',
  warrantyNote: 'Genuine parts guaranteed',
  seoKeywords: 'robotics, arduino, raspberry pi, esp32, sensors, microcontrollers, drones, gadgets, electronics, components, dhaka',
};

const sub = (v: string | null | undefined, fallback: string, brand: string) =>
  (v && v.trim() ? v : fallback).replaceAll('{brand}', brand);

/** Merge admin-set content over the built-in defaults (blank → default). */
export function resolveContent(s: SiteSettings): ResolvedContent {
  const brand = s.siteName || 'our store';
  const d = CONTENT_DEFAULTS;
  const features =
    Array.isArray(s.features) && s.features.length > 0 ? s.features : d.features;
  const keywords = (s.seoKeywords && s.seoKeywords.trim() ? s.seoKeywords : d.seoKeywords)
    .split(',')
    .map((k) => k.trim())
    .filter(Boolean);

  return {
    heroBadge: sub(s.heroBadge, d.heroBadge, brand),
    heroTitle: sub(s.heroTitle, d.heroTitle, brand),
    heroHighlight: sub(s.heroHighlight, d.heroHighlight, brand),
    heroSubtitle: sub(s.heroSubtitle, d.heroSubtitle, brand),
    heroCtaLabel: sub(s.heroCtaLabel, d.heroCtaLabel, brand),
    heroCtaHref: sub(s.heroCtaHref, d.heroCtaHref, brand),
    heroCtaAltLabel: sub(s.heroCtaAltLabel, d.heroCtaAltLabel, brand),
    heroCtaAltHref: sub(s.heroCtaAltHref, d.heroCtaAltHref, brand),
    features,
    ctaHeading: sub(s.ctaHeading, d.ctaHeading, brand),
    ctaBody: sub(s.ctaBody, d.ctaBody, brand),
    ctaButtonLabel: sub(s.ctaButtonLabel, d.ctaButtonLabel, brand),
    ctaButtonHref: sub(s.ctaButtonHref, d.ctaButtonHref, brand),
    dealsTitle: sub(s.dealsTitle, d.dealsTitle, brand),
    dealsBlurb: sub(s.dealsBlurb, d.dealsBlurb, brand),
    dealsImage: s.dealsImage || '',
    topbarPromo: sub(s.topbarPromo, d.topbarPromo, brand),
    footerNote: sub(s.footerNote, d.footerNote, brand),
    shippingNote: sub(s.shippingNote, d.shippingNote, brand),
    returnsNote: sub(s.returnsNote, d.returnsNote, brand),
    warrantyNote: sub(s.warrantyNote, d.warrantyNote, brand),
    seoKeywords: keywords,
  };
}
