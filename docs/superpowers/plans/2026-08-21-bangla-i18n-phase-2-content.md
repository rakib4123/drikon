# Bangla/English Full-Site Content Translation — Phase 2 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Every product, category, banner, and static informational page on the Drikon storefront renders real, human-quality Bangla when the site is in Bangla mode, falling back cleanly to English for anything not yet translated.

**Architecture:** Nullable `*Bn` columns added to `Product`, `Category`, `Banner` (Prisma migration). A shared `localize()` helper picks the right-language string at render time with English fallback. Static pages (About/Contact/Terms/Privacy/Shipping) reuse the existing Phase 1 `next-intl` JSON-message mechanism since they're hardcoded JSX, not database rows. Search is extended to match Bangla text too. Content itself (the actual translated strings) is populated via `seed.ts` for the 25 products already seeded there, and via small one-off Prisma scripts for the 15 pre-existing (non-seeded) robotics products, the 14 categories, and the 4 banners — mirroring the pattern already used and approved this session for adding product images and category/banner images to production.

**Tech Stack:** Next.js 15 App Router, `next-intl` v4, NestJS 11 + Prisma + PostgreSQL, `nestjs-zod`, Jest (API), Vitest (web), Playwright (`playwright-core`) for live verification.

**Spec:** `docs/superpowers/specs/2026-08-21-bangla-i18n-phase-2-content-design.md`

## Global Constraints

- Admin panel UI chrome stays English-only — only new Bangla *content fields* are exposed in admin edit forms, per the spec's Non-goals.
- No machine translation, no new external API/paid dependency — every string here is hand-written.
- Product reviews (`Review.body`) are never translated — user-generated content stays exactly as submitted.
- No URL routing changes — locale stays cookie-based (`NEXT_LOCALE`), unchanged from Phase 1.
- `localize(en, bn, locale)` must return `en` whenever `bn` is null/empty/undefined, regardless of locale — a missing translation must never render blank text.
- All Bangla text in this plan is final, hand-written copy — implementers use it verbatim, they do not invent wording.
- The existing Phase 1 `next-intl` namespaces (`common`, `nav`, `search`, `home`, `product`, `products`, `pdp`) are not modified by this plan — only new namespaces are added for the five static pages.
- `apps/api/prisma/seed.ts`'s existing safety guard (refuses to run with `NODE_ENV=production` unless `ALLOW_PROD_SEED=true`) stays intact — the seed is run locally with a production `DATABASE_URL` override, the same way it was run earlier this session, never by setting `NODE_ENV=production`.

---

### Task 1: Schema migration — add Bangla columns

**Files:**
- Modify: `apps/api/prisma/schema.prisma`

**Interfaces:**
- Produces: `Product.nameBn`, `Product.descriptionBn`, `Product.shortDescriptionBn`, `Category.nameBn`, `Category.descriptionBn`, `Banner.headingBn`, `Banner.subheadingBn` — all `String?` (nullable).

- [ ] **Step 1: Add the columns**

In `apps/api/prisma/schema.prisma`, find the `Product` model and add these three lines immediately after the existing `shortDescription` field (keep everything else in the model unchanged):

```prisma
  nameBn             String?
  descriptionBn      String?
  shortDescriptionBn String?
```

Find the `Category` model and add these two lines immediately after the existing `description` field:

```prisma
  nameBn        String?
  descriptionBn String?
```

Find the `Banner` model and add these two lines immediately after the existing `subheading` field:

```prisma
  headingBn    String?
  subheadingBn String?
```

- [ ] **Step 2: Generate and apply the migration locally**

Run (from `apps/api`, against the local dev database already configured in `.env`):

```bash
npx prisma migrate dev --name add_bangla_content_columns
```

Expected: a new folder under `apps/api/prisma/migrations/` containing the migration SQL (seven `ALTER TABLE ... ADD COLUMN` statements), and it applies cleanly with no errors. Prisma Client regenerates automatically as part of this command.

- [ ] **Step 3: Typecheck**

Run: `pnpm --filter @drikon/api typecheck`
Expected: no errors (confirms the regenerated Prisma Client's types are consistent with the rest of the API code — nothing else references these fields yet, so this is just confirming the migration didn't break anything).

- [ ] **Step 4: Commit**

```bash
git add apps/api/prisma/schema.prisma apps/api/prisma/migrations
git commit -m "feat(api): add Bangla translation columns to Product, Category, Banner"
```

---

### Task 2: Shared types, DTOs, and the `localize()` helper

**Files:**
- Modify: `packages/shared-types/src/index.ts`
- Modify: `apps/web/src/app/(shop)/products/[slug]/page.tsx` (the local `ProductDetail` interface only, lines 27-34)
- Modify: `apps/web/src/lib/catalog.ts` (the `NavCategory` interface only)
- Modify: `apps/web/src/lib/banners.ts` (the `Banner` interface only)
- Modify: `apps/api/src/modules/products/dto/product.dto.ts`
- Modify: `apps/api/src/modules/categories/dto/category.dto.ts`
- Modify: `apps/api/src/modules/banners/dto/banner.dto.ts`
- Create: `apps/web/src/lib/localize.ts`
- Test: `apps/web/src/lib/localize.test.ts`

**Interfaces:**
- Consumes: `Locale` type from `apps/web/src/i18n/request.ts` (`'en' | 'bn'`, already exists from Phase 1).
- Produces: `localize(en: string, bn: string | null | undefined, locale: Locale): string` — used by every task from Task 4 onward.

- [ ] **Step 1: Write the failing test for `localize()`**

Create `apps/web/src/lib/localize.test.ts`:

```ts
import { describe, expect, it } from 'vitest';
import { localize } from './localize';

describe('localize', () => {
  it('returns the Bangla string when locale is bn and bn is present', () => {
    expect(localize('Hello', 'হ্যালো', 'bn')).toBe('হ্যালো');
  });

  it('falls back to English when locale is bn but bn is null', () => {
    expect(localize('Hello', null, 'bn')).toBe('Hello');
  });

  it('falls back to English when locale is bn but bn is undefined', () => {
    expect(localize('Hello', undefined, 'bn')).toBe('Hello');
  });

  it('falls back to English when locale is bn but bn is an empty string', () => {
    expect(localize('Hello', '', 'bn')).toBe('Hello');
  });

  it('returns English when locale is en, even if bn is present', () => {
    expect(localize('Hello', 'হ্যালো', 'en')).toBe('Hello');
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `pnpm --filter web test -- localize`
Expected: FAIL — `Cannot find module './localize'` (the file doesn't exist yet).

- [ ] **Step 3: Implement `localize()`**

Create `apps/web/src/lib/localize.ts`:

```ts
import type { Locale } from '@/i18n/request';

/**
 * Picks the display string for the current locale, falling back to English
 * whenever a Bangla translation hasn't been written yet — a missing
 * translation must never render as blank text.
 */
export function localize(en: string, bn: string | null | undefined, locale: Locale): string {
  return locale === 'bn' && bn ? bn : en;
}
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `pnpm --filter web test -- localize`
Expected: PASS, 5/5 tests.

- [ ] **Step 5: Add the Bangla fields to shared types**

In `packages/shared-types/src/index.ts`, find the `ProductSummary` interface (around line 107) and add two fields immediately after `shortDescription`:

```ts
  nameBn?: string | null;
  shortDescriptionBn?: string | null;
```

- [ ] **Step 6: Add the Bangla field to the PDP's local `ProductDetail` interface**

In `apps/web/src/app/(shop)/products/[slug]/page.tsx`, find:

```tsx
interface ProductDetail extends ProductSummary {
  description: string;
```

Add a line immediately after it:

```tsx
interface ProductDetail extends ProductSummary {
  description: string;
  descriptionBn?: string | null;
```

(`nameBn`/`shortDescriptionBn` are already inherited from the updated `ProductSummary`.)

- [ ] **Step 7: Add the Bangla fields to `NavCategory`**

In `apps/web/src/lib/catalog.ts`, find the `NavCategory` interface and add two fields immediately after `description`:

```ts
export interface NavCategory {
  id: string;
  name: string;
  slug: string;
  description?: string | null;
  nameBn?: string | null;
  descriptionBn?: string | null;
  imageUrl?: string | null;
  parentId?: string | null;
  _count?: { products: number };
}
```

- [ ] **Step 8: Add the Bangla fields to `Banner`**

In `apps/web/src/lib/banners.ts`, find the `Banner` interface and add two fields immediately after `subheading`:

```ts
export interface Banner {
  id: string;
  heading: string;
  subheading?: string | null;
  headingBn?: string | null;
  subheadingBn?: string | null;
  imageUrl?: string | null;
  ctaLabel?: string | null;
  ctaHref?: string | null;
  position: number;
  isActive: boolean;
}
```

- [ ] **Step 9: Add the Bangla fields to the product DTO**

In `apps/api/src/modules/products/dto/product.dto.ts`, in `CreateProductSchema`, add three optional fields immediately after `shortDescription`:

```ts
  nameBn: z.string().min(2).max(200).optional(),
  shortDescriptionBn: z.string().max(500).optional(),
  descriptionBn: z.string().min(10).max(10_000).optional(),
```

(`UpdateProductSchema` derives from `CreateProductSchema.partial()`, so it picks these up automatically — no separate edit needed there.)

- [ ] **Step 10: Add the Bangla fields to the category DTO**

In `apps/api/src/modules/categories/dto/category.dto.ts`, in `CreateCategorySchema`, add two optional fields immediately after `description`:

```ts
  nameBn: z.string().min(1).max(80).trim().optional(),
  descriptionBn: z.string().max(500).trim().optional().or(z.literal('')),
```

- [ ] **Step 11: Add the Bangla fields to the banner DTO**

In `apps/api/src/modules/banners/dto/banner.dto.ts`, in `CreateBannerSchema`, add two optional fields immediately after `subheading`:

```ts
  headingBn: z.string().max(120).trim().optional().or(z.literal('')),
  subheadingBn: z.string().max(300).trim().optional().or(z.literal('')),
```

- [ ] **Step 12: Typecheck both apps**

Run: `pnpm --filter web typecheck && pnpm --filter @drikon/api typecheck`
Expected: no errors.

- [ ] **Step 13: Commit**

```bash
git add packages/shared-types apps/web/src/lib/localize.ts apps/web/src/lib/localize.test.ts \
  "apps/web/src/app/(shop)/products/[slug]/page.tsx" apps/web/src/lib/catalog.ts apps/web/src/lib/banners.ts \
  apps/api/src/modules/products/dto/product.dto.ts apps/api/src/modules/categories/dto/category.dto.ts \
  apps/api/src/modules/banners/dto/banner.dto.ts
git commit -m "feat: add Bangla fields to shared types, DTOs, and localize() helper"
```

---

### Task 3: Bangla-aware search

**Files:**
- Modify: `apps/api/src/modules/products/products.service.ts`
- Create: `apps/api/src/modules/products/products.service.spec.ts`

**Interfaces:**
- Consumes: nothing new — `Prisma.ProductWhereInput`, already imported in this file.
- Produces: nothing new externally — `buildSearchFilter` stays module-private, this task only changes its matching logic and adds its first test coverage.

- [ ] **Step 1: Write the failing test**

`products.service.ts` doesn't have a spec file yet. Since `buildSearchFilter` is a module-private function (not exported), test it through the service's public `findAll` method with a mocked `ProductModel`, following the mocking pattern already used in `apps/api/src/modules/recommendations/recommendations.service.spec.ts`. Create `apps/api/src/modules/products/products.service.spec.ts`:

```ts
import { Test, TestingModule } from '@nestjs/testing';
import { ProductModel } from '../../models/product.model';
import { OrderModel } from '../../models/order.model';
import { ProductsService } from './products.service';

describe('ProductsService', () => {
  let service: ProductsService;
  let products: jest.Mocked<Pick<ProductModel, 'findMany' | 'count'>>;
  let orders: jest.Mocked<Pick<OrderModel, 'findMany'>>;

  beforeEach(async () => {
    products = { findMany: jest.fn().mockResolvedValue([]), count: jest.fn().mockResolvedValue(0) };
    orders = { findMany: jest.fn() };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ProductsService,
        { provide: ProductModel, useValue: products },
        { provide: OrderModel, useValue: orders },
      ],
    }).compile();

    service = module.get(ProductsService);
  });

  describe('findAll search filter', () => {
    it('matches a Bangla search word against nameBn and descriptionBn, not just the English fields', async () => {
      await service.findAll({ page: 1, limit: 20, search: 'রোবট', sort: 'newest' } as any);

      const whereArg = products.findMany.mock.calls[0][0].where;
      const andClause = whereArg.AND[0];

      expect(andClause.OR).toEqual(
        expect.arrayContaining([
          { name: { contains: 'রোবট', mode: 'insensitive' } },
          { description: { contains: 'রোবট', mode: 'insensitive' } },
          { nameBn: { contains: 'রোবট', mode: 'insensitive' } },
          { descriptionBn: { contains: 'রোবট', mode: 'insensitive' } },
          { sku: { contains: 'রোবট', mode: 'insensitive' } },
        ]),
      );
    });
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `pnpm --filter @drikon/api test -- products.service`
Expected: FAIL — the `OR` array is missing the `nameBn`/`descriptionBn` clauses.

- [ ] **Step 3: Extend `buildSearchFilter`**

In `apps/api/src/modules/products/products.service.ts`, replace:

```ts
function buildSearchFilter(search: string): Prisma.ProductWhereInput {
  const words = search.trim().split(/\s+/).filter(Boolean);
  return {
    AND: words.map((word) => ({
      OR: [
        { name: { contains: word, mode: 'insensitive' as const } },
        { description: { contains: word, mode: 'insensitive' as const } },
        { sku: { contains: word, mode: 'insensitive' as const } },
      ],
    })),
  };
}
```

with:

```ts
function buildSearchFilter(search: string): Prisma.ProductWhereInput {
  const words = search.trim().split(/\s+/).filter(Boolean);
  return {
    AND: words.map((word) => ({
      OR: [
        { name: { contains: word, mode: 'insensitive' as const } },
        { description: { contains: word, mode: 'insensitive' as const } },
        { nameBn: { contains: word, mode: 'insensitive' as const } },
        { descriptionBn: { contains: word, mode: 'insensitive' as const } },
        { sku: { contains: word, mode: 'insensitive' as const } },
      ],
    })),
  };
}
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `pnpm --filter @drikon/api test -- products.service`
Expected: PASS.

- [ ] **Step 5: Run the full API test suite**

Run: `pnpm --filter @drikon/api test`
Expected: all suites pass (this task only adds a filter clause — no existing behavior for English-only search changes, since the extra `OR` branches simply never match when `nameBn`/`descriptionBn` are null).

- [ ] **Step 6: Commit**

```bash
git add apps/api/src/modules/products/products.service.ts apps/api/src/modules/products/products.service.spec.ts
git commit -m "feat(api): match Bangla product text in search"
```

---

### Task 4: Wire `localize()` into every display component

**Files:**
- Modify: `apps/web/src/components/shop/product-card.tsx`
- Modify: `apps/web/src/components/shop/category-showcase.tsx`
- Modify: `apps/web/src/components/shop/hero-slider.tsx`
- Modify: `apps/web/src/app/(shop)/products/[slug]/page.tsx`
- Modify: `apps/web/src/app/(shop)/products/page.tsx`
- Modify: `apps/web/src/components/shop/search-command.tsx`

**Interfaces:**
- Consumes: `localize()` from `@/lib/localize` (Task 2), `useLocale()` from `next-intl` (Client Components, already used since Phase 1's `LanguageSwitcher`), `getLocale()` from `next-intl/server` (Server Components — new usage, but the same package already installed).

- [ ] **Step 1: `ProductCard`**

`ProductCard` is a Client Component. In `apps/web/src/components/shop/product-card.tsx`, add the import:

```tsx
import { useLocale } from 'next-intl';
import { localize } from '@/lib/localize';
```

Inside `ProductCard`, add near the top (alongside the existing `const t = useTranslations('product');`):

```tsx
  const locale = useLocale();
```

Replace every rendered `product.name` with `localize(product.name, product.nameBn, locale)`, and the short-description rendering (if the card shows it) with `localize(product.shortDescription ?? '', product.shortDescriptionBn, locale)`. Also update the `alt` text and `toast.success(..., { description: product.name })` calls to use the localized name so the cart toast shows the right language too.

- [ ] **Step 2: `CategoryShowcase`**

`CategoryShowcase` is a Client Component. In `apps/web/src/components/shop/category-showcase.tsx`, add the import:

```tsx
import { useLocale } from 'next-intl';
import { localize } from '@/lib/localize';
```

Inside `CategoryShowcase`, add near the top:

```tsx
  const locale = useLocale();
```

In the `tiles` construction, change:

```tsx
    ...cats.map((c, i) => ({
      title: c.name,
      blurb: c.description || `${c._count?.products ?? 0} product${(c._count?.products ?? 0) === 1 ? '' : 's'}`,
```

to:

```tsx
    ...cats.map((c, i) => ({
      title: localize(c.name, c.nameBn, locale),
      blurb: localize(
        c.description || `${c._count?.products ?? 0} product${(c._count?.products ?? 0) === 1 ? '' : 's'}`,
        c.descriptionBn,
        locale,
      ),
```

- [ ] **Step 3: `HeroSlider`**

`HeroSlider` is a Client Component. In `apps/web/src/components/shop/hero-slider.tsx`, add the import:

```tsx
import { useLocale } from 'next-intl';
import { localize } from '@/lib/localize';
```

Inside `HeroSlider`, add near the top (alongside `const reduce = useReducedMotion();`):

```tsx
  const locale = useLocale();
```

Replace:

```tsx
                <h1 className="display text-4xl md:text-6xl mb-4 text-glow">{b.heading}</h1>
                {b.subheading && (
                  <p className="text-white/85 text-base md:text-lg mb-7 max-w-lg">{b.subheading}</p>
                )}
```

with:

```tsx
                <h1 className="display text-4xl md:text-6xl mb-4 text-glow">{localize(b.heading, b.headingBn, locale)}</h1>
                {b.subheading && (
                  <p className="text-white/85 text-base md:text-lg mb-7 max-w-lg">
                    {localize(b.subheading, b.subheadingBn, locale)}
                  </p>
                )}
```

- [ ] **Step 4: PDP**

`ProductDetailPage` is a Server Component. In `apps/web/src/app/(shop)/products/[slug]/page.tsx`, add the import:

```tsx
import { getLocale } from 'next-intl/server';
import { localize } from '@/lib/localize';
```

After the existing `const t = await getTranslations('pdp');` line, add:

```tsx
  const locale = await getLocale();
```

Find every place `product.name` is rendered as page content (the `<h1>`/heading showing the product title) and replace with `localize(product.name, product.nameBn, locale)`. Find the `product.description` render inside the "Description" section and replace with `localize(product.description, product.descriptionBn, locale)`. Leave `product.name` untouched anywhere it's used for non-display purposes (e.g. the `generateMetadata`/JSON-LD structured-data block, `alt` fallback logic feeding into `cartAdd`) — those stay English for SEO/canonical-data consistency, matching how Phase 1 treated settings-driven copy as a separate concern from UI chrome. Also localize the two related-product headings' underlying `ProductGrid` — no change needed there since `ProductGrid`/`ProductCard` already got `localize()` in Step 1.

- [ ] **Step 5: Products listing page**

`ProductsPage` is a Server Component. In `apps/web/src/app/(shop)/products/page.tsx`, add the import:

```tsx
import { getLocale } from 'next-intl/server';
import { localize } from '@/lib/localize';
```

After the existing `const t = await getTranslations('products');` line, add:

```tsx
  const locale = await getLocale();
```

Find the category-chip rendering (`{c.name}` inside the `topCats.map` loop building `CategoryChip` children) and replace with `{localize(c.name, c.nameBn, locale)}`.

- [ ] **Step 6: `SearchCommand`**

`SearchCommand` is a Client Component that already has `useTranslations('search')`. In `apps/web/src/components/shop/search-command.tsx`, add the import:

```tsx
import { useLocale } from 'next-intl';
import { localize } from '@/lib/localize';
```

Inside `SearchCommand`, add near the top (alongside `const t = useTranslations('search');`):

```tsx
  const locale = useLocale();
```

Replace every rendered `p.name` in the results list and `voiceConfirm.product.name` in the voice-confirm card with `localize(p.name, p.nameBn, locale)` / `localize(voiceConfirm.product.name, voiceConfirm.product.nameBn, locale)` respectively — including inside the `addedToCartToast`/`confirmAddToCart` calls, so the toast shows the localized name too.

- [ ] **Step 7: Typecheck, lint, build**

Run: `pnpm --filter web typecheck && pnpm --filter web lint && pnpm --filter web build`
Expected: all clean. The build step confirms no Server/Client boundary mistakes from the new `getLocale()`/`useLocale()` calls.

- [ ] **Step 8: Live-verify (no Bangla content exists yet — confirm clean English fallback)**

Boot the dev server (`cd apps/api && pnpm dev` on :4000, `cd apps/web && pnpm dev` on :3000 — the API's CORS allowlist only permits :3000). Use Playwright (`playwright-core` at `node_modules/.pnpm/playwright-core@1.60.0/node_modules/playwright-core`, `chromium.launch({ executablePath: '/home/dextro/.cache/ms-playwright/chromium-1234/chrome-linux64/chrome' })`). With the `NEXT_LOCALE=bn` cookie set, load `/`, `/products`, and a PDP, and confirm every product/category/banner name still renders in English (since no `*Bn` data exists yet — this proves the fallback path works, not just the happy path). Confirm `pnpm --filter web build` output and a plain English-locale load are unaffected. Stop the servers.

- [ ] **Step 9: Commit**

```bash
git add apps/web/src/components/shop/product-card.tsx apps/web/src/components/shop/category-showcase.tsx \
  apps/web/src/components/shop/hero-slider.tsx "apps/web/src/app/(shop)/products/[slug]/page.tsx" \
  apps/web/src/app/\(shop\)/products/page.tsx apps/web/src/components/shop/search-command.tsx
git commit -m "feat(web): render Bangla product/category/banner text where available"
```

---

### Task 5: Static pages (About, Contact, Terms, Privacy, Shipping & Returns)

**Files:**
- Modify: `apps/web/src/messages/en.json`, `apps/web/src/messages/bn.json`
- Modify: `apps/web/src/app/about/page.tsx`
- Modify: `apps/web/src/app/contact/page.tsx`
- Modify: `apps/web/src/app/terms/page.tsx`
- Modify: `apps/web/src/app/privacy/page.tsx`
- Modify: `apps/web/src/app/shipping-returns/page.tsx`

**Interfaces:**
- Produces: five new namespaces — `about`, `contact`, `terms`, `privacy`, `shippingReturns`.

- [ ] **Step 1: Add the five namespaces to `en.json`**

Add to `apps/web/src/messages/en.json` (as new top-level keys, alongside the existing `common`/`nav`/etc. namespaces):

```json
  "about": {
    "eyebrow": "About {brand}",
    "heroTitle": "Vision, engineered — for how you actually use tech.",
    "heroSubtitle": "{brand} exists because too much of what's sold as \"premium\" electronics isn't. We built a store around the opposite idea: fewer products, chosen properly, backed by people who'll actually pick up the phone.",
    "storyP1": "We don't try to carry everything. Every device and accessory in the catalog is chosen because it's genuinely good — not because a supplier offered the best margin. If we wouldn't buy it ourselves, it doesn't go on the shelf.",
    "storyP2": "That same standard applies after checkout. Every order ships with tracking, every device is authentic and covered by its official warranty, and if something goes wrong, a real person on our support team sorts it out — not a script.",
    "storyP3Prefix": "isn't just a tagline. It's the filter every product goes through before it reaches you.",
    "storyEmphasis": "Vision, engineered",
    "standForHeading": "What we stand for",
    "principle1Title": "Authenticity first",
    "principle1Body": "Every device is genuine, sourced through official channels — no grey-market imports.",
    "principle2Title": "Chosen, not just listed",
    "principle2Body": "A curated catalog beats an endless one. We'd rather carry 50 great products than 5,000 mediocre ones.",
    "principle3Title": "Support that answers",
    "principle3Body": "Real people handle every order and every question — no ticket queue that goes nowhere.",
    "principle4Title": "Fast, tracked delivery",
    "principle4Body": "Nationwide shipping with tracking from the moment your order ships.",
    "ctaHeading": "Ready to see for yourself?",
    "ctaBody": "Browse the full catalog — every device authenticated, every order backed by real support.",
    "ctaButton": "Shop all devices"
  },
  "contact": {
    "eyebrow": "Get in touch",
    "heading": "Contact {brand}",
    "subheading": "Questions about an order, a product, or anything else — reach out and a real person will get back to you.",
    "emailLabel": "Email",
    "responseTimeLabel": "Response time",
    "responseTimeValue": "Usually within one business day.",
    "footerPrefix": "Looking for order status, shipping timelines, or our return policy? See",
    "footerLinkLabel": "Shipping & Returns"
  },
  "terms": {
    "eyebrow": "Legal",
    "heading": "Terms of Service",
    "lastUpdated": "Last updated {date}",
    "s1Title": "1. Acceptance of these terms",
    "s1Body": "By creating an account, placing an order, or otherwise using {brand}, you agree to these Terms of Service. If you don't agree with any part of them, please don't use the site.",
    "s2Title": "2. Your account",
    "s2Body": "You're responsible for keeping your account credentials confidential and for all activity under your account. We support two-factor authentication and recommend enabling it. Let us know immediately if you suspect unauthorized access.",
    "s3Title": "3. Products and pricing",
    "s3Body": "All prices are listed in Bangladeshi Taka (৳) and may change without notice. We make a reasonable effort to keep product listings, stock levels, and pricing accurate, but errors can happen — if a listing is mispriced or a product turns out to be unavailable after you order it, we'll contact you before processing the order.",
    "s4Title": "4. Orders and payment",
    "s4BodyPrefix": "Placing an order is an offer to buy at the listed price. We currently accept payment via",
    "s4BodyBkash": "bKash (Send Money)",
    "s4BodyMiddle": ", which is verified manually against a submitted Transaction ID, and",
    "s4BodyCod": "Cash on Delivery",
    "s4BodySuffix": ". Submitting a Transaction ID that doesn't correspond to a genuine payment, or refusing a Cash on Delivery order without cause, may result in the order being cancelled and, for repeated cases, your account being restricted.",
    "s5Title": "5. Shipping, returns, and refunds",
    "s5BodyPrefix": "Delivery timelines, our 14-day return window, and how refunds are processed are covered in full on our",
    "s5BodyLinkLabel": "Shipping & Returns",
    "s5BodySuffix": "page, which forms part of these Terms.",
    "s6Title": "6. Product authenticity and warranty",
    "s6Body": "Every product we sell is genuine and sourced through official channels. Manufacturer warranties, where applicable, are honored through the manufacturer's own service channels — we're happy to help you start a claim.",
    "s7Title": "7. Limitation of liability",
    "s7Body": "{brand} is provided on an \"as available\" basis. To the extent permitted by law, we aren't liable for indirect, incidental, or consequential damages arising from your use of the site or your purchase of a product, beyond the value of the order itself.",
    "s8Title": "8. Governing law",
    "s8Body": "These Terms are governed by the laws of Bangladesh.",
    "s9Title": "9. Changes to these terms",
    "s9Body": "We may update these Terms from time to time. If we make a material change, we'll update the \"last updated\" date above. Continuing to use {brand} after a change means you accept the updated terms.",
    "s10Title": "10. Contact",
    "s10BodyPrefix": "Questions about these Terms? Reach us at"
  },
  "privacy": {
    "eyebrow": "Legal",
    "heading": "Privacy Policy",
    "lastUpdated": "Last updated {date}",
    "collectTitle": "What we collect",
    "collectIntro": "Only what's needed to run your account and fulfill your orders:",
    "collectAccountLabel": "Account info",
    "collectAccountBody": "— name, email, phone, and password (or, if you sign in with Google, your Google account's name/email/avatar — we never see your Google password).",
    "collectOrderLabel": "Order & shipping info",
    "collectOrderBody": "— delivery address, order history, and any notes you leave on an order.",
    "collectPaymentLabel": "Payment verification info",
    "collectPaymentBody": "— for bKash orders, the sender number and Transaction ID you submit. We never collect card numbers, since we don't process card payments — bKash payments are verified manually, and Cash on Delivery involves no payment data at all.",
    "collectSecurityLabel": "Security info",
    "collectSecurityBody": "— sign-in timestamps, IP address, and device/browser info, used to detect suspicious activity on your account.",
    "useTitle": "How we use it",
    "useBody": "To create and secure your account, process and deliver your orders, verify manual payments, respond when you contact support, and send order-related emails (verification, password reset, order updates). We don't use your data for advertising, and {brand} doesn't run third-party analytics or ad tracking on this site.",
    "protectTitle": "How we protect it",
    "protectBody": "Passwords are hashed (never stored in plain text) and you can enable two-factor authentication for extra protection. Sign-in sessions are stored in httpOnly cookies your browser's JavaScript can't read. If you ever suspect your account has been accessed without your permission, contact us and we can revoke every active session on your behalf.",
    "shareTitle": "Who we share it with",
    "shareBody": "We don't sell your data. Your shipping address is shared with our delivery partners solely to deliver your order. Payment verification for bKash orders is handled internally — we don't send your data to a third-party payment processor, since there isn't one in this flow.",
    "cookiesTitle": "Cookies",
    "cookiesBody": "We use a small number of essential cookies to keep you signed in and to protect the site from cross-site request forgery. We don't use tracking or advertising cookies.",
    "rightsTitle": "Your rights",
    "rightsBodyPrefix": "You can review and update most of your account info directly from your account settings. To request a copy of your data, ask us to correct something we got wrong, or request account deletion, email us at",
    "changesTitle": "Changes to this policy",
    "changesBody": "If we make a material change to how we handle your data, we'll update the \"last updated\" date above.",
    "contactTitle": "Contact",
    "contactBodyPrefix": "Questions about this policy or your data? Reach us at"
  },
  "shippingReturns": {
    "eyebrow": "Delivery & policy",
    "heading": "Shipping & Returns",
    "shippingTitle": "Shipping",
    "shippingP1": "Every order is dispatched within 24 hours and ships with tracking, nationwide. Shipping is free on orders of ৳3,000 or more; orders below that ship for a flat ৳60.",
    "shippingP2Prefix": "You'll get a tracking link by email once your order leaves our warehouse, and you can always check an order's status from your account's",
    "shippingP2LinkLabel": "order history",
    "paymentTitle": "Payment methods",
    "paymentBodyPrefix": "We currently accept",
    "paymentBodyBkash": "bKash (Send Money)",
    "paymentBodyMiddle": "and",
    "paymentBodyCod": "Cash on Delivery",
    "paymentBodySuffix": ". For bKash, send the order total to the number shown at checkout and enter the Transaction ID — our team verifies it manually, usually within a few hours, and you'll see the update on your order page. For Cash on Delivery, simply pay when your order arrives.",
    "returnsTitle": "Returns",
    "returnsP1Prefix": "If something isn't right, you can return it within",
    "returnsP1Days": "14 days",
    "returnsP1Suffix": "of delivery for a full refund or exchange, as long as the item is unused, in its original packaging, and includes all accessories it shipped with.",
    "returnsP2Prefix": "To start a return, contact us at",
    "returnsP2LinkLabel": "our support email",
    "returnsP2Suffix": "with your order number. We'll confirm the details and arrange pickup or drop-off.",
    "refundsTitle": "Refunds",
    "refundsBody": "Once we receive and inspect a returned item, refunds are issued to the original payment method — back to your bKash account for bKash orders, or by bank transfer/mobile wallet for Cash on Delivery orders, arranged with our support team. Refunds are typically processed within 5-7 business days of approval.",
    "warrantyTitle": "Warranty",
    "warrantyBody": "Every device sold on {brand} is genuine and covered by its official manufacturer warranty. Warranty claims are handled directly through the manufacturer's local service channel; we're happy to help you get started — just reach out."
  }
```

- [ ] **Step 2: Add the five namespaces to `bn.json`**

Add to `apps/web/src/messages/bn.json` — same key structure, Bangla values:

```json
  "about": {
    "eyebrow": "{brand} সম্পর্কে",
    "heroTitle": "দৃষ্টিভঙ্গি, প্রকৌশলে গড়া — আপনি আসলে যেভাবে প্রযুক্তি ব্যবহার করেন, সেভাবেই।",
    "heroSubtitle": "{brand} তৈরি হয়েছে কারণ \"প্রিমিয়াম\" বলে বিক্রি হওয়া অনেক ইলেকট্রনিক্স আসলে তা নয়। আমরা উল্টো ধারণা নিয়ে একটি স্টোর তৈরি করেছি: কম পণ্য, সঠিকভাবে বাছাই করা, এবং এমন মানুষের সমর্থন যারা সত্যিই ফোন ধরবে।",
    "storyP1": "আমরা সবকিছু রাখার চেষ্টা করি না। ক্যাটালগের প্রতিটি ডিভাইস ও আনুষাঙ্গিক পণ্য বাছাই করা হয় কারণ সেটি সত্যিকার অর্থেই ভালো — কোনো সরবরাহকারী সেরা মার্জিন দিয়েছে বলে নয়। আমরা নিজেরা না কিনলে, তা শেলফে ওঠে না।",
    "storyP2": "চেকআউটের পরেও একই মান বজায় থাকে। প্রতিটি অর্ডার ট্র্যাকিংসহ পাঠানো হয়, প্রতিটি ডিভাইস আসল এবং এর অফিসিয়াল ওয়ারেন্টি দ্বারা সুরক্ষিত, আর কিছু ভুল হলে আমাদের সাপোর্ট টিমের একজন প্রকৃত মানুষ তা সমাধান করেন — কোনো স্ক্রিপ্ট নয়।",
    "storyP3Prefix": "শুধু একটি ট্যাগলাইন নয়। প্রতিটি পণ্য আপনার কাছে পৌঁছানোর আগে এই ফিল্টার দিয়ে যায়।",
    "storyEmphasis": "দৃষ্টিভঙ্গি, প্রকৌশলে গড়া",
    "standForHeading": "আমরা যা বিশ্বাস করি",
    "principle1Title": "প্রথমে সত্যতা",
    "principle1Body": "প্রতিটি ডিভাইস আসল, অফিসিয়াল চ্যানেলের মাধ্যমে সংগ্রহ করা — কোনো গ্রে-মার্কেট আমদানি নয়।",
    "principle2Title": "শুধু তালিকাভুক্ত নয়, বাছাইকৃত",
    "principle2Body": "একটি কিউরেটেড ক্যাটালগ একটি অন্তহীন ক্যাটালগের চেয়ে ভালো। আমরা ৫,০০০টি সাধারণ পণ্যের চেয়ে ৫০টি দুর্দান্ত পণ্য রাখতে পছন্দ করি।",
    "principle3Title": "সাপোর্ট যা সাড়া দেয়",
    "principle3Body": "প্রতিটি অর্ডার ও প্রশ্নের জবাব দেন প্রকৃত মানুষ — এমন কোনো টিকিট কিউ নয় যা কোথাও পৌঁছায় না।",
    "principle4Title": "দ্রুত, ট্র্যাকযোগ্য ডেলিভারি",
    "principle4Body": "অর্ডার পাঠানোর মুহূর্ত থেকেই ট্র্যাকিংসহ সারাদেশে শিপিং।",
    "ctaHeading": "নিজে দেখতে প্রস্তুত?",
    "ctaBody": "সম্পূর্ণ ক্যাটালগ ব্রাউজ করুন — প্রতিটি ডিভাইস যাচাইকৃত, প্রতিটি অর্ডার প্রকৃত সাপোর্টের নিশ্চয়তাসহ।",
    "ctaButton": "সব ডিভাইস কিনুন"
  },
  "contact": {
    "eyebrow": "যোগাযোগ করুন",
    "heading": "{brand}-এর সাথে যোগাযোগ",
    "subheading": "অর্ডার, পণ্য বা অন্য যেকোনো বিষয়ে প্রশ্ন থাকলে যোগাযোগ করুন — একজন প্রকৃত মানুষ আপনার সাথে যোগাযোগ করবেন।",
    "emailLabel": "ইমেইল",
    "responseTimeLabel": "সাড়া দেওয়ার সময়",
    "responseTimeValue": "সাধারণত এক কার্যদিবসের মধ্যে।",
    "footerPrefix": "অর্ডার স্ট্যাটাস, শিপিং সময়সূচি, বা আমাদের রিটার্ন পলিসি খুঁজছেন? দেখুন",
    "footerLinkLabel": "শিপিং ও রিটার্ন"
  },
  "terms": {
    "eyebrow": "আইনি তথ্য",
    "heading": "ব্যবহারের শর্তাবলী",
    "lastUpdated": "সর্বশেষ আপডেট {date}",
    "s1Title": "১. এই শর্তাবলী গ্রহণ",
    "s1Body": "অ্যাকাউন্ট তৈরি করে, অর্ডার দিয়ে, অথবা অন্য কোনোভাবে {brand} ব্যবহার করে আপনি এই ব্যবহারের শর্তাবলীতে সম্মত হচ্ছেন। এর কোনো অংশে অসম্মত হলে, অনুগ্রহ করে সাইটটি ব্যবহার করবেন না।",
    "s2Title": "২. আপনার অ্যাকাউন্ট",
    "s2Body": "আপনার অ্যাকাউন্টের তথ্য গোপন রাখা এবং আপনার অ্যাকাউন্টের অধীনে সব কার্যকলাপের দায়িত্ব আপনার। আমরা টু-ফ্যাক্টর অথেন্টিকেশন সমর্থন করি এবং তা চালু রাখার পরামর্শ দিই। অননুমোদিত অ্যাক্সেসের সন্দেহ হলে সাথে সাথে আমাদের জানান।",
    "s3Title": "৩. পণ্য ও মূল্য",
    "s3Body": "সব মূল্য বাংলাদেশি টাকায় (৳) তালিকাভুক্ত এবং কোনো নোটিশ ছাড়াই পরিবর্তন হতে পারে। আমরা পণ্যের তালিকা, স্টক এবং মূল্য সঠিক রাখার যুক্তিসঙ্গত চেষ্টা করি, তবে ভুল হতে পারে — কোনো তালিকায় ভুল মূল্য থাকলে বা অর্ডারের পর পণ্যটি অনুপলব্ধ হলে, অর্ডার প্রক্রিয়া করার আগে আমরা আপনার সাথে যোগাযোগ করব।",
    "s4Title": "৪. অর্ডার ও পেমেন্ট",
    "s4BodyPrefix": "অর্ডার দেওয়া মানে তালিকাভুক্ত মূল্যে কেনার একটি প্রস্তাব। বর্তমানে আমরা পেমেন্ট গ্রহণ করি",
    "s4BodyBkash": "বিকাশ (Send Money)",
    "s4BodyMiddle": "-এর মাধ্যমে, যা জমা দেওয়া ট্রানজেকশন আইডি দিয়ে ম্যানুয়ালি যাচাই করা হয়, এবং",
    "s4BodyCod": "ক্যাশ অন ডেলিভারি",
    "s4BodySuffix": "-এর মাধ্যমে। প্রকৃত পেমেন্টের সাথে মিলে না এমন ট্রানজেকশন আইডি জমা দেওয়া, বা কারণ ছাড়া ক্যাশ অন ডেলিভারি অর্ডার প্রত্যাখ্যান করা অর্ডার বাতিল হতে পারে এবং বারবার হলে আপনার অ্যাকাউন্ট সীমাবদ্ধ হতে পারে।",
    "s5Title": "৫. শিপিং, রিটার্ন এবং রিফান্ড",
    "s5BodyPrefix": "ডেলিভারির সময়সূচি, আমাদের ১৪ দিনের রিটার্ন সময়সীমা এবং রিফান্ড কীভাবে প্রক্রিয়া করা হয় তা বিস্তারিতভাবে আমাদের",
    "s5BodyLinkLabel": "শিপিং ও রিটার্ন",
    "s5BodySuffix": "পৃষ্ঠায় দেওয়া আছে, যা এই শর্তাবলীর অংশ।",
    "s6Title": "৬. পণ্যের সত্যতা ও ওয়ারেন্টি",
    "s6Body": "আমরা যে পণ্য বিক্রি করি তা সবই আসল এবং অফিসিয়াল চ্যানেলের মাধ্যমে সংগ্রহ করা। প্রযোজ্য ক্ষেত্রে, নির্মাতার ওয়ারেন্টি নির্মাতার নিজস্ব সার্ভিস চ্যানেলের মাধ্যমে সম্মানিত হয় — দাবি শুরু করতে আমরা সাহায্য করতে পেরে খুশি হব।",
    "s7Title": "৭. দায়ের সীমাবদ্ধতা",
    "s7Body": "{brand} \"যেমন উপলব্ধ\" ভিত্তিতে প্রদান করা হয়। আইন দ্বারা অনুমোদিত পরিমাণে, সাইট ব্যবহার বা পণ্য কেনার ফলে সৃষ্ট পরোক্ষ, আনুষঙ্গিক বা পরিণামমূলক ক্ষতির জন্য আমরা দায়ী নই, অর্ডারের মূল্যের বাইরে।",
    "s8Title": "৮. পরিচালনাকারী আইন",
    "s8Body": "এই শর্তাবলী বাংলাদেশের আইন দ্বারা পরিচালিত।",
    "s9Title": "৯. এই শর্তাবলীতে পরিবর্তন",
    "s9Body": "আমরা সময়ে সময়ে এই শর্তাবলী আপডেট করতে পারি। কোনো গুরুত্বপূর্ণ পরিবর্তন করলে, আমরা উপরের \"সর্বশেষ আপডেট\" তারিখ পরিবর্তন করব। পরিবর্তনের পর {brand} ব্যবহার চালিয়ে যাওয়া মানে আপনি আপডেট হওয়া শর্তাবলী মেনে নিচ্ছেন।",
    "s10Title": "১০. যোগাযোগ",
    "s10BodyPrefix": "এই শর্তাবলী নিয়ে প্রশ্ন আছে? আমাদের সাথে যোগাযোগ করুন"
  },
  "privacy": {
    "eyebrow": "আইনি তথ্য",
    "heading": "গোপনীয়তা নীতি",
    "lastUpdated": "সর্বশেষ আপডেট {date}",
    "collectTitle": "আমরা যা সংগ্রহ করি",
    "collectIntro": "শুধু যা আপনার অ্যাকাউন্ট পরিচালনা ও অর্ডার সম্পন্ন করতে প্রয়োজন:",
    "collectAccountLabel": "অ্যাকাউন্টের তথ্য",
    "collectAccountBody": "— নাম, ইমেইল, ফোন এবং পাসওয়ার্ড (অথবা, গুগল দিয়ে সাইন ইন করলে, আপনার গুগল অ্যাকাউন্টের নাম/ইমেইল/ছবি — আমরা কখনো আপনার গুগল পাসওয়ার্ড দেখি না)।",
    "collectOrderLabel": "অর্ডার ও শিপিং তথ্য",
    "collectOrderBody": "— ডেলিভারি ঠিকানা, অর্ডার ইতিহাস এবং অর্ডারে আপনার রেখে যাওয়া যেকোনো নোট।",
    "collectPaymentLabel": "পেমেন্ট যাচাইকরণ তথ্য",
    "collectPaymentBody": "— বিকাশ অর্ডারের জন্য, আপনার জমা দেওয়া প্রেরক নম্বর এবং ট্রানজেকশন আইডি। আমরা কখনো কার্ড নম্বর সংগ্রহ করি না, কারণ আমরা কার্ড পেমেন্ট প্রক্রিয়া করি না — বিকাশ পেমেন্ট ম্যানুয়ালি যাচাই করা হয়, আর ক্যাশ অন ডেলিভারিতে কোনো পেমেন্ট তথ্যই জড়িত থাকে না।",
    "collectSecurityLabel": "নিরাপত্তা তথ্য",
    "collectSecurityBody": "— সাইন-ইন টাইমস্ট্যাম্প, আইপি ঠিকানা এবং ডিভাইস/ব্রাউজার তথ্য, আপনার অ্যাকাউন্টে সন্দেহজনক কার্যকলাপ শনাক্ত করতে ব্যবহৃত হয়।",
    "useTitle": "আমরা এটি কীভাবে ব্যবহার করি",
    "useBody": "আপনার অ্যাকাউন্ট তৈরি ও সুরক্ষিত করতে, আপনার অর্ডার প্রক্রিয়া ও ডেলিভারি করতে, ম্যানুয়াল পেমেন্ট যাচাই করতে, সাপোর্টে যোগাযোগ করলে সাড়া দিতে এবং অর্ডার-সম্পর্কিত ইমেইল (যাচাইকরণ, পাসওয়ার্ড রিসেট, অর্ডার আপডেট) পাঠাতে। আমরা বিজ্ঞাপনের জন্য আপনার তথ্য ব্যবহার করি না, এবং {brand} এই সাইটে থার্ড-পার্টি অ্যানালিটিক্স বা বিজ্ঞাপন ট্র্যাকিং চালায় না।",
    "protectTitle": "আমরা এটি কীভাবে সুরক্ষিত রাখি",
    "protectBody": "পাসওয়ার্ড হ্যাশ করা থাকে (কখনো প্লেইন টেক্সটে সংরক্ষিত হয় না) এবং অতিরিক্ত সুরক্ষার জন্য আপনি টু-ফ্যাক্টর অথেন্টিকেশন চালু করতে পারেন। সাইন-ইন সেশন httpOnly কুকিতে সংরক্ষিত থাকে যা আপনার ব্রাউজারের জাভাস্ক্রিপ্ট পড়তে পারে না। আপনার অ্যাকাউন্টে অনুমতি ছাড়া প্রবেশের সন্দেহ হলে, আমাদের সাথে যোগাযোগ করুন এবং আমরা আপনার পক্ষে সব সক্রিয় সেশন বাতিল করতে পারি।",
    "shareTitle": "আমরা কার সাথে এটি শেয়ার করি",
    "shareBody": "আমরা আপনার তথ্য বিক্রি করি না। আপনার শিপিং ঠিকানা শুধুমাত্র অর্ডার ডেলিভারির জন্য আমাদের ডেলিভারি পার্টনারদের সাথে শেয়ার করা হয়। বিকাশ অর্ডারের পেমেন্ট যাচাইকরণ অভ্যন্তরীণভাবে পরিচালিত হয় — আমরা আপনার তথ্য কোনো থার্ড-পার্টি পেমেন্ট প্রসেসরকে পাঠাই না, কারণ এই প্রবাহে তেমন কেউ নেই।",
    "cookiesTitle": "কুকি",
    "cookiesBody": "আপনাকে সাইন-ইন রাখতে এবং সাইটটিকে ক্রস-সাইট রিকোয়েস্ট ফোরজারি থেকে রক্ষা করতে আমরা অল্প কিছু প্রয়োজনীয় কুকি ব্যবহার করি। আমরা ট্র্যাকিং বা বিজ্ঞাপন কুকি ব্যবহার করি না।",
    "rightsTitle": "আপনার অধিকার",
    "rightsBodyPrefix": "আপনি আপনার অ্যাকাউন্ট সেটিংস থেকে সরাসরি আপনার বেশিরভাগ তথ্য পর্যালোচনা ও আপডেট করতে পারেন। আপনার তথ্যের একটি কপি চাইতে, আমরা কিছু ভুল করলে তা সংশোধন করতে, বা অ্যাকাউন্ট মুছে ফেলার অনুরোধ করতে আমাদের ইমেইল করুন",
    "changesTitle": "এই নীতিতে পরিবর্তন",
    "changesBody": "আমরা আপনার তথ্য পরিচালনার পদ্ধতিতে কোনো গুরুত্বপূর্ণ পরিবর্তন করলে, আমরা উপরের \"সর্বশেষ আপডেট\" তারিখ পরিবর্তন করব।",
    "contactTitle": "যোগাযোগ",
    "contactBodyPrefix": "এই নীতি বা আপনার তথ্য নিয়ে প্রশ্ন আছে? আমাদের সাথে যোগাযোগ করুন"
  },
  "shippingReturns": {
    "eyebrow": "ডেলিভারি ও নীতি",
    "heading": "শিপিং ও রিটার্ন",
    "shippingTitle": "শিপিং",
    "shippingP1": "প্রতিটি অর্ডার ২৪ ঘণ্টার মধ্যে পাঠানো হয় এবং সারাদেশে ট্র্যাকিংসহ ডেলিভারি হয়। ৳৩,০০০ বা তার বেশি অর্ডারে শিপিং ফ্রি; এর কম অর্ডারে ফ্ল্যাট ৳৬০ শিপিং চার্জ প্রযোজ্য।",
    "shippingP2Prefix": "আপনার অর্ডার গুদাম থেকে বের হওয়ার পর ইমেইলে একটি ট্র্যাকিং লিংক পাবেন, এবং আপনি সবসময় আপনার অ্যাকাউন্টের",
    "shippingP2LinkLabel": "অর্ডার ইতিহাস",
    "paymentTitle": "পেমেন্ট পদ্ধতি",
    "paymentBodyPrefix": "আমরা বর্তমানে গ্রহণ করি",
    "paymentBodyBkash": "বিকাশ (Send Money)",
    "paymentBodyMiddle": "এবং",
    "paymentBodyCod": "ক্যাশ অন ডেলিভারি",
    "paymentBodySuffix": "। বিকাশের জন্য, চেকআউটে দেখানো নম্বরে অর্ডারের মোট টাকা পাঠান এবং ট্রানজেকশন আইডি লিখুন — আমাদের টিম সাধারণত কয়েক ঘণ্টার মধ্যে তা ম্যানুয়ালি যাচাই করে, এবং আপনি আপনার অর্ডার পেজে আপডেট দেখতে পাবেন। ক্যাশ অন ডেলিভারির জন্য, অর্ডার পৌঁছালে শুধু পেমেন্ট করুন।",
    "returnsTitle": "রিটার্ন",
    "returnsP1Prefix": "কিছু ঠিক না থাকলে, ডেলিভারির",
    "returnsP1Days": "১৪ দিনের",
    "returnsP1Suffix": "মধ্যে আপনি তা সম্পূর্ণ রিফান্ড বা বদলের জন্য ফেরত দিতে পারেন, যদি পণ্যটি অব্যবহৃত থাকে, মূল প্যাকেজিং-এ থাকে এবং এর সাথে পাঠানো সব আনুষাঙ্গিক থাকে।",
    "returnsP2Prefix": "রিটার্ন শুরু করতে, আপনার অর্ডার নম্বরসহ আমাদের",
    "returnsP2LinkLabel": "সাপোর্ট ইমেইলে",
    "returnsP2Suffix": "যোগাযোগ করুন। আমরা বিস্তারিত নিশ্চিত করে পিকআপ বা ড্রপ-অফের ব্যবস্থা করব।",
    "refundsTitle": "রিফান্ড",
    "refundsBody": "ফেরত দেওয়া পণ্য গ্রহণ ও পরিদর্শনের পর, মূল পেমেন্ট পদ্ধতিতে রিফান্ড ইস্যু করা হয় — বিকাশ অর্ডারের জন্য আপনার বিকাশ অ্যাকাউন্টে, অথবা ক্যাশ অন ডেলিভারি অর্ডারের জন্য ব্যাংক ট্রান্সফার/মোবাইল ওয়ালেটে, আমাদের সাপোর্ট টিমের সাথে ব্যবস্থা করে। অনুমোদনের ৫-৭ কার্যদিবসের মধ্যে সাধারণত রিফান্ড প্রক্রিয়া করা হয়।",
    "warrantyTitle": "ওয়ারেন্টি",
    "warrantyBody": "{brand}-এ বিক্রি হওয়া প্রতিটি ডিভাইস আসল এবং এর অফিসিয়াল নির্মাতা ওয়ারেন্টি দ্বারা সুরক্ষিত। ওয়ারেন্টি দাবি সরাসরি নির্মাতার স্থানীয় সার্ভিস চ্যানেলের মাধ্যমে পরিচালিত হয়; শুরু করতে সাহায্য করতে পেরে আমরা খুশি হব — শুধু যোগাযোগ করুন।"
  }
```

- [ ] **Step 3: Wire `about/page.tsx`**

Add the import: `import { getTranslations } from 'next-intl/server';`

At the top of `AboutPage`, after `const brand = settings.siteName || 'Drikon';`, add:

```tsx
  const t = await getTranslations('about');
```

Replace each hardcoded string with its `t(...)` call, threading `brand` through as an interpolation value where the English used the `{brand}` template literal, e.g.:

```tsx
<span>{t('eyebrow', { brand })}</span>
```

```tsx
<h1 ...>{t('heroTitle')}</h1>
```

```tsx
<p ...>{t('heroSubtitle', { brand })}</p>
```

```tsx
<p>{t('storyP1')}</p>
<p>{t('storyP2')}</p>
<p><em>{t('storyEmphasis')}</em> {t('storyP3Prefix')}</p>
```

```tsx
<h2 ...>{t('standForHeading')}</h2>
```

Replace the `PRINCIPLES` constant's four inline `{ title, body }` objects with `t()` calls built inside the component (since `PRINCIPLES` is currently a module-level constant, move its construction inside `AboutPage`, same pattern as Phase 1's `StatsBand` conversion):

```tsx
  const PRINCIPLES = [
    { title: t('principle1Title'), body: t('principle1Body') },
    { title: t('principle2Title'), body: t('principle2Body') },
    { title: t('principle3Title'), body: t('principle3Body') },
    { title: t('principle4Title'), body: t('principle4Body') },
  ];
```

(Remove the old module-level `const PRINCIPLES = [...]` entirely.)

```tsx
<h3 ...>{t('ctaHeading')}</h3>
<p ...>{t('ctaBody')}</p>
```

```tsx
{t('ctaButton')} <ArrowRight className="w-4 h-4" />
```

- [ ] **Step 4: Wire `contact/page.tsx`**

Add the import: `import { getTranslations } from 'next-intl/server';`

After `const email = ...` line, add: `const t = await getTranslations('contact');`

Replace the hardcoded strings:

```tsx
<div ...>{t('eyebrow')}</div>
<h1 ...>{t('heading', { brand })}</h1>
<p ...>{t('subheading')}</p>
```

```tsx
<div className="font-semibold text-sm">{t('emailLabel')}</div>
```

```tsx
<div className="font-semibold text-sm">{t('responseTimeLabel')}</div>
<div ...>{t('responseTimeValue')}</div>
```

```tsx
<p ...>
  {t('footerPrefix')}{' '}
  <a href="/shipping-returns" ...>{t('footerLinkLabel')}</a>
  .
</p>
```

- [ ] **Step 5: Wire `terms/page.tsx`**

Add the import: `import { getTranslations } from 'next-intl/server';`

After the `const updated = ...` line, add: `const t = await getTranslations('terms');`

Replace:

```tsx
<div ...>{t('eyebrow')}</div>
<h1 ...>{t('heading')}</h1>
<p ...>{t('lastUpdated', { date: updated })}</p>
```

Replace each `<Section title="...">` block's title and body with the corresponding `t()` calls, e.g.:

```tsx
<Section title={t('s1Title')}>
  <p>{t('s1Body', { brand })}</p>
</Section>

<Section title={t('s2Title')}>
  <p>{t('s2Body')}</p>
</Section>

<Section title={t('s3Title')}>
  <p>{t('s3Body')}</p>
</Section>

<Section title={t('s4Title')}>
  <p>
    {t('s4BodyPrefix')}{' '}
    <strong className="text-[color:var(--fg)]">{t('s4BodyBkash')}</strong>
    {t('s4BodyMiddle')}{' '}
    <strong className="text-[color:var(--fg)]">{t('s4BodyCod')}</strong>
    {t('s4BodySuffix')}
  </p>
</Section>

<Section title={t('s5Title')}>
  <p>
    {t('s5BodyPrefix')}{' '}
    <a href="/shipping-returns" ...>{t('s5BodyLinkLabel')}</a>{' '}
    {t('s5BodySuffix')}
  </p>
</Section>

<Section title={t('s6Title')}>
  <p>{t('s6Body')}</p>
</Section>

<Section title={t('s7Title')}>
  <p>{t('s7Body', { brand })}</p>
</Section>

<Section title={t('s8Title')}>
  <p>{t('s8Body')}</p>
</Section>

<Section title={t('s9Title')}>
  <p>{t('s9Body', { brand })}</p>
</Section>

<Section title={t('s10Title')}>
  <p>
    {t('s10BodyPrefix')}{' '}
    <a href={`mailto:${email}`} ...>{email}</a>
    .
  </p>
</Section>
```

- [ ] **Step 6: Wire `privacy/page.tsx`**

Add the import: `import { getTranslations } from 'next-intl/server';`

After the `const updated = ...` line, add: `const t = await getTranslations('privacy');`

Replace the header block and each `<Section>` the same way as Terms, e.g.:

```tsx
<Section title={t('collectTitle')}>
  <p>{t('collectIntro')}</p>
  <ul className="list-disc pl-5 space-y-2">
    <li>
      <strong className="text-[color:var(--fg)]">{t('collectAccountLabel')}</strong> {t('collectAccountBody')}
    </li>
    <li>
      <strong className="text-[color:var(--fg)]">{t('collectOrderLabel')}</strong> {t('collectOrderBody')}
    </li>
    <li>
      <strong className="text-[color:var(--fg)]">{t('collectPaymentLabel')}</strong> {t('collectPaymentBody')}
    </li>
    <li>
      <strong className="text-[color:var(--fg)]">{t('collectSecurityLabel')}</strong> {t('collectSecurityBody')}
    </li>
  </ul>
</Section>

<Section title={t('useTitle')}>
  <p>{t('useBody', { brand })}</p>
</Section>

<Section title={t('protectTitle')}>
  <p>{t('protectBody')}</p>
</Section>

<Section title={t('shareTitle')}>
  <p>{t('shareBody')}</p>
</Section>

<Section title={t('cookiesTitle')}>
  <p>{t('cookiesBody')}</p>
</Section>

<Section title={t('rightsTitle')}>
  <p>
    {t('rightsBodyPrefix')}{' '}
    <a href={`mailto:${email}`} ...>{email}</a>
    .
  </p>
</Section>

<Section title={t('changesTitle')}>
  <p>{t('changesBody')}</p>
</Section>

<Section title={t('contactTitle')}>
  <p>
    {t('contactBodyPrefix')}{' '}
    <a href={`mailto:${email}`} ...>{email}</a>
    .
  </p>
</Section>
```

(`title={t('eyebrow')}`/`t('heading')`/`t('lastUpdated', { date: updated })` for the page header, same pattern as Terms.)

- [ ] **Step 7: Wire `shipping-returns/page.tsx`**

Add the import: `import { getTranslations } from 'next-intl/server';`

After `const brand = ...`, add: `const t = await getTranslations('shippingReturns');`

```tsx
<div ...>{t('eyebrow')}</div>
<h1 ...>{t('heading')}</h1>
```

```tsx
<Section title={t('shippingTitle')}>
  <p>{t('shippingP1')}</p>
  <p>
    {t('shippingP2Prefix')}{' '}
    <Link href="/orders" ...>{t('shippingP2LinkLabel')}</Link>
    .
  </p>
</Section>

<Section title={t('paymentTitle')}>
  <p>
    {t('paymentBodyPrefix')}{' '}
    <strong className="text-[color:var(--fg)]">{t('paymentBodyBkash')}</strong>{' '}
    {t('paymentBodyMiddle')}{' '}
    <strong className="text-[color:var(--fg)]">{t('paymentBodyCod')}</strong>
    {t('paymentBodySuffix')}
  </p>
</Section>

<Section title={t('returnsTitle')}>
  <p>
    {t('returnsP1Prefix')} <strong className="text-[color:var(--fg)]">{t('returnsP1Days')}</strong>{' '}
    {t('returnsP1Suffix')}
  </p>
  <p>
    {t('returnsP2Prefix')}{' '}
    <a href="/contact" ...>{t('returnsP2LinkLabel')}</a>{' '}
    {t('returnsP2Suffix')}
  </p>
</Section>

<Section title={t('refundsTitle')}>
  <p>{t('refundsBody')}</p>
</Section>

<Section title={t('warrantyTitle')}>
  <p>{t('warrantyBody', { brand })}</p>
</Section>
```

- [ ] **Step 8: Typecheck, lint, build**

Run: `pnpm --filter web typecheck && pnpm --filter web lint && pnpm --filter web build`
Expected: all clean.

- [ ] **Step 9: Live-verify**

Boot the dev servers as in Task 4 Step 8. In both `en` and `bn` locales, load `/about`, `/contact`, `/terms`, `/privacy`, `/shipping-returns` and confirm every heading/paragraph renders in the correct language, the `{brand}`/`{date}`/`{email}` interpolations resolve correctly in both, and links (`/shipping-returns`, `/contact`, `mailto:`, `/orders`) still work. Stop the servers.

- [ ] **Step 10: Commit**

```bash
git add apps/web/src/messages apps/web/src/app/about apps/web/src/app/contact apps/web/src/app/terms \
  apps/web/src/app/privacy apps/web/src/app/shipping-returns
git commit -m "feat(web): translate About, Contact, Terms, Privacy, and Shipping & Returns pages"
```

---

### Task 6: Category and banner Bangla content

**Files:**
- Create (temporary, not committed): a one-off script run via `npx tsx`, following the exact pattern already used and approved this session for `add-category-images.ts` and `add-banners.ts` — write it to the scratchpad directory, not the repo, since it's a one-time content-population operation, not reusable application code.

**Interfaces:**
- Consumes: `PrismaClient` (`@prisma/client`), the `Category.nameBn`/`descriptionBn` and `Banner.headingBn`/`subheadingBn` columns from Task 1.

- [ ] **Step 1: Write the content script**

Write a script (e.g. `/tmp/.../scratchpad/add-bn-content-categories-banners.ts`) that updates each category by slug and each banner by heading, using this exact data:

Categories (slug → nameBn, descriptionBn):

| slug | nameBn | descriptionBn |
|---|---|---|
| `audio` | অডিও | হেডফোন, ইয়ারবাড, স্পিকার |
| `cases` | কেস ও প্রোটেকশন | প্রিমিয়াম কেস, স্ক্রিন প্রোটেক্টর |
| `power` | চার্জার ও পাওয়ার | ফাস্ট চার্জার, ম্যাগসেফ, পাওয়ার ব্যাংক |
| `components` | কম্পোনেন্টস | ড্রাইভার, ব্যাটারি, আইসি ও প্যাসিভস |
| `drones-fpv` | ড্রোন ও এফপিভি | রেডি-টু-ফ্লাই ড্রোন, ফ্রেম ও এফপিভি গিয়ার |
| `gadgets` | গ্যাজেট | ক্যামেরা, ডিসপ্লে ও স্মার্ট-হোম গ্যাজেট |
| `microcontrollers` | মাইক্রোকন্ট্রোলার | বোর্ড ও ডেভ কিট — Arduino, Raspberry Pi, ESP32 |
| `motors-actuators` | মোটর ও অ্যাকচুয়েটর | সার্ভো, স্টেপার, ডিসি মোটর ও ড্রাইভার |
| `robotic-parts` | রোবোটিক পার্টস | চেসিস, চাকা, গ্রিপার ও যান্ত্রিক অংশ |
| `robotics` | রোবোটিক্স | *(null — no English description exists either, leave `descriptionBn` unset)* |
| `sensors-modules` | সেন্সর ও মডিউল | দূরত্ব, গতি, তাপমাত্রা, ভিশন এবং আরও অনেক কিছু |
| `smartphones` | স্মার্টফোন | প্রিমিয়াম ফ্ল্যাগশিপ ডিভাইস |
| `tools-gear` | টুলস ও গিয়ার | ব্রেডবোর্ড, জাম্পার ওয়্যার, সোল্ডারিং ও প্রোটোটাইপিং |
| `wearables` | ওয়্যারেবলস | স্মার্টওয়াচ ও ফিটনেস ব্যান্ড |

Banners (heading → headingBn, subheadingBn):

| heading | headingBn | subheadingBn |
|---|---|---|
| Otto Bot | অট্টো বট | *(null — no English subheading exists either, leave `subheadingBn` unset)* |
| Flagship Smartphones | ফ্ল্যাগশিপ স্মার্টফোন | Apple, Samsung, Google এবং Xiaomi-এর সর্বশেষ মডেল। |
| Premium Audio | প্রিমিয়াম অডিও | নয়েজ-ক্যান্সেলিং হেডফোন ও ইয়ারবাড যা সত্যিই কাজ করে। |
| Wearables for Every Day | প্রতিদিনের জন্য ওয়্যারেবলস | আপনার স্বাস্থ্য ট্র্যাক করুন, সংযুক্ত থাকুন, দেখতেও ভালো লাগুক। |

Script body:

```ts
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const categories: Record<string, { nameBn: string; descriptionBn?: string }> = {
  audio: { nameBn: 'অডিও', descriptionBn: 'হেডফোন, ইয়ারবাড, স্পিকার' },
  cases: { nameBn: 'কেস ও প্রোটেকশন', descriptionBn: 'প্রিমিয়াম কেস, স্ক্রিন প্রোটেক্টর' },
  power: { nameBn: 'চার্জার ও পাওয়ার', descriptionBn: 'ফাস্ট চার্জার, ম্যাগসেফ, পাওয়ার ব্যাংক' },
  components: { nameBn: 'কম্পোনেন্টস', descriptionBn: 'ড্রাইভার, ব্যাটারি, আইসি ও প্যাসিভস' },
  'drones-fpv': { nameBn: 'ড্রোন ও এফপিভি', descriptionBn: 'রেডি-টু-ফ্লাই ড্রোন, ফ্রেম ও এফপিভি গিয়ার' },
  gadgets: { nameBn: 'গ্যাজেট', descriptionBn: 'ক্যামেরা, ডিসপ্লে ও স্মার্ট-হোম গ্যাজেট' },
  microcontrollers: { nameBn: 'মাইক্রোকন্ট্রোলার', descriptionBn: 'বোর্ড ও ডেভ কিট — Arduino, Raspberry Pi, ESP32' },
  'motors-actuators': { nameBn: 'মোটর ও অ্যাকচুয়েটর', descriptionBn: 'সার্ভো, স্টেপার, ডিসি মোটর ও ড্রাইভার' },
  'robotic-parts': { nameBn: 'রোবোটিক পার্টস', descriptionBn: 'চেসিস, চাকা, গ্রিপার ও যান্ত্রিক অংশ' },
  robotics: { nameBn: 'রোবোটিক্স' },
  'sensors-modules': { nameBn: 'সেন্সর ও মডিউল', descriptionBn: 'দূরত্ব, গতি, তাপমাত্রা, ভিশন এবং আরও অনেক কিছু' },
  smartphones: { nameBn: 'স্মার্টফোন', descriptionBn: 'প্রিমিয়াম ফ্ল্যাগশিপ ডিভাইস' },
  'tools-gear': { nameBn: 'টুলস ও গিয়ার', descriptionBn: 'ব্রেডবোর্ড, জাম্পার ওয়্যার, সোল্ডারিং ও প্রোটোটাইপিং' },
  wearables: { nameBn: 'ওয়্যারেবলস', descriptionBn: 'স্মার্টওয়াচ ও ফিটনেস ব্যান্ড' },
};

const banners: Record<string, { headingBn: string; subheadingBn?: string }> = {
  'Otto Bot': { headingBn: 'অট্টো বট' },
  'Flagship Smartphones': {
    headingBn: 'ফ্ল্যাগশিপ স্মার্টফোন',
    subheadingBn: 'Apple, Samsung, Google এবং Xiaomi-এর সর্বশেষ মডেল।',
  },
  'Premium Audio': {
    headingBn: 'প্রিমিয়াম অডিও',
    subheadingBn: 'নয়েজ-ক্যান্সেলিং হেডফোন ও ইয়ারবাড যা সত্যিই কাজ করে।',
  },
  'Wearables for Every Day': {
    headingBn: 'প্রতিদিনের জন্য ওয়্যারেবলস',
    subheadingBn: 'আপনার স্বাস্থ্য ট্র্যাক করুন, সংযুক্ত থাকুন, দেখতেও ভালো লাগুক।',
  },
};

async function main() {
  for (const [slug, data] of Object.entries(categories)) {
    const result = await prisma.category.updateMany({ where: { slug }, data });
    console.log(result.count > 0 ? `✓ category ${slug}` : `✗ NOT FOUND: category ${slug}`);
  }
  for (const [heading, data] of Object.entries(banners)) {
    const result = await prisma.banner.updateMany({ where: { heading }, data });
    console.log(result.count > 0 ? `✓ banner "${heading}"` : `✗ NOT FOUND: banner "${heading}"`);
  }
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
```

- [ ] **Step 2: Run against local dev database first**

```bash
cd apps/api && npx tsx /path/to/scratchpad/add-bn-content-categories-banners.ts
```

Expected: 14 `✓ category ...` lines and 4 `✓ banner "..."` lines, zero `NOT FOUND` lines (local dev DB was seeded with the same category/banner data structure earlier this session).

- [ ] **Step 3: Live-verify locally**

Boot dev servers as in Task 4 Step 8. In `bn` locale, load `/` and confirm the "Shop by category" tiles and the hero slider show Bangla names/descriptions/headings/subheadings; confirm the Otto Bot slide shows its Bangla heading with no subheading rendered (since none exists in either language) and no broken layout. Load `/products` and confirm category chips show Bangla names. Switch to `en` locale and confirm everything reverts to English. Stop the servers.

- [ ] **Step 4: Run against production**

```bash
cd apps/api && DATABASE_URL='<production connection string>' npx tsx /path/to/scratchpad/add-bn-content-categories-banners.ts
```

Expected: same 18 `✓` lines, zero `NOT FOUND`.

- [ ] **Step 5: Verify against the live production site**

Using Playwright against `https://drikon-web-vert1v.vercel.app` (or the current production URL), confirm the homepage category tiles and hero slider show Bangla text in `bn` locale.

(No commit for this task — the script is a one-off data operation, not committed to the repo, following the established pattern from the images/reviews work earlier this session.)

---

### Task 7: Product Bangla content — the 25 products in `seed.ts`

**Files:**
- Modify: `apps/api/prisma/seed.ts`

**Interfaces:**
- Consumes: nothing new.
- Produces: nothing new externally — this task only adds `nameBn`/`descriptionBn`/`shortDescriptionBn` values to the existing `products` array entries and changes the upsert's `update` clause so re-running the seed fills in translations on already-existing rows.

- [ ] **Step 1: Change the upsert to update Bangla fields on existing rows**

Currently, `apps/api/prisma/seed.ts`'s product loop uses `update: {}` (a deliberate no-op on conflict, so re-running the seed never clobbers admin edits to English fields). Change it to update only the three Bangla fields, leaving every other field untouched on existing rows:

Find:

```ts
  const productsBySlug = new Map<string, { id: string; reviewTarget: number }>();
  for (const p of products) {
    const rec = await prisma.product.upsert({
      where: { slug: p.data.slug! },
      update: {},
      create: p.data,
    });
    productsBySlug.set(p.data.slug!, { id: rec.id, reviewTarget: p.reviewTarget });
  }
```

Replace with:

```ts
  const productsBySlug = new Map<string, { id: string; reviewTarget: number }>();
  for (const p of products) {
    const rec = await prisma.product.upsert({
      where: { slug: p.data.slug! },
      update: {
        nameBn: p.data.nameBn,
        descriptionBn: p.data.descriptionBn,
        shortDescriptionBn: p.data.shortDescriptionBn,
      },
      create: p.data,
    });
    productsBySlug.set(p.data.slug!, { id: rec.id, reviewTarget: p.reviewTarget });
  }
```

- [ ] **Step 2: Add `nameBn`, `shortDescriptionBn`, `descriptionBn` to each of the 25 product entries**

For each of the 25 `data: { ... }` blocks in the `products` array, add three fields immediately after `shortDescription`. Use this exact mapping (matched by `slug`):

**`iphone-15-pro-titanium`:**
```ts
        nameBn: 'আইফোন ১৫ প্রো টাইটানিয়াম',
        shortDescriptionBn: 'অ্যারোস্পেস-গ্রেড টাইটানিয়াম, A17 Pro চিপ, প্রো ক্যামেরা সিস্টেম।',
        descriptionBn:
          'অ্যারোস্পেস-গ্রেড টাইটানিয়ামে তৈরি। রয়েছে A17 Pro চিপ, কাস্টমাইজযোগ্য অ্যাকশন বাটন, এবং আইফোনের সবচেয়ে শক্তিশালী ক্যামেরা সিস্টেম।',
```

**`samsung-galaxy-s24-ultra`:**
```ts
        nameBn: 'স্যামসাং গ্যালাক্সি S24 আল্ট্রা',
        shortDescriptionBn: 'টাইটানিয়াম বডি, Galaxy AI, ২০০MP ক্যামেরা, বিল্ট-ইন S Pen।',
        descriptionBn:
          'মোবাইল AI-এর যুগে স্বাগতম। Galaxy S24 আল্ট্রা আপনার জীবনের সবচেয়ে গুরুত্বপূর্ণ ডিভাইস থেকে শুরু করে সৃজনশীলতা, উৎপাদনশীলতা এবং সম্ভাবনার নতুন মাত্রা উন্মোচন করে।',
```

**`spigen-core-armor-iphone-15-pro`:**
```ts
        nameBn: 'স্পিজেন কোর আর্মার কেস',
        shortDescriptionBn: 'স্লিম শক-অ্যাবজর্বিং প্রোটেকশন, ম্যাট ব্ল্যাক ফিনিশ।',
        descriptionBn:
          'প্রস্তুত হোন। কোর আর্মার এর সিগনেচার শক-অ্যাবজর্বিং ডিজাইন ও টাচাইল গ্রিপ দিয়ে সম্পূর্ণ সুরক্ষা দেয়। প্রতিটি পড়ে যাওয়াতেও আপনার ডিভাইস রাখে অক্ষত।',
```

**`anker-maggo-power-bank-10k`:**
```ts
        nameBn: 'অ্যাংকার ম্যাগগো পাওয়ার ব্যাংক (১০K)',
        shortDescriptionBn: 'Qi2 15W ওয়্যারলেস, ১০০০০mAh ক্যাপাসিটি, ম্যাগসেফ কম্প্যাটিবল।',
        descriptionBn:
          'Qi2-সার্টিফায়েড 15W আল্ট্রা-ফাস্ট ওয়্যারলেস চার্জিং। ১০,০০০mAh ক্যাপাসিটি নিয়ে এটি আপনার ম্যাগসেফ-কম্প্যাটিবল আইফোনের সাথে নিখুঁতভাবে আটকে পূর্ণ রিচার্জ দেয়, যেখানেই থাকুন।',
```

**`google-pixel-8-pro`:**
```ts
        nameBn: 'গুগল পিক্সেল ৮ প্রো',
        shortDescriptionBn: 'বিল্ট-ইন Google AI, প্রো ক্যামেরা সিস্টেম, Super Actua ডিসপ্লে।',
        descriptionBn:
          'সবচেয়ে সহায়ক পিক্সেল এখন পর্যন্ত। বিল্ট-ইন Google AI, প্রো-লেভেল ক্যামেরা সিস্টেম এবং অসাধারণ Super Actua ডিসপ্লে নিয়ে, Pixel 8 Pro আপনাকে আরও বেশি কাজ সম্পন্ন করতে সাহায্য করে।',
```

**`xiaomi-14-ultra`:**
```ts
        nameBn: 'শাওমি ১৪ আল্ট্রা',
        shortDescriptionBn: 'Leica-এর সাথে কো-ইঞ্জিনিয়ার্ড কোয়াড ক্যামেরা, ফ্ল্যাগশিপ পারফরম্যান্স।',
        descriptionBn:
          'Leica-এর সাথে যৌথভাবে ইঞ্জিনিয়ার্ড। পেশাদার ফটোগ্রাফির জন্য তৈরি একটি কোয়াড-ক্যামেরা সিস্টেম, যা যতটা প্রিমিয়াম দেখায় ততটাই পারফর্ম করে।',
```

**`samsung-galaxy-a55`:**
```ts
        nameBn: 'স্যামসাং গ্যালাক্সি A55',
        shortDescriptionBn: 'মেটাল ফ্রেম, উজ্জ্বল ডিসপ্লে, বহুমুখী প্রতিদিনের ক্যামেরা।',
        descriptionBn:
          'সবার জন্য অসাধারণ। Galaxy A55 মিড-রেঞ্জ লাইনআপে নিয়ে আসে একটি স্লিক মেটাল ফ্রেম, উজ্জ্বল ডিসপ্লে এবং বহুমুখী ক্যামেরা।',
```

**`iphone-se`:**
```ts
        nameBn: 'আইফোন SE',
        shortDescriptionBn: 'কমপ্যাক্ট ডিজাইন, শক্তিশালী চিপ, আইফোনে সাশ্রয়ী প্রবেশ।',
        descriptionBn:
          'আইফোনে প্রবেশের সবচেয়ে সাশ্রয়ী উপায়। কমপ্যাক্ট, শক্তিশালী, এবং এমন একটি চিপ নিয়ে প্রস্তুত যা বছরের পর বছর ধরে এটিকে দ্রুত রাখে।',
```

**`spigen-tempered-glass-screen-protector`:**
```ts
        nameBn: 'স্পিজেন টেম্পারড গ্লাস স্ক্রিন প্রোটেক্টর',
        shortDescriptionBn: '9H হার্ডনেস, বাবল-ফ্রি ইনস্টল ট্রে, কেস-ফ্রেন্ডলি ফিট।',
        descriptionBn:
          '9H হার্ডনেসের টেম্পারড গ্লাস, সাথে একটি সহজ-ইনস্টল ট্রে যা প্রতিবার নিখুঁতভাবে কেন্দ্রীভূত, বাবল-ফ্রি প্রয়োগ নিশ্চিত করে। কেস-ফ্রেন্ডলি প্রান্ত।',
```

**`anker-magsafe-wallet-case`:**
```ts
        nameBn: 'অ্যাংকার ম্যাগসেফ ওয়ালেট কেস',
        shortDescriptionBn: 'বিল্ট-ইন ম্যাগসেফ কার্ড হোল্ডার, স্লিম প্রোটেক্টিভ শেল।',
        descriptionBn:
          'একটি স্লিম কেস যাতে বিল্ট-ইন ম্যাগসেফ-কম্প্যাটিবল কার্ড হোল্ডার রয়েছে, যা নিরাপদে আটকে যায় ও খোলা যায়। আলাদা ওয়ালেট ছাড়াই আপনার কার্ড বহন করুন।',
```

**`spigen-slim-armor-case`:**
```ts
        nameBn: 'স্পিজেন স্লিম আর্মার কেস',
        shortDescriptionBn: 'বিল্ট-ইন কিকস্ট্যান্ডসহ ডুয়াল-লেয়ার প্রোটেকশন।',
        descriptionBn:
          'বিল্ট-ইন কিকস্ট্যান্ডসহ ডুয়াল-লেয়ার প্রোটেকশন। প্রতিদিনের বহনের জন্য যথেষ্ট স্লিম, আবার পরিস্থিতি প্রতিকূল হলেও যথেষ্ট টেকসই।',
```

**`clear-silicone-case`:**
```ts
        nameBn: 'ক্লিয়ার সিলিকন কেস',
        shortDescriptionBn: 'হলুদ-প্রতিরোধী ক্লিয়ার সিলিকন, সফট-টাচ গ্রিপ।',
        descriptionBn:
          'একটি সফট-টাচ ক্লিয়ার কেস দিয়ে আপনার ফোনের আসল ডিজাইন প্রদর্শন করুন, যা হলুদ হওয়া প্রতিরোধ করে এবং পর্যাপ্ত গ্রিপ ও ড্রপ প্রোটেকশন যোগ করে।',
```

**`anker-65w-gan-charger`:**
```ts
        nameBn: 'অ্যাংকার ৬৫W GaN চার্জার',
        shortDescriptionBn: 'কমপ্যাক্ট 65W GaN চার্জার, ৩টি পোর্ট, ল্যাপটপ-সক্ষম।',
        descriptionBn:
          'একটি ল্যাপটপ এবং দুটি ফোন একসাথে চার্জ করুন, এমন একটি চার্জার দিয়ে যা আপনার হাতের তালুর চেয়েও ছোট। GaN II প্রযুক্তি একটি কমপ্যাক্ট, ঠাণ্ডা-চলমান শেলে 65W প্যাক করে।',
```

**`anker-maggo-power-bank-20k`:**
```ts
        nameBn: 'অ্যাংকার ম্যাগগো পাওয়ার ব্যাংক (২০K)',
        shortDescriptionBn: 'Qi2 15W ওয়্যারলেস, ২০০০০mAh ক্যাপাসিটি, USB-C পোর্ট।',
        descriptionBn:
          'রোড ট্রিপ ও দীর্ঘ দিনের জন্য 10K-এর দ্বিগুণ ক্যাপাসিটি। Qi2-সার্টিফায়েড 15W ওয়্যারলেস চার্জিং, সাথে ওয়্যার্ড টপ-আপের জন্য একটি USB-C পোর্ট।',
```

**`anker-usb-c-cable-3-pack`:**
```ts
        nameBn: 'অ্যাংকার USB-C কেবল (৩-প্যাক)',
        shortDescriptionBn: 'ব্রেইডেড নাইলন, 100W রেটেড, প্যাকে ৩টি কেবল।',
        descriptionBn:
          'ব্রেইডেড নাইলন USB-C থেকে USB-C কেবল, 100W এবং ১০,০০০+ বাঁক-সহনশীলতার জন্য রেট করা। একটি ডেস্কের জন্য, একটি ব্যাগের জন্য, একটি গাড়ির জন্য।',
```

**`apple-20w-usb-c-power-adapter`:**
```ts
        nameBn: 'অ্যাপল ২০W USB-C পাওয়ার অ্যাডাপ্টার',
        shortDescriptionBn: 'কমপ্যাক্ট 20W USB-C ফাস্ট-চার্জিং পাওয়ার অ্যাডাপ্টার।',
        descriptionBn:
          'একটি কমপ্যাক্ট, কার্যকর পাওয়ার অ্যাডাপ্টার যা আপনার আইফোন দ্রুত চার্জ করে এবং যেকোনো USB-C ডিভাইসের সাথে দারুণভাবে কাজ করে। কেবল অন্তর্ভুক্ত নয়।',
```

**`jbl-tune-510bt`:**
```ts
        nameBn: 'জেবিএল টিউন ৫১০BT',
        shortDescriptionBn: 'ওয়্যারলেস ওভার-ইয়ার, ৪০-ঘণ্টা ব্যাটারি, JBL Pure Bass সাউন্ড।',
        descriptionBn:
          'বিশুদ্ধ JBL সাউন্ড, ওয়্যারলেসে। একবার চার্জে ৪০ ঘণ্টা পর্যন্ত ব্যাটারি লাইফ মানে বাকি সবকিছু থেমে যাওয়ার অনেক পরেও গান চলতে থাকে।',
```

**`sony-wh-1000xm5`:**
```ts
        nameBn: 'সনি WH-1000XM5',
        shortDescriptionBn: 'ইন্ডাস্ট্রি-লিডিং ANC, সারাদিনের আরাম, প্রিমিয়াম সাউন্ড।',
        descriptionBn:
          'ইন্ডাস্ট্রি-লিডিং নয়েজ ক্যান্সেলেশন এবং অসাধারণ সাউন্ড কোয়ালিটির মিশ্রণ। দুটি প্রসেসর ও আটটি মাইক্রোফোন একসাথে কাজ করে বাইরের জগৎ থেকে আপনাকে আলাদা করে।',
```

**`apple-airpods-pro-2`:**
```ts
        nameBn: 'অ্যাপল এয়ারপডস প্রো (২য় প্রজন্ম)',
        shortDescriptionBn: 'Adaptive Audio, 2x ANC, ব্যক্তিগতকৃত ফিট।',
        descriptionBn:
          'Adaptive Audio, সমৃদ্ধ সাউন্ড, এবং ২ গুণ বেশি Active Noise Cancellation। আপনার কানের জন্য ব্যক্তিগতকৃত, আরামদায়ক ও নিরাপদ ফিটের জন্য।',
```

**`jbl-flip-6-speaker`:**
```ts
        nameBn: 'জেবিএল ফ্লিপ ৬ স্পিকার',
        shortDescriptionBn: 'IP67 ওয়াটারপ্রুফ, বোল্ড সাউন্ড, পোর্টেবল ডিজাইন।',
        descriptionBn:
          'একটি রাগেড, IP67 ওয়াটারপ্রুফ ও ডাস্টপ্রুফ বডিতে বোল্ড JBL Original Pro Sound। ব্যাগে ভরুন, যেকোনো জায়গায় নিয়ে যান, ভলিউম বাড়িয়ে দিন।',
```

**`sony-wf-c700n-earbuds`:**
```ts
        nameBn: 'সনি WF-C700N ইয়ারবাডস',
        shortDescriptionBn: 'কমপ্যাক্ট ANC ইয়ারবাডস, হালকা, সারাদিনের আরাম।',
        descriptionBn:
          'কমপ্যাক্ট নয়েজ-ক্যান্সেলিং ইয়ারবাডস যা সাউন্ডে কোনো আপস করে না। সারাদিন শোনার জন্য হালকা আরাম, ঘরে বা বাইরে।',
```

**`apple-watch-series-9`:**
```ts
        nameBn: 'অ্যাপল ওয়াচ সিরিজ ৯',
        shortDescriptionBn: 'Double Tap জেসচার, উজ্জ্বল ডিসপ্লে, S9 চিপ।',
        descriptionBn:
          'স্ক্রিন স্পর্শ না করেই আপনার অ্যাপল ওয়াচ ব্যবহারের এক জাদুকরী নতুন উপায়, একটি উজ্জ্বল ডিসপ্লে, এবং এখন পর্যন্ত আমাদের সবচেয়ে শক্তিশালী চিপ।',
```

**`samsung-galaxy-watch-6`:**
```ts
        nameBn: 'স্যামসাং গ্যালাক্সি ওয়াচ ৬',
        shortDescriptionBn: 'বড় স্ক্রিন, স্লিপ কোচিং, আরামদায়ক সারাদিনের ফিট।',
        descriptionBn:
          'বড় স্ক্রিন এবং রোটেটিং বেজেল-অনুপ্রাণিত টাচ অভিজ্ঞতাসহ আরও স্লিক ডিজাইন। বিস্তারিত স্লিপ কোচিং আপনাকে ভালো ঘুমাতে সাহায্য করে।',
```

**`xiaomi-smart-band-8`:**
```ts
        nameBn: 'শাওমি স্মার্ট ব্যান্ড ৮',
        shortDescriptionBn: 'AMOLED ডিসপ্লে, ১৫০+ ওয়ার্কআউট মোড, ১৬-দিনের ব্যাটারি।',
        descriptionBn:
          'একটি স্লিম, হালকা ট্র্যাকার যাতে রয়েছে উজ্জ্বল AMOLED ডিসপ্লে, ১৫০+ ওয়ার্কআউট মোড, এবং একবার চার্জে ১৬ দিন পর্যন্ত ব্যাটারি লাইফ।',
```

**`google-pixel-watch-2`:**
```ts
        nameBn: 'গুগল পিক্সেল ওয়াচ ২',
        shortDescriptionBn: 'Fitbit স্বাস্থ্য ফিচার, সারাদিনের ব্যাটারি, ডোমড ডিজাইন।',
        descriptionBn:
          'সহায়ক ইনসাইট, সারাদিনের ব্যাটারি, এবং Fitbit-এর এখন পর্যন্ত সবচেয়ে উন্নত স্বাস্থ্য ফিচার, একটি সুন্দর ডোমড ডিজাইনে মোড়ানো।',
```

- [ ] **Step 3: Typecheck**

Run: `pnpm --filter @drikon/api typecheck`
Expected: no errors.

- [ ] **Step 4: Run against local dev database**

```bash
cd apps/api && pnpm db:seed
```

Expected: `✓ products (25)` (plus the existing users/categories/brands/reviews/orders lines) with no errors. This updates `nameBn`/`descriptionBn`/`shortDescriptionBn` on the 4 originally-seeded products and creates the other 21 fresh (they already exist locally from earlier this session, so this run only fills in their Bangla fields via the `update` clause).

- [ ] **Step 5: Live-verify locally**

Boot dev servers as in Task 4 Step 8. In `bn` locale, load `/products`, confirm product card names/short descriptions show Bangla for all 25 of these products. Open a PDP for one of them (e.g. `iphone-15-pro-titanium`) and confirm the name and full description render in Bangla. Switch to `en` and confirm the originals are unchanged. Stop the servers.

- [ ] **Step 6: Run against production**

```bash
cd apps/api && DATABASE_URL='<production connection string>' pnpm db:seed
```

Expected: same `✓ products (25)` line, no errors. (The seed's `NODE_ENV=production` guard is not triggered here since `NODE_ENV` isn't being set to `production` — only `DATABASE_URL` is overridden, exactly as done earlier this session.)

- [ ] **Step 7: Verify against the live production site**

Using Playwright against the production URL, confirm a few of these 25 products show Bangla name/description in `bn` locale on both the listing page and their PDP.

- [ ] **Step 8: Commit**

```bash
git add apps/api/prisma/seed.ts
git commit -m "feat(api): add Bangla translations for the 25 seeded products"
```

---

### Task 8: Product content — the 15 pre-existing robotics products

**Files:**
- Create (temporary, not committed): a one-off script, same pattern as Task 6.

**Interfaces:**
- Consumes: `PrismaClient`, the `Product.nameBn`/`descriptionBn`/`shortDescriptionBn` columns from Task 1. For `otto-bot` specifically, this task also writes the *missing English* `name`/`shortDescription`/`description` (currently Bangla-only) via the same script's `update` payload.

- [ ] **Step 1: Write the content script**

These 15 products are pre-existing production data, not in `seed.ts`. Write a script (e.g. `/tmp/.../scratchpad/add-bn-content-robotics-products.ts`) using this exact data, keyed by slug:

```ts
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const products: Record<
  string,
  { name?: string; shortDescription?: string; description?: string; nameBn: string; shortDescriptionBn: string; descriptionBn: string }
> = {
  'otto-bot': {
    // English versions did not exist before this task — Otto Bot was Bangla-only.
    name: 'Otto Bot',
    shortDescription: 'A programmable humanoid robot that can move, dance, and be controlled from an app.',
    description:
      "Want to start learning robotics and programming? Meet Otto Ninja — a smart, programmable humanoid robot! Program it yourself, control it wirelessly from an app, use Auto Explore mode, and get full video tutorials included. The perfect learning kit for school, college, and university students.",
    nameBn: 'অট্টো বট',
    shortDescriptionBn: 'একটি প্রোগ্রামযোগ্য রোবট যা নড়াচড়া করতে, নাচতে এবং রূপান্তরিত হতে পারে।',
    descriptionBn:
      'রোবোটিক্স ও প্রোগ্রামিং শেখা শুরু করতে চান? 🤖\nমিট অট্ট নিনজা —\nএকটি স্মার্ট প্রোগ্রামেবল হিউম্যানয়েড রোবট!\n✅ নিজে প্রোগ্রাম করা যায়\n✅ অ্যাপ দিয়ে ওয়্যারলেস কন্ট্রোল\n✅ অটো এক্সপ্লোর মোড\n✅ সম্পূর্ণ ভিডিও টিউটোরিয়াল Included\nস্কুল, কলেজ, ইউনিভার্সিটির স্টুডেন্টদের জন্য পারফেক্ট Learning Kit 🔥',
  },
  'arduino-uno-r3': {
    nameBn: 'আরডুইনো উনো R3',
    shortDescriptionBn: 'মেকারদের জন্য ক্লাসিক ATmega328P ডেভ বোর্ড।',
    descriptionBn:
      'আরডুইনো উনো R3 হলো ইলেকট্রনিক্স তৈরি শুরু করার সবচেয়ে জনপ্রিয় বোর্ড। ATmega328P মাইক্রোকন্ট্রোলার, ১৪টি ডিজিটাল I/O, ৬টি অ্যানালগ ইনপুট, USB প্রোগ্রামিং। রোবোটিক্স, সেন্সর এবং প্রোটোটাইপিংয়ের জন্য উপযুক্ত।',
  },
  'raspberry-pi-4-4gb': {
    nameBn: 'রাস্পবেরি পাই ৪ মডেল B (৪GB)',
    shortDescriptionBn: 'কোয়াড-কোর সিঙ্গেল-বোর্ড কম্পিউটার, ৪GB RAM।',
    descriptionBn:
      '৪GB RAM সহ রাস্পবেরি পাই ৪ মডেল B — ভিশন, AI এবং রোবোটিক্স প্রজেক্টের জন্য একটি সম্পূর্ণ লিনাক্স কম্পিউটার। ডুয়াল 4K HDMI, USB 3.0, গিগাবিট ইথারনেট, Wi-Fi এবং ব্লুটুথ।',
  },
  'esp32-devkit-v1': {
    nameBn: 'ESP32 ডেভকিট V1',
    shortDescriptionBn: 'IoT ও রোবোটিক্সের জন্য Wi-Fi + ব্লুটুথ MCU।',
    descriptionBn:
      'ESP32 ডেভকিট V1 — বিল্ট-ইন Wi-Fi ও ব্লুটুথসহ ডুয়াল-কোর 240MHz MCU। প্রচুর GPIO, ADC এবং PWM। সংযুক্ত গ্যাজেট ও রোবটের জন্য সেরা পছন্দের বোর্ড।',
  },
  'hc-sr04-ultrasonic': {
    nameBn: 'HC-SR04 আল্ট্রাসনিক সেন্সর',
    shortDescriptionBn: '২cm থেকে ৪০০cm পর্যন্ত দূরত্ব সেন্সিং।',
    descriptionBn:
      'HC-SR04 আল্ট্রাসনিক দূরত্ব সেন্সর — ±৩mm নির্ভুলতায় ২–৪০০cm পরিমাপ করে। রোবটের জন্য স্ট্যান্ডার্ড বাধা-এড়ানো সেন্সর।',
  },
  'mpu6050-imu': {
    nameBn: 'MPU-6050 ৬-অক্ষ IMU',
    shortDescriptionBn: '৩-অক্ষ জাইরো + ৩-অক্ষ অ্যাক্সিলারোমিটার।',
    descriptionBn:
      'MPU-6050 একটি ৩-অক্ষ জাইরোস্কোপ এবং ৩-অক্ষ অ্যাক্সিলারোমিটারকে I2C-এর মাধ্যমে একত্রিত করে — ব্যালেন্সিং রোবট, ড্রোন এবং মোশন ট্র্যাকিংয়ের জন্য।',
  },
  'oled-096-i2c': {
    nameBn: 'OLED ০.৯৬" I2C ডিসপ্লে',
    shortDescriptionBn: '১২৮×৬৪ মনোক্রোম OLED, I2C।',
    descriptionBn:
      '০.৯৬-ইঞ্চি ১২৮×৬৪ OLED ডিসপ্লে I2C ইন্টারফেসসহ — যেকোনো প্রজেক্টের জন্য স্বচ্ছ, কম-পাওয়ার রিডআউট। আরডুইনো ও ESP32-এর সাথে দারুণভাবে কাজ করে।',
  },
  'sg90-micro-servo': {
    nameBn: 'SG90 মাইক্রো সার্ভো',
    shortDescriptionBn: '৯g মাইক্রো সার্ভো, ১৮০° রোটেশন।',
    descriptionBn:
      'SG90 ৯g মাইক্রো সার্ভো — ১৮০° রোটেশন, প্লাস্টিক গিয়ার, রোবট আর্ম, প্যান-টিল্ট রিগ এবং ছোট মেকানিজমের জন্য উপযুক্ত।',
  },
  'nema-17-stepper': {
    nameBn: 'NEMA 17 স্টেপার মোটর',
    shortDescriptionBn: 'CNC ও 3D প্রিন্টারের জন্য ১.৮° স্টেপার।',
    descriptionBn:
      'NEMA 17 বাইপোলার স্টেপার মোটর — ১.৮° স্টেপ অ্যাঙ্গেল, উচ্চ টর্ক। 3D প্রিন্টার, CNC এবং নিখুঁত রোবোটিক্সের জন্য কর্মঠ সমাধান।',
  },
  'l298n-motor-driver': {
    nameBn: 'L298N মোটর ড্রাইভার',
    shortDescriptionBn: 'ডুয়াল H-ব্রিজ, ২টি DC মোটর চালান।',
    descriptionBn:
      'L298N ডুয়াল H-ব্রিজ মোটর ড্রাইভার — দুটি DC মোটর অথবা একটি স্টেপারের গতি ও দিক নিয়ন্ত্রণ করুন। রোবট গাড়ির জন্য অপরিহার্য।',
  },
  '4wd-robot-chassis': {
    nameBn: '৪WD রোবট কার চেসিস কিট',
    shortDescriptionBn: 'অ্যাক্রিলিক চেসিস + ৪টি মোটর ও চাকা।',
    descriptionBn:
      'সম্পূর্ণ ৪WD রোবট কার চেসিস কিট — অ্যাক্রিলিক ফ্রেম, চারটি গিয়ারড DC মোটর, চাকা এবং হার্ডওয়্যার। একটি কার্যকরী রোভার তৈরির দ্রুততম উপায়।',
  },
  'dji-tello-drone': {
    nameBn: 'DJI Tello মিনি ড্রোন',
    shortDescriptionBn: 'প্রোগ্রামযোগ্য মিনি ড্রোন, ৭২০p ক্যামেরা।',
    descriptionBn:
      'DJI Tello — ৭২০p ক্যামেরা এবং Scratch/Python SDK সহ একটি হালকা প্রোগ্রামযোগ্য ড্রোন। ফ্লাইট, ভিশন এবং অটোনমি শিখুন।',
  },
  '18650-liion-battery': {
    nameBn: '১৮৬৫০ লিথিয়াম-আয়ন ব্যাটারি (৩.৭V)',
    shortDescriptionBn: 'রিচার্জেবল ৩.৭V সেল, ২৬০০mAh।',
    descriptionBn:
      '১৮৬৫০ রিচার্জেবল লিথিয়াম-আয়ন সেল — ৩.৭V, ২৬০০mAh। আপনার রোবট, ড্রোন এবং পোর্টেবল গ্যাজেটকে শক্তি দিন।',
  },
  'breadboard-jumper-kit': {
    nameBn: 'ব্রেডবোর্ড ৮৩০ + জাম্পার ওয়্যার',
    shortDescriptionBn: '৮৩০-পয়েন্ট ব্রেডবোর্ড + ৬৫টি জাম্পার।',
    descriptionBn:
      'সোল্ডারলেস ৮৩০-পয়েন্ট ব্রেডবোর্ড, সাথে ৬৫টি নমনীয় জাম্পার ওয়্যার — কোনো সোল্ডারিং ছাড়াই মিনিটে সার্কিট প্রোটোটাইপ করুন।',
  },
  'rpi-camera-module-3': {
    nameBn: 'রাস্পবেরি পাই ক্যামেরা মডিউল ৩',
    shortDescriptionBn: 'পাই-এর জন্য ১২MP অটোফোকাস ক্যামেরা।',
    descriptionBn:
      'রাস্পবেরি পাই ক্যামেরা মডিউল ৩ — অটোফোকাস ও HDR সহ ১২MP Sony IMX708 সেন্সর। কম্পিউটার ভিশন, সার্ভেইল্যান্স এবং ফটোগ্রাফি প্রজেক্টের জন্য।',
  },
};

async function main() {
  for (const [slug, data] of Object.entries(products)) {
    const result = await prisma.product.updateMany({ where: { slug }, data });
    console.log(result.count > 0 ? `✓ ${slug}` : `✗ NOT FOUND: ${slug}`);
  }
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
```

- [ ] **Step 2: Run against local dev database**

```bash
cd apps/api && npx tsx /path/to/scratchpad/add-bn-content-robotics-products.ts
```

Expected: 15 `✓` lines. (Note: these 15 products only exist in the **production** database — they were never part of `seed.ts` and are not present locally. If all 15 print `✗ NOT FOUND` locally, that confirms this and Step 3 below should be skipped; go directly to Step 4 against production. If a local dev database happens to have them — e.g. from a prior production data copy — verify normally.)

- [ ] **Step 3: Live-verify locally (only if the products exist in the local database)**

If Step 2 found the products locally, boot dev servers as in Task 4 Step 8 and spot-check 2-3 of these products in `bn` locale on both listing and PDP. Otherwise skip to Step 4.

- [ ] **Step 4: Run against production**

```bash
cd apps/api && DATABASE_URL='<production connection string>' npx tsx /path/to/scratchpad/add-bn-content-robotics-products.ts
```

Expected: 15 `✓` lines, zero `NOT FOUND`.

- [ ] **Step 5: Verify against the live production site**

Using Playwright against the production URL:
- Load the Otto Bot PDP (`/products/otto-bot`) in `en` locale — confirm it now shows the new English name/description instead of falling back to Bangla text in an English-locale page (this is the one product where English was previously *missing entirely*, so this specifically confirms Step 1's English backfill worked).
- Load the same PDP in `bn` locale — confirm the (unchanged) original Bangla description still renders.
- Spot-check 2-3 other robotics products (e.g. `arduino-uno-r3`, `raspberry-pi-4-4gb`) in `bn` locale on both listing and PDP.

(No commit for this task — one-off production data script, same as Task 6.)

---

### Task 9: Admin EN/BN content tabs

**Files:**
- Modify: `apps/web/src/components/admin/product-form.tsx`
- Modify: `apps/web/src/app/(admin)/admin/products/[id]/edit/page.tsx`
- Modify: `apps/web/src/app/(admin)/admin/categories/page.tsx`
- Modify: `apps/web/src/app/(admin)/admin/banners/page.tsx`

**Interfaces:**
- Consumes: nothing new from other tasks.
- Produces: nothing consumed by later tasks — this is the final content-editing surface.

- [ ] **Step 1: `ProductForm` — add EN/BN tabs**

In `apps/web/src/components/admin/product-form.tsx`, add a language-tab state and three new fields to `ProductFormState`:

```ts
interface ProductFormState {
  name: string;
  nameBn: string;
  slug: string;
  description: string;
  descriptionBn: string;
  shortDescription: string;
  shortDescriptionBn: string;
  // ...rest unchanged
}
```

Add `nameBn: '', descriptionBn: '', shortDescriptionBn: ''` to `emptyState`. Add a `const [lang, setLang] = useState<'en' | 'bn'>('en');` near the other `useState` calls. In `ProductPayload`, add the three optional Bangla fields, and in `onSubmit`, add:

```ts
      if (state.nameBn.trim()) payload.nameBn = state.nameBn.trim();
      if (state.descriptionBn.trim()) payload.descriptionBn = state.descriptionBn.trim();
      if (state.shortDescriptionBn.trim()) payload.shortDescriptionBn = state.shortDescriptionBn.trim();
```

Add a simple tab control immediately above the Name/Slug grid:

```tsx
      <div className="flex gap-2 border-b border-[color:var(--border)] pb-3">
        <button
          type="button"
          onClick={() => setLang('en')}
          className={`px-3 py-1.5 rounded-lg text-sm font-medium ${lang === 'en' ? 'bg-[color:var(--accent)] text-white' : 'text-[color:var(--fg-muted)] hover:bg-[color:var(--bg-soft)]'}`}
        >
          English
        </button>
        <button
          type="button"
          onClick={() => setLang('bn')}
          className={`px-3 py-1.5 rounded-lg text-sm font-medium ${lang === 'bn' ? 'bg-[color:var(--accent)] text-white' : 'text-[color:var(--fg-muted)] hover:bg-[color:var(--bg-soft)]'}`}
        >
          বাংলা
        </button>
      </div>
```

Then wrap the Name field, Short description field, and Full description field each in a conditional showing the EN input when `lang === 'en'` and the BN input when `lang === 'bn'`, e.g. for Name:

```tsx
        {lang === 'en' ? (
          <Field label="Name" required>
            <input type="text" value={state.name} onChange={(e) => update('name', e.target.value)} required className="input" />
          </Field>
        ) : (
          <Field label="নাম (বাংলা)">
            <input type="text" value={state.nameBn} onChange={(e) => update('nameBn', e.target.value)} className="input" />
          </Field>
        )}
```

Apply the same `lang === 'en' ? ... : ...` pattern to the Short description and Full description fields, using `state.shortDescriptionBn`/`update('shortDescriptionBn', ...)` and `state.descriptionBn`/`update('descriptionBn', ...)` for the Bangla side, with labels `"সংক্ষিপ্ত বিবরণ (বাংলা)"` and `"সম্পূর্ণ বিবরণ (বাংলা)"`. All non-translatable fields (SKU, price, stock, category, brand, image, video, active/featured) stay outside the tab conditional, visible regardless of which language tab is selected, since they aren't duplicated per language.

- [ ] **Step 2: Pass the Bangla fields through in the edit page**

In `apps/web/src/app/(admin)/admin/products/[id]/edit/page.tsx`, add to `AdminProductDetail`:

```ts
  nameBn?: string | null;
  descriptionBn?: string | null;
  shortDescriptionBn?: string | null;
```

And add to the `initial={{ ... }}` object passed to `<ProductForm>`:

```tsx
          nameBn: product.nameBn ?? '',
          descriptionBn: product.descriptionBn ?? '',
          shortDescriptionBn: product.shortDescriptionBn ?? '',
```

- [ ] **Step 3: Category admin — add Bangla fields**

In `apps/web/src/app/(admin)/admin/categories/page.tsx`, add `nameBn: string; descriptionBn: string` to the `Draft` type and `EMPTY` constant, add the two fields to the save payload the same way `name`/`description` are added (trimmed, only included if non-empty for `descriptionBn` matching the existing optional-field pattern), and add two more inputs to the form — a Bangla name input and a Bangla description textarea — placed directly below the existing English name/description inputs with labels `"নাম (বাংলা)"` and `"বিবরণ (বাংলা, ঐচ্ছিক)"`. No tab needed here since the form is already short; both languages' fields are simply visible together, consistent with this form's existing compact single-panel style (confirm this fits by reading the current form's full layout before adding — if it feels crowded, use the same tab pattern as `ProductForm` instead).

- [ ] **Step 4: Banner admin — add Bangla fields**

In `apps/web/src/app/(admin)/admin/banners/page.tsx`, apply the identical treatment as categories: add `headingBn: string; subheadingBn: string` to the draft type, wire them into the save payload, and add a Bangla heading input + Bangla subheading textarea below the existing English ones, labeled `"হেডিং (বাংলা)"` and `"সাবহেডিং (বাংলা, ঐচ্ছিক)"`.

- [ ] **Step 5: Typecheck, lint, build**

Run: `pnpm --filter web typecheck && pnpm --filter web lint && pnpm --filter web build`
Expected: all clean.

- [ ] **Step 6: Live-verify**

Boot dev servers as in Task 4 Step 8. Sign in as admin (`admin@drikon.com` / the seed's admin password). Open a product's edit page, confirm the EN/BN tabs show the already-seeded Bangla values from Task 7 correctly, edit the Bangla name, save, and confirm the change is reflected both in the admin form on reload and on the storefront PDP in `bn` locale. Repeat a lighter check for a category and a banner (confirm the Bangla fields show existing Task 6 content and can be edited/saved). Stop the servers.

- [ ] **Step 7: Commit**

```bash
git add apps/web/src/components/admin/product-form.tsx "apps/web/src/app/(admin)/admin/products/[id]/edit/page.tsx" \
  apps/web/src/app/\(admin\)/admin/categories/page.tsx apps/web/src/app/\(admin\)/admin/banners/page.tsx
git commit -m "feat(web): add Bangla content fields to admin product/category/banner forms"
```

---

### Task 10: Full-site end-to-end verification

**Files:** none (verification only; fix forward in the relevant file from Tasks 1-9 if something's broken).

- [ ] **Step 1: Full typecheck, lint, build, tests**

```bash
pnpm --filter web typecheck
pnpm --filter web lint
pnpm --filter web build
pnpm --filter web test
pnpm --filter @drikon/api typecheck
pnpm --filter @drikon/api test
```

Expected: all clean, all passing — no regressions across either app.

- [ ] **Step 2: Full bilingual walkthrough**

Boot both dev servers as in Task 4 Step 8. Using Playwright, in both `en` and `bn` locales:
1. Load `/` — confirm hero slider (all 4 slides), "Shop by category" tiles, and featured products all show correctly localized text, and the language switcher toggles between them without a full page reload.
2. Load `/products` and `/products?search=iphone` — confirm category chips and product cards are localized; confirm a Bangla-script search (e.g. searching `আইফোন`) returns the right products (proves Task 3's search extension works end-to-end, not just at the unit-test level).
3. Load a standard-template PDP for a Task 7 product and one for a Task 8 product (e.g. `iphone-15-pro-titanium` and `arduino-uno-r3`) — confirm name/description are localized.
4. Load `/about`, `/contact`, `/terms`, `/privacy`, `/shipping-returns` — confirm full localization.
5. Confirm, in both languages, that a product with no Bangla translation (there shouldn't be any left after Tasks 7-8, but re-run this check regardless) falls back to English cleanly rather than showing blank text — this is really a regression check on the `localize()` fallback itself.
6. Sign in as admin, confirm `/admin/products`, `/admin/categories`, `/admin/banners`, and the rest of the admin UI chrome remain fully English regardless of the storefront's locale cookie (per the Global Constraint).

Stop the servers.

- [ ] **Step 3: Fix forward or finish**

If anything above failed, fix it in the relevant file from Tasks 1-9 and re-run the affected verification step. Once everything passes, this task needs no separate commit (nothing changes unless a fix was needed).
