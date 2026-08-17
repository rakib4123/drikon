# MVC Conversion — apps/web Customer-Facing Routes Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Introduce a `models/` (data-fetching) layer and a `controllers/` (per-route orchestration) layer in `apps/web` for the customer-facing routes, so `page.tsx` files call a controller and render — no inline `fetch`/business logic — while `app/` stays the router (required by Next.js) and `components/` stays the View.

**Architecture:** `src/models/*.ts` holds one file per domain entity, each exporting plain async functions that call `apiGet`/`apiPost` (from the untouched `lib/api-client.ts`) and return typed data — direct relocations of the existing `lib/catalog.ts`, `lib/banners.ts`, `lib/settings.ts`, `lib/content.ts` functions plus newly-extracted ones for products, wishlist, and orders. `src/controllers/*.ts` holds one function per **Server Component** route that composes Model calls into the exact props that route's `page.tsx` needs — the same async-function-returns-props shape Next.js Server Components already use, just factored out of the page file. Client Component routes (routes marked `'use client'`) get Model extraction only, not a controller file — see "Why some routes get no controller" below.

**Tech Stack:** Next.js 15 App Router, React 19 Server/Client Components, TypeScript strict.

**Spec:** `docs/superpowers/specs/2026-08-17-mvc-conversion-design.md`

## Global Constraints

- No behavior change, no visual change, no new features. Every relocated function keeps its exact original error-handling (what it catches, what it lets through, what fallback it returns).
- `apps/web` has no test runner configured at all (confirmed: no `vitest.config.*`, no `*.test.ts*`/`*.spec.ts*` files, `package.json` has no `test` script) — setting one up is a separate, larger effort outside this refactor's scope. Verification here is `pnpm --filter web build` (which runs full TypeScript type-checking) plus a manual smoke check in the dev server, per the `run` skill.
- `lib/api-client.ts`, `lib/cloudinary.ts`, `lib/utils.ts`, `lib/site.ts` are infrastructure, not domain data — they stay in `lib/` untouched.
- Zustand stores (`src/store/*.ts`) are explicitly out of scope (already decided in the spec) — they hold transient client UI state, not persisted domain data. Do not modify them even though several pages call into them.
- Every task is a single git commit. Commit only after `pnpm --filter web build` succeeds.

### Why some routes get no controller

The spec defines Controller as "a thin per-route function that reads route params, calls the Model layer, and returns props for the View." That shape is exactly what a Next.js **Server Component** page already is — an async function that runs on the server before rendering — so factoring it out into `controllers/*.ts` is a clean, mechanical move for those routes.

**Client Components (`'use client'`) can't do this** — they can't `await` at the top of the component, so their data-fetching happens inside `useEffect`, coupled to `useState` for loading/error/data. That `useEffect` body already *is* the thin "call Model, hand data to View" glue; wrapping it in a separate `controllers/*.ts` hook would just move the same three lines into another file for no behavioral or architectural gain, while adding a layer of indirection between the state that owns the data and the effect that fetches it. So for Client Component routes, this plan extracts only the Model layer (the raw `apiGet`/`apiPost` call moves to `models/`) and leaves the surrounding `useEffect`/`useState` orchestration exactly where it is, in the page.

Of the 13 customer-facing routes:
- **4 get a Controller** (Server Components with page-load data fetching): home, products list, product detail, showcase.
- **5 get Model-only extraction** (Client Components with data fetching): compare, wishlist, orders list, order detail, checkout.
- **4 get no change** (Client Components with zero API calls — they only read Zustand stores, which are out of scope): cart, dashboard, login, register.

---

### Task 1: Relocate the shared Models — `category`, `banner`, `settings`

`lib/catalog.ts` (→ `getCategories`), `lib/banners.ts` (→ `getBanners`), and `lib/settings.ts` + `lib/content.ts` (→ `getSettings`/`resolveContent`) aren't page-specific — they're consumed by the root layout (rendered on *every* page) and by several shared `components/layout/*` and `components/shop/*` files, plus one admin page. Moving them means fixing every consumer's import path in the same commit; there's no way to do this per-route without leaving broken imports. This task is the one deliberate, minimal exception to the "customer-facing routes only" scope: 3 of its ~15 touched files are outside the shop/account/auth route groups, and all 3 are one-line import path fixes, not restructuring.

**Files:**
- Create: `apps/web/src/models/category.model.ts`
- Create: `apps/web/src/models/banner.model.ts`
- Create: `apps/web/src/models/settings.model.ts`
- Delete: `apps/web/src/lib/catalog.ts`
- Delete: `apps/web/src/lib/banners.ts`
- Delete: `apps/web/src/lib/settings.ts`
- Delete: `apps/web/src/lib/content.ts`
- Modify (import path only): `apps/web/src/app/page.tsx`, `apps/web/src/app/layout.tsx`, `apps/web/src/app/sitemap.ts`, `apps/web/src/app/(shop)/products/page.tsx`, `apps/web/src/app/(shop)/products/[slug]/page.tsx`, `apps/web/src/app/(shop)/showcase/page.tsx`, `apps/web/src/app/(admin)/admin/settings/page.tsx`, `apps/web/src/components/layout/brand-mark.tsx`, `apps/web/src/components/layout/navbar.tsx`, `apps/web/src/components/layout/settings-context.tsx`, `apps/web/src/components/layout/mobile-menu.tsx`, `apps/web/src/components/layout/mega-menu.tsx`, `apps/web/src/components/layout/footer.tsx`, `apps/web/src/components/shop/hero-slider.tsx`, `apps/web/src/components/shop/category-showcase.tsx`

**Interfaces:**
- Consumes: nothing from other tasks — first task.
- Produces: `getCategories(): Promise<NavCategory[]>`, `getBanners(): Promise<Banner[]>`, `getSettings(): Promise<SiteSettings>`, `resolveContent(s: SiteSettings): ResolvedContent`, `CONTENT_DEFAULTS`, `DEFAULT_SETTINGS`, types `NavCategory`, `Banner`, `BrandInfo`, `ResolvedContent`.

- [ ] **Step 1: Create `models/category.model.ts`** — exact relocation of `lib/catalog.ts`

```typescript
// apps/web/src/models/category.model.ts
import { cache } from 'react';
import { apiGet } from '@/lib/api-client';

export interface NavCategory {
  id: string;
  name: string;
  slug: string;
  description?: string | null;
  imageUrl?: string | null;
  parentId?: string | null;
  _count?: { products: number };
}

/** Cached per request — feeds the mega-menu without a client fetch flash. */
export const getCategories = cache(async (): Promise<NavCategory[]> => {
  try {
    const [cats, brands] = await Promise.all([
      apiGet<NavCategory[]>('/api/v1/categories'),
      apiGet<any[]>('/api/v1/brands').catch(() => []),
    ]);

    const smart = cats.find(c => c.slug === 'smartphones');
    if (smart) {
      smart.name = 'Mobile';

      const brandCats = brands.map(b => ({
        id: `virtual-brand-${b.id}`,
        name: b.name,
        slug: `smartphones&brand=${b.slug}`,
        parentId: smart.id,
      }));

      return [...cats, ...brandCats];
    }

    return cats;
  } catch {
    return [];
  }
});
```

- [ ] **Step 2: Create `models/banner.model.ts`** — exact relocation of `lib/banners.ts`

```typescript
// apps/web/src/models/banner.model.ts
import { cache } from 'react';
import { apiGet } from '@/lib/api-client';

export interface Banner {
  id: string;
  heading: string;
  subheading?: string | null;
  imageUrl?: string | null;
  ctaLabel?: string | null;
  ctaHref?: string | null;
  position: number;
  isActive: boolean;
}

/** Active hero slides, cached per request. */
export const getBanners = cache(async (): Promise<Banner[]> => {
  try {
    return await apiGet<Banner[]>('/api/v1/banners/active');
  } catch {
    return [];
  }
});
```

- [ ] **Step 3: Create `models/settings.model.ts`** — relocation of `lib/settings.ts`, with `lib/content.ts`'s pure logic folded in (it operates on the same `SiteSettings` entity and every caller of `getSettings()` immediately calls `resolveContent()` on the result — keeping them in one file removes an import for every consumer without changing behavior)

```typescript
// apps/web/src/models/settings.model.ts
import { cache } from 'react';
import type { SiteSettings, SiteFeature } from '@drikon/shared-types';
import { apiGet } from '@/lib/api-client';

export interface BrandInfo {
  siteName: string;
  logoUrl: string | null;
  tagline?: string | null;
}

export const DEFAULT_SETTINGS: SiteSettings = {
  id: 'singleton',
  siteName: 'Drikon',
  tagline: 'Vision, engineered.',
  logoUrl: null,
  faviconUrl: null,
  accentColor: null,
  accentColor2: null,
  supportEmail: null,
  socialFacebook: null,
  socialInstagram: null,
};

/**
 * Server-side fetch of the white-label branding. `cache()` dedupes the call
 * within a single request (layout + generateMetadata share one fetch).
 * Falls back to defaults so the storefront still renders if the API is down.
 */
export const getSettings = cache(async (): Promise<SiteSettings> => {
  try {
    return await apiGet<SiteSettings>('/api/v1/settings');
  } catch {
    return DEFAULT_SETTINGS;
  }
});

// ────────────────────────────────────────────────────────────────────────────
// EDITABLE STOREFRONT CONTENT (moved from lib/content.ts — no logic changed)
//
// Single source of truth for the built-in copy. Every surface reads through
// `resolveContent()`, so any field left blank in the admin panel falls back to
// these defaults — there is no hardcoded marketing copy in the components.
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
  heroBadge: 'Premium devices · Express delivery',
  heroTitle: 'Upgrade Your Tech.\nProtect Your Gear.\nPower Your Life.',
  heroHighlight: 'Power Your Life.',
  heroSubtitle:
    '{brand} is your premium destination for the latest smartphones, protective cases, and high-speed chargers. Authentic devices, expert support, express delivery.',
  heroCtaLabel: 'Shop all devices',
  heroCtaHref: '/products',
  heroCtaAltLabel: 'New arrivals',
  heroCtaAltHref: '/products?featured=true',
  features: [
    { title: 'Premium Devices', body: 'Latest flagship smartphones' },
    { title: 'Express Delivery', body: 'Tracked, nationwide shipping' },
    { title: 'Authentic Accessories', body: 'Genuine cases and chargers' },
    { title: '24/7 Support', body: 'Always here to help' },
  ] as SiteFeature[],
  ctaHeading: 'Elevate your mobile experience.',
  ctaBody:
    'Whether you are upgrading to the latest flagship or looking for the perfect MagSafe accessory, {brand} brings you the finest selection of premium mobile gear.',
  ctaButtonLabel: 'Start exploring',
  ctaButtonHref: '/register',
  dealsTitle: 'Deals of the week',
  dealsBlurb: 'Hand-picked premium mobile gear on sale.',
  dealsImage: '',
  topbarPromo: 'Free shipping over ৳3,000 · Authentic devices guaranteed',
  footerNote: 'Built for mobile enthusiasts.',
  shippingNote: 'Free shipping over ৳3,000',
  returnsNote: '14-day easy returns',
  warrantyNote: 'Genuine devices guaranteed',
  seoKeywords: 'smartphones, mobile accessories, phone cases, fast chargers, power banks, iphone, samsung',
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
```

- [ ] **Step 4: Delete the old files**

```bash
rm apps/web/src/lib/catalog.ts apps/web/src/lib/banners.ts apps/web/src/lib/settings.ts apps/web/src/lib/content.ts
```

- [ ] **Step 5: Fix every import path** — each of these is a one-line change, old → new:

| File | Old import | New import |
|---|---|---|
| `app/page.tsx` | `import { getSettings, resolveContent } from '@/lib/settings';`<br>`import { getBanners } from '@/lib/banners';`<br>`import { getCategories } from '@/lib/catalog';` | `import { getSettings, resolveContent } from '@/models/settings.model';`<br>`import { getBanners } from '@/models/banner.model';`<br>`import { getCategories } from '@/models/category.model';` |
| `app/layout.tsx` | `import { getSettings, resolveContent } from '@/lib/settings';`<br>`import { getCategories } from '@/lib/catalog';` | `import { getSettings, resolveContent } from '@/models/settings.model';`<br>`import { getCategories } from '@/models/category.model';` |
| `app/sitemap.ts` | `import { getCategories } from '@/lib/catalog';` | `import { getCategories } from '@/models/category.model';` |
| `app/(shop)/products/page.tsx` | `import { getCategories } from '@/lib/catalog';` | `import { getCategories } from '@/models/category.model';` |
| `app/(shop)/products/[slug]/page.tsx` | `import { getSettings, resolveContent } from '@/lib/settings';` | `import { getSettings, resolveContent } from '@/models/settings.model';` |
| `app/(shop)/showcase/page.tsx` | `import { getSettings } from '@/lib/settings';` | `import { getSettings } from '@/models/settings.model';` |
| `app/(admin)/admin/settings/page.tsx` | `import { CONTENT_DEFAULTS } from '@/lib/content';` | `import { CONTENT_DEFAULTS } from '@/models/settings.model';` |
| `components/layout/brand-mark.tsx` | `import type { BrandInfo } from '@/lib/settings';` | `import type { BrandInfo } from '@/models/settings.model';` |
| `components/layout/navbar.tsx` | `import type { BrandInfo } from '@/lib/settings';`<br>`import type { NavCategory } from '@/lib/catalog';` | `import type { BrandInfo } from '@/models/settings.model';`<br>`import type { NavCategory } from '@/models/category.model';` |
| `components/layout/settings-context.tsx` | `import type { BrandInfo } from '@/lib/settings';` | `import type { BrandInfo } from '@/models/settings.model';` |
| `components/layout/mobile-menu.tsx` | `import type { BrandInfo } from '@/lib/settings';`<br>`import type { NavCategory } from '@/lib/catalog';` | `import type { BrandInfo } from '@/models/settings.model';`<br>`import type { NavCategory } from '@/models/category.model';` |
| `components/layout/mega-menu.tsx` | `import type { NavCategory } from '@/lib/catalog';` | `import type { NavCategory } from '@/models/category.model';` |
| `components/layout/footer.tsx` | `import type { BrandInfo } from '@/lib/settings';`<br>`import type { NavCategory } from '@/lib/catalog';` | `import type { BrandInfo } from '@/models/settings.model';`<br>`import type { NavCategory } from '@/models/category.model';` |
| `components/shop/hero-slider.tsx` | `import type { Banner } from '@/lib/banners';` | `import type { Banner } from '@/models/banner.model';` |
| `components/shop/category-showcase.tsx` | `import type { NavCategory } from '@/lib/catalog';` | `import type { NavCategory } from '@/models/category.model';` |

- [ ] **Step 6: Verify no stale imports remain**

Run: `grep -rn "from '@/lib/catalog'\|from '@/lib/banners'\|from '@/lib/settings'\|from '@/lib/content'" apps/web/src`
Expected: no output.

- [ ] **Step 7: Build**

Run: `pnpm --filter web build`
Expected: build succeeds with zero TypeScript errors.

- [ ] **Step 8: Commit**

```bash
git add apps/web/src/models/category.model.ts apps/web/src/models/banner.model.ts apps/web/src/models/settings.model.ts apps/web/src/app/page.tsx apps/web/src/app/layout.tsx apps/web/src/app/sitemap.ts "apps/web/src/app/(shop)/products/page.tsx" "apps/web/src/app/(shop)/products/[slug]/page.tsx" "apps/web/src/app/(shop)/showcase/page.tsx" "apps/web/src/app/(admin)/admin/settings/page.tsx" apps/web/src/components/layout/brand-mark.tsx apps/web/src/components/layout/navbar.tsx apps/web/src/components/layout/settings-context.tsx apps/web/src/components/layout/mobile-menu.tsx apps/web/src/components/layout/mega-menu.tsx apps/web/src/components/layout/footer.tsx apps/web/src/components/shop/hero-slider.tsx apps/web/src/components/shop/category-showcase.tsx
git rm apps/web/src/lib/catalog.ts apps/web/src/lib/banners.ts apps/web/src/lib/settings.ts apps/web/src/lib/content.ts
git commit -m "refactor(web): relocate category/banner/settings data-fetching into models/"
```

---

### Task 2: `product.model.ts` + `brand.model.ts` + `controllers/home.controller.ts` + refactor the home page

**Files:**
- Create: `apps/web/src/models/product.model.ts`
- Create: `apps/web/src/models/brand.model.ts`
- Create: `apps/web/src/controllers/home.controller.ts`
- Modify: `apps/web/src/app/page.tsx`

**Interfaces:**
- Consumes: `getSettings` (`@/models/settings.model`), `getBanners` (`@/models/banner.model`), `getCategories` (`@/models/category.model`) — all Task 1.
- Produces: `getProducts(queryString: string): Promise<ProductListResponse>`, `getProductBySlug(slug: string): Promise<ProductDetail | null>` (Model, `@/models/product.model`); `getBrands(): Promise<BrandLite[]>` (Model, `@/models/brand.model`); `getHomePageData(): Promise<HomePageData>` (Controller, `@/controllers/home.controller`) — the last one is consumed by Task 3's products list controller and Task 5's showcase controller for the shared `getProducts`/`getProductBySlug` primitives, not `getHomePageData` itself (that's home-only).

- [ ] **Step 1: Create `models/product.model.ts`**

Note: `apps/web/src/app/(shop)/products/[slug]/page.tsx` currently defines its own **local** `interface ProductListResponse { items: ProductSummary[]; pagination: { total: number } }`, separate from the one imported from `@drikon/shared-types` elsewhere (home page, products list page). The shared-types version is a superset (fuller pagination object) and satisfies every place the local one was used, so this task standardizes on the shared-types version everywhere and the local duplicate is dropped in Task 4.

```typescript
// apps/web/src/models/product.model.ts
import { cache } from 'react';
import { apiGet, ApiError } from '@/lib/api-client';
import type { ProductSummary, ProductListResponse } from '@drikon/shared-types';

export interface ProductDetail extends ProductSummary {
  description: string;
  sku: string;
  attributes?: Record<string, any> | null;
  brandId?: string | null;
  categoryId: string;
  videoUrl?: string | null;
}

export function getProducts(queryString: string): Promise<ProductListResponse> {
  return apiGet<ProductListResponse>(`/api/v1/products?${queryString}`);
}

// cache() dedupes the fetch shared by generateMetadata + the page render (Task 4).
export const getProductBySlug = cache(async (slug: string): Promise<ProductDetail | null> => {
  try {
    return await apiGet<ProductDetail>(`/api/v1/products/slug/${slug}`);
  } catch (err) {
    if (err instanceof ApiError && err.status === 404) return null;
    throw err;
  }
});
```

- [ ] **Step 2: Create `models/brand.model.ts`** — extracted from the `getBrands` function that was previously defined inline in `app/page.tsx`

```typescript
// apps/web/src/models/brand.model.ts
import { apiGet } from '@/lib/api-client';

export interface BrandLite {
  id: string;
  name: string;
  slug: string;
  logoUrl?: string | null;
}

export function getBrands(): Promise<BrandLite[]> {
  return apiGet<BrandLite[]>('/api/v1/brands');
}
```

- [ ] **Step 3: Create `controllers/home.controller.ts`** — absorbs the two page-local helper functions (`getFeatured`, `getBrands`) that used to live in `app/page.tsx`, preserving their exact original try/catch behavior

```typescript
// apps/web/src/controllers/home.controller.ts
import type { ProductListResponse, SiteSettings } from '@drikon/shared-types';
import { getProducts } from '@/models/product.model';
import { getBrands, type BrandLite } from '@/models/brand.model';
import { getSettings } from '@/models/settings.model';
import { getBanners, type Banner } from '@/models/banner.model';
import { getCategories, type NavCategory } from '@/models/category.model';

export interface HomePageData {
  featured: ProductListResponse | null;
  settings: SiteSettings;
  banners: Banner[];
  categories: NavCategory[];
  brands: BrandLite[];
}

async function getFeatured(): Promise<ProductListResponse | null> {
  try {
    return await getProducts('featured=true&limit=4');
  } catch {
    return null;
  }
}

async function getHomeBrands(): Promise<BrandLite[]> {
  try {
    return await getBrands();
  } catch {
    return [];
  }
}

export async function getHomePageData(): Promise<HomePageData> {
  const [featured, settings, banners, categories, brands] = await Promise.all([
    getFeatured(),
    getSettings(),
    getBanners(),
    getCategories(),
    getHomeBrands(),
  ]);
  return { featured, settings, banners, categories, brands };
}
```

- [ ] **Step 4: Refactor `app/page.tsx`** — replace the whole file

```typescript
// apps/web/src/app/page.tsx
export const dynamic = 'force-dynamic';

import Link from 'next/link';
import { ArrowRight, Sparkles, ShieldCheck, Truck, Headphones } from 'lucide-react';
import { ProductGrid } from '@/components/shop/product-grid';
import { CategoryShowcase } from '@/components/shop/category-showcase';
import { FlashSaleSection } from '@/components/shop/flash-sale-section';
import { HeroSlider } from '@/components/shop/hero-slider';
import { BrandStrip } from '@/components/shop/brand-strip';
import { StatsBand } from '@/components/shop/stats-band';
import { Reveal } from '@/components/ui/reveal';
import { resolveContent } from '@/models/settings.model';
import { getHomePageData } from '@/controllers/home.controller';

// Rotating icon set for the (editable) feature strip cards.
const FEATURE_ICONS = [
  <ShieldCheck className="w-5 h-5" key="shield" />,
  <Truck className="w-5 h-5" key="truck" />,
  <Headphones className="w-5 h-5" key="headphones" />,
  <Sparkles className="w-5 h-5" key="sparkles" />,
];

export default async function HomePage() {
  const { featured, settings, banners, categories, brands } = await getHomePageData();
  const c = resolveContent(settings);

  return (
    <>
      {/* ─── HERO: admin-managed slider, with the static hero as fallback ─── */}
      {banners.length > 0 ? (
        <HeroSlider slides={banners} />
      ) : (
      <section className="relative overflow-hidden grain aurora">
        <div className="absolute inset-0 bg-drikon-mesh" aria-hidden />
        <div className="relative z-10 max-w-7xl mx-auto px-6 pt-12 pb-16 md:pt-20 md:pb-24">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 lg:gap-12 items-center">
            <div className="max-w-3xl">
              <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full glass text-xs font-medium mb-6 animate-fade-up shadow-[0_0_24px_-8px_var(--glow)]">
                <Sparkles className="w-3.5 h-3.5 text-[color:var(--accent)]" />
                <span>{c.heroBadge}</span>
              </div>

              <h1 className="display text-5xl md:text-6xl lg:text-7xl animate-fade-up" style={{ animationDelay: '120ms' }}>
                {c.heroTitle.split('\n').map((line, i, arr) => {
                  const isHighlight = line.trim() === c.heroHighlight.trim();
                  return (
                    <span key={i}>
                      {isHighlight ? (
                        <span className="bg-gradient-to-r from-[color:var(--accent)] via-[color:var(--accent-2)] to-white/70 bg-clip-text text-transparent">
                          {line}
                        </span>
                    ) : (
                      line
                    )}
                    {i < arr.length - 1 && <br />}
                  </span>
                );
              })}
            </h1>

            <p className="mt-6 max-w-xl text-lg text-[color:var(--fg-muted)] animate-fade-up" style={{ animationDelay: '240ms' }}>
              {c.heroSubtitle}
            </p>

              <div className="mt-10 flex flex-wrap gap-3 animate-fade-up" style={{ animationDelay: '360ms' }}>
                <Link href={c.heroCtaHref} className="btn-primary">
                  {c.heroCtaLabel} <ArrowRight className="w-4 h-4" />
                </Link>
                <Link href={c.heroCtaAltHref} className="btn-ghost">
                  {c.heroCtaAltLabel}
                </Link>
              </div>
            </div>

            {/* Hero Image Side */}
            <div className="hidden lg:flex justify-center relative animate-float" style={{ animationDelay: '400ms' }}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src="/hero.png" alt="Premium Smartphone" className="w-full max-w-[500px] h-auto drop-shadow-[0_0_60px_rgba(59,130,246,0.3)] object-contain rounded-[2rem]" />
            </div>
          </div>

          {/* Asymmetric decoration */}
          <div
            className="hidden md:block absolute right-[-80px] top-24 w-[420px] h-[420px] rounded-full bg-gradient-to-br from-[#ef6a20]/30 to-[#14233f]/20 blur-3xl"
            aria-hidden
          />
        </div>
      </section>
      )}

      {/* ─── FEATURE STRIP ─── */}
      {c.features.length > 0 && (
        <section className="border-y border-[color:var(--border)] bg-[color:var(--bg-soft)]/30">
          <div className="max-w-7xl mx-auto px-6 py-10 grid grid-cols-2 md:grid-cols-4 gap-8">
            {c.features.map((f, i) => (
              <Feature key={i} icon={FEATURE_ICONS[i % FEATURE_ICONS.length]} title={f.title} body={f.body} />
            ))}
          </div>
        </section>
      )}

      {/* ─── FLASH SALE (only renders when one is live) ─── */}
      <FlashSaleSection />

      {/* ─── SHOP BY CATEGORY ─── */}
      <CategoryShowcase categories={categories} dealsTitle={c.dealsTitle} dealsBlurb={c.dealsBlurb} dealsImage={c.dealsImage} />

      {/* ─── FEATURED PRODUCTS ─── */}
      <section className="max-w-7xl mx-auto px-6 py-20">
        <div className="flex items-end justify-between mb-10 gap-6">
          <div>
            <div className="text-xs font-mono uppercase tracking-[0.2em] text-[color:var(--accent)] mb-2">
              Featured devices
            </div>
            <h2 className="display text-3xl md:text-4xl">Trending devices</h2>
          </div>
          <Link href="/products" className="text-sm font-medium hover:text-[color:var(--accent)] transition-colors inline-flex items-center gap-1">
            Shop all <ArrowRight className="w-4 h-4" />
          </Link>
        </div>

        {featured && featured.items.length > 0 ? (
          <ProductGrid products={featured.items} />
        ) : (
          <div className="card text-center py-16 text-[color:var(--fg-muted)]">
            <p>No featured devices yet.</p>
            <p className="text-xs mt-2">Mark products as featured in the admin to show them here.</p>
          </div>
        )}
      </section>

      {/* ─── TRUSTED BRANDS ─── */}
      <BrandStrip brands={brands} />

      {/* ─── STATS BAND ─── */}
      <StatsBand />

      {/* ─── EDITORIAL CTA ─── */}
      <section className="max-w-7xl mx-auto px-6 pb-24">
        <Reveal className="relative overflow-hidden rounded-3xl bg-drikon-gradient p-10 md:p-16 text-white grain">
          <div className="relative z-10 max-w-2xl">
            <h3 className="display text-3xl md:text-5xl">
              {c.ctaHeading}
            </h3>
            <p className="mt-4 text-white/80 max-w-lg">
              {c.ctaBody}
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Link href={c.ctaButtonHref} className="inline-flex items-center gap-2 px-5 py-3 rounded-xl bg-white text-[#06070d] font-semibold hover:bg-white/90 transition-colors">
                {c.ctaButtonLabel} <ArrowRight className="w-4 h-4" />
              </Link>
            </div>
          </div>
        </Reveal>
      </section>
    </>
  );
}

function Feature({ icon, title, body }: { icon: React.ReactNode; title: string; body: string }) {
  return (
    <div className="flex items-start gap-3">
      <div className="w-9 h-9 rounded-lg bg-[color:var(--bg)] border border-[color:var(--border)] grid place-items-center text-[color:var(--accent)] shrink-0">
        {icon}
      </div>
      <div>
        <div className="font-semibold text-sm">{title}</div>
        <div className="text-xs text-[color:var(--fg-muted)] mt-0.5">{body}</div>
      </div>
    </div>
  );
}
```

- [ ] **Step 5: Build**

Run: `pnpm --filter web build`
Expected: build succeeds with zero TypeScript errors.

- [ ] **Step 6: Manual smoke check**

Run `pnpm --filter web dev`, open `/`, confirm the hero, featured products, categories, brands, and CTA sections render exactly as before.

- [ ] **Step 7: Commit**

```bash
git add apps/web/src/models/product.model.ts apps/web/src/models/brand.model.ts apps/web/src/controllers/home.controller.ts apps/web/src/app/page.tsx
git commit -m "refactor(web): extract ProductModel/BrandModel and a home page controller"
```

---

### Task 3: `controllers/products-list.controller.ts` + refactor the products list page

**Files:**
- Create: `apps/web/src/controllers/products-list.controller.ts`
- Modify: `apps/web/src/app/(shop)/products/page.tsx`

**Interfaces:**
- Consumes: `getProducts(queryString)` (`@/models/product.model`, Task 2), `getCategories()` (`@/models/category.model`, Task 1).
- Produces: `getProductsListPageData(params): Promise<ProductsListPageData>`.

- [ ] **Step 1: Create `controllers/products-list.controller.ts`** — absorbs the query-string building, the try/catch that used to be inline in the page, and the top-level category filtering

```typescript
// apps/web/src/controllers/products-list.controller.ts
import type { ProductListResponse } from '@drikon/shared-types';
import { getProducts } from '@/models/product.model';
import { getCategories, type NavCategory } from '@/models/category.model';

export interface ProductsListPageData {
  data: ProductListResponse | null;
  error: string | null;
  topCategories: NavCategory[];
  page: number;
  currentSort: string;
  currentCategory?: string;
  currentSearch?: string;
}

export async function getProductsListPageData(
  params: Record<string, string | string[] | undefined>,
): Promise<ProductsListPageData> {
  const qs = new URLSearchParams();
  for (const [k, v] of Object.entries(params)) {
    if (typeof v === 'string' && v) qs.set(k, v);
  }

  let data: ProductListResponse | null = null;
  let error: string | null = null;
  try {
    data = await getProducts(qs.toString());
  } catch (e: any) {
    error = e?.message ?? 'Failed to load products';
  }

  const allCats = await getCategories();
  const topCategories = allCats.filter((c) => !c.parentId).slice(0, 8);

  const page = parseInt((params.page as string) ?? '1', 10);
  const currentSort = (params.sort as string) ?? 'newest';
  const currentCategory = params.category as string | undefined;
  const currentSearch = params.search as string | undefined;

  return { data, error, topCategories, page, currentSort, currentCategory, currentSearch };
}
```

- [ ] **Step 2: Refactor `app/(shop)/products/page.tsx`** — replace the whole file

```typescript
// apps/web/src/app/(shop)/products/page.tsx
import Link from 'next/link';
import { PackageX, SearchX } from 'lucide-react';
import { ProductGrid } from '@/components/shop/product-grid';
import { EmptyState } from '@/components/ui/empty-state';
import { getProductsListPageData } from '@/controllers/products-list.controller';

interface PageProps {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}

export const dynamic = 'force-dynamic';

export default async function ProductsPage({ searchParams }: PageProps) {
  const params = await searchParams;
  const {
    data,
    error,
    topCategories: topCats,
    page,
    currentSort,
    currentCategory,
    currentSearch,
  } = await getProductsListPageData(params);

  return (
    <div className="max-w-7xl mx-auto px-6 py-14">
      <div className="flex items-end justify-between mb-10 flex-wrap gap-4">
        <div>
          <div className="text-xs font-mono uppercase tracking-[0.2em] text-[color:var(--accent)] mb-2">
            {currentSearch ? 'Search' : currentCategory ? currentCategory : 'Shop'}
          </div>
          <h1 className="display text-4xl md:text-5xl">
            {currentSearch
              ? `“${currentSearch}”`
              : currentCategory
                ? capitalize(currentCategory)
                : 'All products'}
          </h1>
          {data && (
            <p className="text-sm text-[color:var(--fg-muted)] mt-2">
              {data.pagination.total} products
            </p>
          )}
        </div>

        {/* ─── Sort ─── */}
        <SortLinks current={currentSort} params={params} />
      </div>

      {/* ─── Quick category chips ─── */}
      <div className="flex flex-wrap gap-2 mb-10">
        <CategoryChip active={!currentCategory} href="/products">All</CategoryChip>
        {topCats.map((c) => (
          <CategoryChip key={c.id} active={currentCategory === c.slug} href={`/products?category=${c.slug}`}>
            {c.name}
          </CategoryChip>
        ))}
      </div>

      {error ? (
        <div className="card !p-0">
          <EmptyState
            icon={<PackageX className="w-6 h-6" />}
            title="Couldn’t load products"
            description={error}
            action={<Link href="/products" className="btn-primary">Try again</Link>}
          />
        </div>
      ) : !data || data.items.length === 0 ? (
        <div className="card !p-0">
          <EmptyState
            icon={<SearchX className="w-6 h-6" />}
            title="No products match"
            description={currentSearch || currentCategory ? 'Nothing here for those filters yet — try clearing them.' : 'No products have been added yet. Check back soon.'}
            action={(currentSearch || currentCategory) && <Link href="/products" className="btn-primary">Clear filters</Link>}
          />
        </div>
      ) : (
        <>
          <ProductGrid
            products={data.items}
            className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6"
          />

          {data.pagination.totalPages > 1 && (
            <div className="mt-12 flex items-center justify-center gap-2">
              {data.pagination.hasPrev && (
                <PageLink params={params} page={page - 1}>← Previous</PageLink>
              )}
              <span className="px-4 py-2 text-sm text-[color:var(--fg-muted)]">
                Page {page} of {data.pagination.totalPages}
              </span>
              {data.pagination.hasNext && (
                <PageLink params={params} page={page + 1}>Next →</PageLink>
              )}
            </div>
          )}
        </>
      )}
    </div>
  );
}

function capitalize(s: string) {
  return s.charAt(0).toUpperCase() + s.slice(1).replace('-', ' ');
}

function CategoryChip({ active, href, children }: { active: boolean; href: string; children: React.ReactNode }) {
  return (
    <Link
      href={href}
      className={`px-4 py-2 rounded-full text-sm font-medium border transition-colors ${
        active
          ? 'bg-[color:var(--fg)] text-[color:var(--bg)] border-[color:var(--fg)]'
          : 'border-[color:var(--border)] hover:border-[color:var(--fg-muted)]'
      }`}
    >
      {children}
    </Link>
  );
}

function SortLinks({
  current,
  params,
}: {
  current: string;
  params: Record<string, string | string[] | undefined>;
}) {
  const options: Array<{ value: string; label: string }> = [
    { value: 'newest', label: 'Newest' },
    { value: 'popular', label: 'Most popular' },
    { value: 'price_asc', label: 'Price ↑' },
    { value: 'price_desc', label: 'Price ↓' },
    { value: 'rating', label: 'Top rated' },
  ];
  return (
    <div className="flex gap-1.5 text-sm overflow-x-auto scrollbar-none max-w-full [&>*]:shrink-0">
      {options.map((o) => {
        const next = new URLSearchParams();
        for (const [k, v] of Object.entries(params)) {
          if (typeof v === 'string' && v) next.set(k, v);
        }
        next.set('sort', o.value);
        next.delete('page');
        return (
          <Link
            key={o.value}
            href={`/products?${next.toString()}`}
            className={`px-3 py-1.5 rounded-md ${
              current === o.value
                ? 'bg-[color:var(--bg-soft)] text-[color:var(--fg)]'
                : 'text-[color:var(--fg-muted)] hover:text-[color:var(--fg)]'
            }`}
          >
            {o.label}
          </Link>
        );
      })}
    </div>
  );
}

function PageLink({
  params,
  page,
  children,
}: {
  params: Record<string, string | string[] | undefined>;
  page: number;
  children: React.ReactNode;
}) {
  const next = new URLSearchParams();
  for (const [k, v] of Object.entries(params)) {
    if (typeof v === 'string' && v) next.set(k, v);
  }
  next.set('page', String(page));
  return (
    <Link href={`/products?${next.toString()}`} className="btn-ghost text-sm py-2 px-4">
      {children}
    </Link>
  );
}
```

- [ ] **Step 3: Build**

Run: `pnpm --filter web build`
Expected: build succeeds with zero TypeScript errors.

- [ ] **Step 4: Manual smoke check**

Run `pnpm --filter web dev`, open `/products`, `/products?category=<slug>`, `/products?search=x`, and a sort link. Confirm filtering, sorting, pagination, and the error/empty states all behave exactly as before.

- [ ] **Step 5: Commit**

```bash
git add apps/web/src/controllers/products-list.controller.ts "apps/web/src/app/(shop)/products/page.tsx"
git commit -m "refactor(web): extract a products list page controller"
```

---

### Task 4: `controllers/product-detail.controller.ts` + refactor the product detail page

**Files:**
- Create: `apps/web/src/controllers/product-detail.controller.ts`
- Modify: `apps/web/src/app/(shop)/products/[slug]/page.tsx`

**Interfaces:**
- Consumes: `getProductBySlug(slug)`, `getProducts(queryString)` (`@/models/product.model`, Task 2), `getSettings`, `resolveContent` (`@/models/settings.model`, Task 1).
- Produces: `getProductDetailPageData(slug): Promise<ProductDetailPageData | null>`.

- [ ] **Step 1: Create `controllers/product-detail.controller.ts`** — absorbs the page-local `getRelated` helper; `generateMetadata` in the page will call `getProductBySlug` directly (matching the original file's own pattern of using the shared `cache()`-wrapped fetcher directly for metadata, without paying for related-products/settings computation it doesn't need)

```typescript
// apps/web/src/controllers/product-detail.controller.ts
import type { ProductSummary } from '@drikon/shared-types';
import { getProductBySlug, getProducts, type ProductDetail } from '@/models/product.model';
import { getSettings, resolveContent, type ResolvedContent } from '@/models/settings.model';

export interface ProductDetailPageData {
  product: ProductDetail;
  related: ProductSummary[];
  content: ResolvedContent;
}

async function getRelated(categorySlug: string, excludeId: string): Promise<ProductSummary[]> {
  try {
    const data = await getProducts(`category=${categorySlug}&limit=8`);
    return data.items.filter((p) => p.id !== excludeId).slice(0, 4);
  } catch {
    return [];
  }
}

export async function getProductDetailPageData(slug: string): Promise<ProductDetailPageData | null> {
  const product = await getProductBySlug(slug);
  if (!product) return null;

  const [related, settings] = await Promise.all([
    getRelated(product.category.slug, product.id),
    getSettings(),
  ]);

  return { product, related, content: resolveContent(settings) };
}
```

- [ ] **Step 2: Refactor `app/(shop)/products/[slug]/page.tsx`** — replace the whole file

```typescript
// apps/web/src/app/(shop)/products/[slug]/page.tsx
import type { Metadata } from 'next';
import Link from 'next/link';
import Image from 'next/image';
import { notFound } from 'next/navigation';
import { ArrowLeft, Star, ShieldCheck, Truck, RefreshCw } from 'lucide-react';
import { SITE_URL } from '@/lib/site';
import { getProductBySlug } from '@/models/product.model';
import { getProductDetailPageData } from '@/controllers/product-detail.controller';
import { ProductGrid } from '@/components/shop/product-grid';
import { AddToCart } from '@/components/shop/add-to-cart';
import { WishlistButton } from '@/components/shop/wishlist-button';
import { CompareButton } from '@/components/shop/compare-button';
import { ProductReviews } from '@/components/shop/product-reviews';
import { VideoEmbed } from '@/components/shop/video-embed';
import { PremiumProductPage } from '@/components/shop/premium-product-page';
import { formatPrice } from '@/lib/utils';

export const dynamic = 'force-dynamic';

interface PageProps {
  params: Promise<{ slug: string }>;
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params;
  const product = await getProductBySlug(slug);
  if (!product) return { title: 'Product not found' };
  const desc =
    product.shortDescription ||
    (product.description ? product.description.replace(/\s+/g, ' ').slice(0, 160) : `${product.name} — available now.`);
  const url = `${SITE_URL}/products/${product.slug}`;
  const img = product.images?.[0]?.url;
  return {
    title: product.name,
    description: desc,
    alternates: { canonical: url },
    openGraph: {
      title: product.name,
      description: desc,
      url,
      type: 'website',
      ...(img ? { images: [{ url: img }] } : {}),
    },
    twitter: {
      card: 'summary_large_image',
      title: product.name,
      description: desc,
      ...(img ? { images: [img] } : {}),
    },
  };
}

export default async function ProductDetailPage({ params }: PageProps) {
  const { slug } = await params;
  const pageData = await getProductDetailPageData(slug);

  if (!pageData) notFound();
  const { product, related, content } = pageData;

  const price = typeof product.price === 'string' ? parseFloat(product.price) : product.price;
  const compareAt = product.compareAtPrice
    ? typeof product.compareAtPrice === 'string'
      ? parseFloat(product.compareAtPrice)
      : product.compareAtPrice
    : null;
  const onSale = compareAt && compareAt > price;
  const discount = onSale && compareAt ? Math.round(((compareAt - price) / compareAt) * 100) : 0;

  const isPremium = product.attributes && typeof product.attributes === 'object' && 'template' in product.attributes && product.attributes.template === 'premium';

  // Product structured data (rich results in search).
  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'Product',
    name: product.name,
    description: product.shortDescription || product.description,
    sku: product.sku,
    ...(product.images?.length ? { image: product.images.map((i) => i.url) } : {}),
    ...(product.brand ? { brand: { '@type': 'Brand', name: product.brand.name } } : {}),
    offers: {
      '@type': 'Offer',
      price,
      priceCurrency: product.currency,
      availability: product.stock > 0 ? 'https://schema.org/InStock' : 'https://schema.org/OutOfStock',
      url: `${SITE_URL}/products/${product.slug}`,
    },
    ...(product.averageRating > 0
      ? { aggregateRating: { '@type': 'AggregateRating', ratingValue: product.averageRating, reviewCount: product.reviewCount } }
      : {}),
  };
  const JsonLd = () => (
    <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
  );

  if (isPremium) {
    return (
      <>
        <JsonLd />
        <PremiumProductPage product={product} related={related} />
      </>
    );
  }

  return (
    <>
    <JsonLd />
    <div className="max-w-7xl mx-auto px-6 py-10">
      {/* Breadcrumb */}
      <nav className="text-xs text-[color:var(--fg-muted)] mb-8 flex items-center gap-1.5 flex-wrap">
        <Link href="/products" className="hover:text-[color:var(--fg)] inline-flex items-center gap-1">
          <ArrowLeft className="w-3 h-3" /> Shop
        </Link>
        <span>/</span>
        <Link href={`/products?category=${product.category.slug}`} className="hover:text-[color:var(--fg)]">
          {product.category.name}
        </Link>
        <span>/</span>
        <span className="text-[color:var(--fg)]">{product.name}</span>
      </nav>

      {/* Main grid */}
      <div className="grid lg:grid-cols-2 gap-10 lg:gap-16 mb-16">
        {/* Left: image */}
        <div className="relative aspect-square rounded-2xl overflow-hidden bg-[color:var(--bg-soft)] border border-[color:var(--border)]">
          {product.images?.[0]?.url ? (
            <Image
              src={product.images[0].url}
              alt={product.images[0].alt ?? product.name}
              fill
              sizes="(min-width: 1024px) 50vw, 100vw"
              className="object-cover"
              priority
            />
          ) : (
            <div className="w-full h-full bg-drikon-mesh" />
          )}
          {onSale && (
            <span className="absolute top-4 left-4 px-3 py-1.5 text-xs font-bold rounded-md bg-[color:var(--accent)] text-white">
              −{discount}% OFF
            </span>
          )}
        </div>

        {/* Right: meta + buy */}
        <div className="flex flex-col">
          {product.brand && (
            <div className="text-xs font-mono uppercase tracking-[0.2em] text-[color:var(--accent)] mb-2">
              {product.brand.name}
            </div>
          )}

          <h1 className="display text-3xl md:text-4xl mb-3">{product.name}</h1>

          {product.averageRating > 0 && (
            <div className="flex items-center gap-1.5 mb-5 text-sm">
              <Star className="w-4 h-4 fill-[color:var(--accent-2)] text-[color:var(--accent-2)]" />
              <span className="font-medium">{product.averageRating.toFixed(1)}</span>
              <span className="text-[color:var(--fg-muted)]">({product.reviewCount} reviews)</span>
            </div>
          )}

          {product.shortDescription && (
            <p className="text-[color:var(--fg-muted)] mb-6">{product.shortDescription}</p>
          )}

          {/* Price */}
          <div className="flex items-baseline gap-3 mb-6">
            <span className="display text-3xl">{formatPrice(price, product.currency)}</span>
            {onSale && compareAt && (
              <span className="text-[color:var(--fg-muted)] line-through text-lg">
                {formatPrice(compareAt, product.currency)}
              </span>
            )}
          </div>

          {/* Stock */}
          <div className="mb-6 text-sm">
            {product.stock === 0 ? (
              <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-red-500/10 text-red-600 border border-red-500/30">
                Out of stock
              </span>
            ) : product.stock <= 5 ? (
              <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-amber-500/10 text-amber-600 border border-amber-500/30">
                Only {product.stock} left in stock
              </span>
            ) : (
              <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-green-500/10 text-green-600 border border-green-500/30">
                In stock
              </span>
            )}
          </div>

          {/* Add to cart */}
          <div className="mb-8 flex items-stretch gap-3">
            <div className="flex-1">
              <AddToCart
                product={{
                  id: product.id,
                  name: product.name,
                  slug: product.slug,
                  image: product.images?.[0]?.url,
                  price,
                  currency: product.currency,
                  stock: product.stock,
                }}
              />
            </div>
            <WishlistButton
              productId={product.id}
              productName={product.name}
              variant="inline"
              className="self-start"
            />
            <CompareButton product={product} variant="inline" className="self-start" />
          </div>

          {/* Trust signals */}
          <div className="grid grid-cols-3 gap-3 text-xs text-[color:var(--fg-muted)] border-t border-[color:var(--border)] pt-6">
            <div className="flex items-start gap-2">
              <Truck className="w-4 h-4 text-[color:var(--accent)] shrink-0 mt-0.5" />
              <span>{content.shippingNote}</span>
            </div>
            <div className="flex items-start gap-2">
              <RefreshCw className="w-4 h-4 text-[color:var(--accent)] shrink-0 mt-0.5" />
              <span>{content.returnsNote}</span>
            </div>
            <div className="flex items-start gap-2">
              <ShieldCheck className="w-4 h-4 text-[color:var(--accent)] shrink-0 mt-0.5" />
              <span>{content.warrantyNote}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Description */}
      <section className="mb-16">
        <h2 className="display text-2xl mb-4">Description</h2>
        <p className="text-[color:var(--fg-muted)] leading-relaxed max-w-3xl whitespace-pre-wrap">
          {product.description}
        </p>
      </section>

      {/* Video (if any) */}
      {product.videoUrl && (
        <section className="mb-16">
          <h2 className="display text-2xl mb-4">Watch it in action</h2>
          <div className="max-w-3xl">
            <VideoEmbed url={product.videoUrl} />
          </div>
        </section>
      )}

      {/* Attributes (if any) */}
      {product.attributes && Object.keys(product.attributes).length > 0 && (
        <section className="mb-16">
          <h2 className="display text-2xl mb-4">Specifications</h2>
          <dl className="grid sm:grid-cols-2 gap-x-8 gap-y-3 max-w-3xl text-sm">
            {Object.entries(product.attributes).map(([key, value]) => (
              <div key={key} className="flex justify-between gap-4 border-b border-[color:var(--border)] py-2">
                <dt className="capitalize text-[color:var(--fg-muted)]">{key}</dt>
                <dd className="text-right font-medium">
                  {Array.isArray(value) ? value.join(', ') : String(value)}
                </dd>
              </div>
            ))}
          </dl>
        </section>
      )}

      {/* Reviews */}
      <ProductReviews productId={product.id} productName={product.name} />

      {/* Related */}
      {related.length > 0 && (
        <section>
          <h2 className="display text-2xl mb-6">You might also like</h2>
          <ProductGrid products={related} />
        </section>
      )}
    </div>
    </>
  );
}
```

- [ ] **Step 3: Build**

Run: `pnpm --filter web build`
Expected: build succeeds with zero TypeScript errors.

- [ ] **Step 4: Manual smoke check**

Run `pnpm --filter web dev`, open a product detail page (both a regular and, if one exists, a `template: "premium"` product), confirm price/stock/related/reviews/metadata all render as before, and that visiting a non-existent slug still 404s.

- [ ] **Step 5: Commit**

```bash
git add apps/web/src/controllers/product-detail.controller.ts "apps/web/src/app/(shop)/products/[slug]/page.tsx"
git commit -m "refactor(web): extract a product detail page controller"
```

---

### Task 5: `controllers/showcase.controller.ts` + refactor the showcase page

**Files:**
- Create: `apps/web/src/controllers/showcase.controller.ts`
- Modify: `apps/web/src/app/(shop)/showcase/page.tsx`

**Interfaces:**
- Consumes: `getProducts(queryString)`, `getProductBySlug(slug)` (`@/models/product.model`, Task 2), `getSettings` (`@/models/settings.model`, Task 1).
- Produces: `getShowcasePageData(): Promise<ShowcasePageData>`.

`ProductDetail` (the Model's return type) structurally satisfies the `ShowcaseItem` interface used by `<ShowcaseProduct>` — every field `ShowcaseItem` requires exists on `ProductDetail` — so no cast or mapping is needed. The per-item fetch keeps its original `.catch(() => null)`, which now catches anything `getProductBySlug` re-throws (non-404 errors) in addition to what it already resolves to `null` (404s) — reproducing the original's "swallow everything, skip that item" behavior exactly.

- [ ] **Step 1: Create `controllers/showcase.controller.ts`**

```typescript
// apps/web/src/controllers/showcase.controller.ts
import type { SiteSettings } from '@drikon/shared-types';
import { getProducts, getProductBySlug } from '@/models/product.model';
import { getSettings } from '@/models/settings.model';
import type { ShowcaseItem } from '@/components/shop/showcase-product';

export interface ShowcasePageData {
  products: ShowcaseItem[];
  settings: SiteSettings;
}

async function getFeaturedShowcaseItems(): Promise<ShowcaseItem[]> {
  try {
    const list = await getProducts('featured=true&limit=8');
    const details = await Promise.all(
      list.items.map((p) => getProductBySlug(p.slug).catch(() => null)),
    );
    return details.filter((d): d is ShowcaseItem => Boolean(d));
  } catch {
    return [];
  }
}

export async function getShowcasePageData(): Promise<ShowcasePageData> {
  const [products, settings] = await Promise.all([getFeaturedShowcaseItems(), getSettings()]);
  return { products, settings };
}
```

- [ ] **Step 2: Refactor `app/(shop)/showcase/page.tsx`** — replace the whole file

```typescript
// apps/web/src/app/(shop)/showcase/page.tsx
import Link from 'next/link';
import type { Metadata } from 'next';
import { ArrowRight, ChevronDown, Package } from 'lucide-react';
import { getShowcasePageData } from '@/controllers/showcase.controller';
import { ShowcaseProduct } from '@/components/shop/showcase-product';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: 'The Selection — Featured Collection',
  description: 'A hand-picked lineup of featured tech, presented in detail.',
};

export default async function ShowcasePage() {
  const { products, settings } = await getShowcasePageData();
  const brand = settings.siteName;

  return (
    <div className="bg-[#0b1322] text-white">
      {/* ─── Cinematic hero ─── */}
      <section className="relative min-h-[72vh] flex items-center overflow-hidden">
        <div
          className="absolute inset-0"
          style={{
            background:
              'radial-gradient(60% 80% at 75% 30%, rgba(239,106,32,0.28), transparent 60%), radial-gradient(50% 60% at 15% 90%, rgba(20,35,63,0.9), transparent 70%), #0b1322',
          }}
          aria-hidden
        />
        <div
          className="absolute inset-0 opacity-[0.08]"
          style={{
            backgroundImage:
              'linear-gradient(rgba(255,255,255,0.6) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.6) 1px, transparent 1px)',
            backgroundSize: '54px 54px',
            maskImage: 'radial-gradient(ellipse 70% 60% at 50% 30%, #000 30%, transparent 75%)',
            WebkitMaskImage: 'radial-gradient(ellipse 70% 60% at 50% 30%, #000 30%, transparent 75%)',
          }}
          aria-hidden
        />
        <div className="relative z-10 max-w-7xl mx-auto px-6 py-24 text-center">
          <div className="text-xs font-mono uppercase tracking-[0.4em] text-[#ef8a4d] mb-5">
            {brand} · The Selection
          </div>
          <h1 className="text-5xl md:text-7xl lg:text-8xl font-extrabold tracking-tight leading-[0.95] mb-6">
            Built to{' '}
            <span className="bg-gradient-to-r from-[#ef6a20] to-[#f5a524] bg-clip-text text-transparent">
              dominate.
            </span>
          </h1>
          <p className="text-white/70 text-lg max-w-2xl mx-auto">
            A hand-picked lineup of the gear we&apos;d build with — flagship laptops, components, and
            peripherals, presented up close. This is the {brand} edit.
          </p>
          {products.length > 0 && (
            <a
              href="#featured"
              className="mt-10 inline-flex items-center gap-2 text-sm text-white/60 hover:text-white transition-colors"
            >
              Explore the lineup <ChevronDown className="w-4 h-4 animate-bounce" />
            </a>
          )}
        </div>
      </section>

      {/* ─── Featured products ─── */}
      <div id="featured">
        {products.length === 0 ? (
          <section className="max-w-3xl mx-auto px-6 py-28 text-center">
            <div className="w-14 h-14 rounded-2xl bg-white/5 grid place-items-center mx-auto mb-5 text-white/50">
              <Package className="w-6 h-6" />
            </div>
            <h2 className="text-2xl font-bold mb-2">No featured products yet</h2>
            <p className="text-white/60 mb-6">
              Mark products as <strong>Featured</strong> in the admin to showcase them here.
            </p>
            <Link href="/products" className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-[#ef6a20] font-semibold hover:bg-[#d85f1a] transition-colors">
              Browse all products <ArrowRight className="w-4 h-4" />
            </Link>
          </section>
        ) : (
          products.map((p, i) => <ShowcaseProduct key={p.id} product={p} index={i} />)
        )}
      </div>

      {/* ─── Closing CTA ─── */}
      <section className="relative overflow-hidden py-24 text-center">
        <div className="absolute inset-0 bg-[radial-gradient(60%_80%_at_50%_0%,rgba(239,106,32,0.2),transparent_60%)]" aria-hidden />
        <div className="relative z-10 max-w-2xl mx-auto px-6">
          <h2 className="text-3xl md:text-4xl font-extrabold tracking-tight mb-4">That&apos;s just the highlights.</h2>
          <p className="text-white/65 mb-8">Explore the full catalog — laptops, components, and peripherals from the brands you trust.</p>
          <Link href="/products" className="inline-flex items-center gap-2 px-7 py-3.5 rounded-xl bg-white text-[#0b1322] font-semibold hover:bg-white/90 transition-colors">
            Shop all products <ArrowRight className="w-4 h-4" />
          </Link>
        </div>
      </section>
    </div>
  );
}
```

- [ ] **Step 3: Build**

Run: `pnpm --filter web build`
Expected: build succeeds with zero TypeScript errors.

- [ ] **Step 4: Manual smoke check**

Run `pnpm --filter web dev`, open `/showcase`, confirm the featured lineup (or the empty state, if no products are marked featured) renders as before.

- [ ] **Step 5: Commit**

```bash
git add apps/web/src/controllers/showcase.controller.ts "apps/web/src/app/(shop)/showcase/page.tsx"
git commit -m "refactor(web): extract a showcase page controller"
```

---

### Task 6: `wishlist.model.ts` + refactor the wishlist page (Model-only — Client Component, see rationale at the top of this plan)

**Files:**
- Create: `apps/web/src/models/wishlist.model.ts`
- Modify: `apps/web/src/app/(shop)/wishlist/page.tsx`

**Interfaces:**
- Consumes: nothing from other tasks — self-contained.
- Produces: `getWishlist(): Promise<WishlistEntry[]>`.

- [ ] **Step 1: Create `models/wishlist.model.ts`**

```typescript
// apps/web/src/models/wishlist.model.ts
import type { WishlistEntry } from '@drikon/shared-types';
import { apiGet } from '@/lib/api-client';

export function getWishlist(): Promise<WishlistEntry[]> {
  return apiGet<WishlistEntry[]>('/api/v1/wishlist');
}
```

- [ ] **Step 2: Swap the inline `apiGet` call in `app/(shop)/wishlist/page.tsx` for `getWishlist()`** — everything else (the `useEffect`/`useState` orchestration, loading/empty states) is unchanged

In `apps/web/src/app/(shop)/wishlist/page.tsx`, change the import:

```typescript
import { apiGet } from '@/lib/api-client';
```
to:
```typescript
import { getWishlist } from '@/models/wishlist.model';
```

And change the fetch call inside the effect:

```typescript
        const data = await apiGet<WishlistEntry[]>('/api/v1/wishlist');
```
to:
```typescript
        const data = await getWishlist();
```

- [ ] **Step 3: Build**

Run: `pnpm --filter web build`
Expected: build succeeds with zero TypeScript errors.

- [ ] **Step 4: Manual smoke check**

Run `pnpm --filter web dev`, sign in, add a product to the wishlist, open `/wishlist`, confirm it lists correctly.

- [ ] **Step 5: Commit**

```bash
git add apps/web/src/models/wishlist.model.ts "apps/web/src/app/(shop)/wishlist/page.tsx"
git commit -m "refactor(web): extract WishlistModel"
```

---

### Task 7: `order.model.ts` + refactor the orders list, order detail, and checkout pages (Model-only — all three are Client Components)

Bundled into one task because all three routes' only change is calling into the same new `order.model.ts` — splitting them would mean the first sub-task creates a Model file with no real consumer yet, which isn't an independently valuable deliverable.

**Files:**
- Create: `apps/web/src/models/order.model.ts`
- Modify: `apps/web/src/app/(account)/orders/page.tsx`
- Modify: `apps/web/src/app/(account)/orders/[orderNumber]/page.tsx`
- Modify: `apps/web/src/app/(shop)/checkout/page.tsx`

**Interfaces:**
- Consumes: nothing from other tasks — self-contained.
- Produces: `getOrders(query: string): Promise<OrderListResponse>`, `getOrderByNumber(orderNumber: string): Promise<OrderDetail>` (+ `OrderDetail` type), `createOrder(payload: CreateOrderPayload): Promise<OrderSummary>` (+ `CreateOrderPayload` type).

- [ ] **Step 1: Create `models/order.model.ts`**

```typescript
// apps/web/src/models/order.model.ts
import type { OrderListResponse, OrderSummary, ShippingAddressInput } from '@drikon/shared-types';
import { apiGet, apiPost } from '@/lib/api-client';

export function getOrders(query: string): Promise<OrderListResponse> {
  return apiGet<OrderListResponse>(`/api/v1/orders?${query}`);
}

export interface OrderDetail extends OrderSummary {
  notes?: string | null;
  shippingAddress?: {
    fullName: string;
    phone: string;
    line1: string;
    line2?: string | null;
    city: string;
    state?: string | null;
    postalCode: string;
    country: string;
  } | null;
}

export function getOrderByNumber(orderNumber: string): Promise<OrderDetail> {
  return apiGet<OrderDetail>(`/api/v1/orders/${orderNumber}`);
}

export interface CreateOrderPayload {
  items: { productId: string; variantId?: string; quantity: number }[];
  shippingAddress: ShippingAddressInput;
  couponCode?: string;
}

export function createOrder(payload: CreateOrderPayload): Promise<OrderSummary> {
  return apiPost<OrderSummary>('/api/v1/orders', payload);
}
```

- [ ] **Step 2: Swap the fetch in `app/(account)/orders/page.tsx`**

Change the import:
```typescript
import { apiGet } from '@/lib/api-client';
```
to:
```typescript
import { getOrders } from '@/models/order.model';
```

Change the fetch call inside the effect:
```typescript
        const data = await apiGet<OrderListResponse>('/api/v1/orders?limit=50');
```
to:
```typescript
        const data = await getOrders('limit=50');
```

The `OrderListResponse` type import from `@drikon/shared-types` is no longer needed directly in this file (it's used inside `order.model.ts` now) — remove `OrderListResponse` from the existing `import type { OrderListResponse, OrderSummary } from '@drikon/shared-types';` line, keeping `OrderSummary` (still used for the `orders` state type).

- [ ] **Step 3: Swap the fetch and the local `OrderDetail` type in `app/(account)/orders/[orderNumber]/page.tsx`**

Remove the page-local type definition:
```typescript
interface OrderDetail extends OrderSummary {
  notes?: string | null;
  shippingAddress?: {
    fullName: string;
    phone: string;
    line1: string;
    line2?: string | null;
    city: string;
    state?: string | null;
    postalCode: string;
    country: string;
  } | null;
}
```
and import it from the model instead — change:
```typescript
import { apiGet, ApiError } from '@/lib/api-client';
```
to:
```typescript
import { ApiError } from '@/lib/api-client';
import { getOrderByNumber, type OrderDetail } from '@/models/order.model';
```

Change the fetch call inside the effect:
```typescript
        const data = await apiGet<OrderDetail>(`/api/v1/orders/${orderNumber}`);
```
to:
```typescript
        const data = await getOrderByNumber(orderNumber);
```

- [ ] **Step 4: Swap the mutation in `app/(shop)/checkout/page.tsx`**

Change the import:
```typescript
import { apiPost, ApiError } from '@/lib/api-client';
```
to:
```typescript
import { ApiError } from '@/lib/api-client';
import { createOrder } from '@/models/order.model';
```

Change the call inside `onSubmit`:
```typescript
      const order = await apiPost<OrderSummary>('/api/v1/orders', {
        items: items.map((i) => ({
          productId: i.productId,
          variantId: i.variantId,
          quantity: i.quantity,
        })),
        shippingAddress: address,
        couponCode: couponCode ?? undefined,
      });
```
to:
```typescript
      const order = await createOrder({
        items: items.map((i) => ({
          productId: i.productId,
          variantId: i.variantId,
          quantity: i.quantity,
        })),
        shippingAddress: address,
        couponCode: couponCode ?? undefined,
      });
```

`OrderSummary` is still used elsewhere in this file (the `order.orderNumber` reference right after) via the import from `@drikon/shared-types`, so leave that import as-is — only the `apiPost` piece moves.

- [ ] **Step 5: Build**

Run: `pnpm --filter web build`
Expected: build succeeds with zero TypeScript errors.

- [ ] **Step 6: Manual smoke check**

Run `pnpm --filter web dev`, sign in, place a test order through checkout, confirm it appears on `/orders` and its detail page at `/orders/<orderNumber>` renders correctly, including the "order just placed" banner (`?new=1`).

- [ ] **Step 7: Commit**

```bash
git add apps/web/src/models/order.model.ts "apps/web/src/app/(account)/orders/page.tsx" "apps/web/src/app/(account)/orders/[orderNumber]/page.tsx" "apps/web/src/app/(shop)/checkout/page.tsx"
git commit -m "refactor(web): extract OrderModel"
```

---

### Task 8: Refactor the compare page (Model-only — reuses `ProductModel` from Task 2)

**Files:**
- Modify: `apps/web/src/app/(shop)/compare/page.tsx`

**Interfaces:**
- Consumes: `getProductBySlug(slug)`, `type ProductDetail` (`@/models/product.model`, Task 2).
- Produces: nothing new.

- [ ] **Step 1: Drop the page-local `ProductDetail` interface and swap the fetch call**

Remove:
```typescript
interface ProductDetail extends ProductSummary {
  description: string;
  sku: string;
  attributes?: Record<string, unknown> | null;
}
```

Change the import:
```typescript
import { apiGet } from '@/lib/api-client';
```
to:
```typescript
import { getProductBySlug, type ProductDetail } from '@/models/product.model';
```

Change the fetch call inside the effect:
```typescript
        apiGet<ProductDetail>(`/api/v1/products/slug/${i.slug}`).catch(() => null),
```
to:
```typescript
        getProductBySlug(i.slug).catch(() => null),
```

(The `.catch(() => null)` stays — it's what reproduces the original's "swallow everything, skip that item" behavior on top of the Model's own 404-only handling, same reasoning as Task 5's showcase controller.)

- [ ] **Step 2: Build**

Run: `pnpm --filter web build`
Expected: build succeeds with zero TypeScript errors.

- [ ] **Step 3: Manual smoke check**

Run `pnpm --filter web dev`, add 2-3 products to compare via the compare button on product cards, open `/compare`, confirm the comparison table renders with correct attributes.

- [ ] **Step 4: Commit**

```bash
git add "apps/web/src/app/(shop)/compare/page.tsx"
git commit -m "refactor(web): reuse ProductModel on the compare page"
```

---

### Task 9: Final verification — confirm the 4 unchanged pages need no action, and sanity-check the whole customer-facing surface

`app/(shop)/cart/page.tsx`, `app/(account)/dashboard/page.tsx`, `app/(auth)/login/page.tsx`, and `app/(auth)/register/page.tsx` make zero direct API calls — they only read Zustand stores (`useCartStore`, `useAuthStore`), which are out of scope per the spec. This task verifies that's still true (nothing changed under them during Tasks 1-8) rather than modifying them.

**Files:** none modified — verification only.

- [ ] **Step 1: Confirm the 4 unchanged pages still have no direct API calls**

Run: `grep -n "apiGet\|apiPost\|apiPatch\|apiDelete" "apps/web/src/app/(shop)/cart/page.tsx" "apps/web/src/app/(account)/dashboard/page.tsx" "apps/web/src/app/(auth)/login/page.tsx" "apps/web/src/app/(auth)/register/page.tsx"`
Expected: no output (confirms these 4 pages have nothing to extract — they only call `useCartStore`/`useAuthStore` methods, which are out of scope).

- [ ] **Step 2: Confirm no page.tsx in the customer-facing route groups still imports `apiGet`/`apiPost` directly for page-load or mutation data (component-level imports inside `components/` are untouched and fine — only page files are in scope for this plan)**

Run: `grep -rln "from '@/lib/api-client'" "apps/web/src/app/(shop)" "apps/web/src/app/(account)" "apps/web/src/app/(auth)" apps/web/src/app/page.tsx`
Expected: only files that still legitimately need `ApiError` (for `instanceof` checks) — `app/(account)/orders/[orderNumber]/page.tsx`, `app/(shop)/checkout/page.tsx`, `app/(auth)/login/page.tsx`, `app/(auth)/register/page.tsx` (the last two use it in their own `onSubmit` catch blocks around store calls, which are out of scope). No file should still call `apiGet`/`apiPost` directly for page data.

- [ ] **Step 3: Confirm no stale imports from the deleted `lib/` files remain anywhere in the app**

Run: `grep -rn "from '@/lib/catalog'\|from '@/lib/banners'\|from '@/lib/settings'\|from '@/lib/content'" apps/web/src`
Expected: no output.

- [ ] **Step 4: Full build**

Run: `pnpm --filter web build`
Expected: build succeeds with zero TypeScript errors.

- [ ] **Step 5: Full manual smoke pass**

Run `pnpm --filter web dev` and click through the entire customer-facing flow once, end to end: home → browse products (filter/sort/paginate) → open a product → add to cart → cart → checkout → place order → order confirmation → order detail → orders list → wishlist → compare → register a new account → log in → dashboard → log out. Confirm nothing regressed from before Task 1.

- [ ] **Step 6: Commit** (only if Steps 1-4 required any fixes; if everything already passed, there's nothing to commit — this task is a checkpoint, not guaranteed to produce a diff)

```bash
git status
# If clean, this plan is done — no commit needed for this task.
# If Step 1-4 surfaced anything, fix it, then:
git add -A
git commit -m "fix(web): resolve issues found during MVC customer-routes verification pass"
```

## Definition of Done

- Tasks 1-8 committed, in order, each with a green `pnpm --filter web build`.
- `apps/web/src/models/` contains `category.model.ts`, `banner.model.ts`, `settings.model.ts`, `product.model.ts`, `brand.model.ts`, `wishlist.model.ts`, `order.model.ts`.
- `apps/web/src/controllers/` contains `home.controller.ts`, `products-list.controller.ts`, `product-detail.controller.ts`, `showcase.controller.ts`.
- `apps/web/src/lib/catalog.ts`, `lib/banners.ts`, `lib/settings.ts`, `lib/content.ts` no longer exist; `lib/api-client.ts`, `lib/cloudinary.ts`, `lib/utils.ts`, `lib/site.ts` are untouched.
- Task 9's verification steps all pass.
- Next: apps/web admin routes (separate plan, per the spec's rollout order — this is the lower-priority "Pass 2" the spec calls out).