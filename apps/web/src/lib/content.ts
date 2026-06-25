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
  topbarPromo: string;
  footerNote: string;
  shippingNote: string;
  returnsNote: string;
  warrantyNote: string;
  seoKeywords: string[];
}

/** Built-in defaults. `{brand}` is substituted with the live site name. */
export const CONTENT_DEFAULTS = {
  heroBadge: 'Genuine parts · Official warranty',
  heroTitle: 'Build it.\nPower it.\nGame on.',
  heroHighlight: 'Power it.',
  heroSubtitle:
    '{brand} is your one-stop tech shop — laptops, PC components, and peripherals from the brands you trust, with genuine warranty and fast nationwide delivery.',
  heroCtaLabel: 'Browse the shop',
  heroCtaHref: '/products',
  heroCtaAltLabel: 'View featured',
  heroCtaAltHref: '/products?featured=true',
  features: [
    { title: '100% genuine', body: 'Authentic products, official warranty' },
    { title: 'Fast delivery', body: 'Tracked, nationwide shipping' },
    { title: 'Expert support', body: 'Real techs who know the gear' },
    { title: 'Best prices', body: 'Fair pricing, regular deals' },
  ] as SiteFeature[],
  ctaHeading: 'Build your dream setup.',
  ctaBody:
    'From the first boot to the last frame — {brand} stocks the components, laptops, and peripherals to build, upgrade, and power your rig. Genuine gear, expert advice.',
  ctaButtonLabel: 'Create your account',
  ctaButtonHref: '/register',
  dealsTitle: "Today's deals",
  dealsBlurb: 'Hand-picked tech on sale this week.',
  topbarPromo: 'Free shipping over ৳3,000 · Authenticity guaranteed',
  footerNote: 'Made with care in Dhaka.',
  shippingNote: 'Free shipping over ৳3,000',
  returnsNote: '14-day returns',
  warrantyNote: 'Authentic guaranteed',
  seoKeywords: 'ecommerce, shop, tech, gaming',
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
    topbarPromo: sub(s.topbarPromo, d.topbarPromo, brand),
    footerNote: sub(s.footerNote, d.footerNote, brand),
    shippingNote: sub(s.shippingNote, d.shippingNote, brand),
    returnsNote: sub(s.returnsNote, d.returnsNote, brand),
    warrantyNote: sub(s.warrantyNote, d.warrantyNote, brand),
    seoKeywords: keywords,
  };
}
