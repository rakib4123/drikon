# Bangla/English Storefront i18n — Phase 1 Design Spec

**Date:** 2026-08-20
**Status:** Approved for planning
**Driver:** Drikon targets Bangladesh (bKash payments, ৳ pricing, Dhaka-based shipping copy already exist) but the entire storefront UI is hardcoded English today. This is the largest of three feature ideas pulled from a comparison against a reference app (Bazar Hisab), whose own bilingual UI support was identified as a real, currently-missing capability for a Bangladesh-targeted store. Given the real scale involved (roughly 18 customer-facing routes, hundreds of hardcoded strings), this ships as a phased effort — this spec covers **Phase 1 only**: the i18n infrastructure plus the highest-traffic surfaces (nav, homepage, product listing, PDP chrome).

## Goal

Let a customer switch the storefront between English and Bangla via a nav toggle, with the choice remembered across visits, starting with the pages/components most visitors actually see.

## Non-goals

- **Admin panel** (`apps/web/src/app/(admin)/`) stays English-only. Staff running the store are the audience; translating internal tooling is not worth the effort here.
- **Product names/descriptions are not translated.** They stay exactly as the admin entered them, same as today. Only developer-owned UI chrome (buttons, labels, headings, messages) is translated.
- **Admin-editable settings-driven copy is not translated either** — the homepage hero title/subtitle/CTA labels, feature-strip text, editorial CTA, footer note, etc. (everything returned by `resolveContent()` in `apps/web/src/lib/content.ts`) is single-language, whatever the admin typed. Same reasoning as product content: it's admin-authored, not developer-owned, and dual-language content-authoring is out of scope.
- **No URL-based locale routing** (no `/bn/products`-style paths). Every page keeps its current URL regardless of language — simpler, no restructuring of the `app/` directory, at the cost of each language not getting its own indexable/shareable URL. A future spec could revisit this if SEO-per-language becomes a priority.
- **No browser-language auto-detection.** Every first-time visitor sees English by default; Bangla is opt-in via the toggle. Purely additive — zero risk of surprising an existing visitor's experience.
- **Phases 2-4 are out of scope for this spec**, to be scoped separately once Phase 1 ships and the pattern is proven: cart/checkout (highest string density, highest business value), account pages + auth, and the long-form static pages (About/Contact/Terms/Privacy/Shipping-Returns).
- **Translation quality**: the Bangla text in `bn.json` is AI-generated (by this implementation), not sourced from a certified translator. Competent and natural, but a native-speaker review before Phase 1 reaches real customers is recommended, called out again in Testing below.

## Architecture

**Library:** `next-intl`, added as a new `apps/web` dependency. Chosen over a hand-rolled dictionary because of the real scale here (interpolated/pluralized strings like "Added 2 × iPhone Case to cart" need to be handled correctly across dozens of components) and because it has a documented, supported mode for exactly this shape — cookie-based locale, no URL routing.

**Config wiring:**
- `apps/web/next.config.mjs` — wrap the existing config export with `createNextIntlPlugin()` from `next-intl/plugin` (one-line change, no other config behavior affected).
- `apps/web/src/i18n/request.ts` (new) — a `getRequestConfig` callback: reads the `NEXT_LOCALE` cookie via `next/headers`'s `cookies()`, defaults to `'en'` if unset or invalid, and returns `{ locale, messages: (await import(`../messages/${locale}.json`)).default }`.
- `apps/web/src/messages/en.json`, `apps/web/src/messages/bn.json` (new) — the translation dictionaries. Namespaced by feature area as top-level keys (`common`, `nav`, `home`, `products`, `pdp`, `footer`), not one flat list — keeps each file navigable as it grows across future phases.
- `apps/web/src/app/layout.tsx` — wrap the existing `<Providers>` tree in `<NextIntlClientProvider>` (from `next-intl`), passing the resolved `locale`/`messages` from `getLocale()`/`getMessages()` (both from `next-intl/server`). This is what makes `useTranslations()` work in Client Components — without it, only Server Components could translate.

**Reading translations:**
- Server Components: `const t = await getTranslations('namespace')` (from `next-intl/server`), then `t('key')`.
- Client Components (anything already `'use client'`, e.g. `SearchCommand`, `AddToCart`): `const t = useTranslations('namespace')` (from `next-intl`), then `t('key')`. No new `'use client'` boundaries are introduced by this — a component that's already a Server Component today stays one; only its string calls change.

## Language switching

New client component, `apps/web/src/components/layout/language-switcher.tsx` — a small "EN / বাংলা" toggle, placed in `Navbar` (or `TopBar`, exact placement decided at plan-writing time by looking at available nav real estate). On click:
1. Calls a Server Action (`apps/web/src/lib/set-locale.ts` or colocated in the switcher file) that sets the `NEXT_LOCALE` cookie (`httpOnly: false` — the client doesn't need to read it, but keeping it non-httpOnly costs nothing and matches next-intl's own convention) to `'en'` or `'bn'`.
2. Calls `router.refresh()` so every Server Component on the current page re-renders server-side with the new locale immediately — no full page reload, no client-side-only flash of the old language.

This is the standard next-intl "without i18n routing" pattern, not a custom mechanism.

**Why a cookie, not `localStorage`** (matching every other client preference in this codebase — cart/wishlist/compare all use Zustand + `localStorage`): several Phase 1 pages (homepage, PDP, product listing) are Server Components that fetch and render on the server. `localStorage` isn't readable during server rendering, so a localStorage-based preference would force either an English-then-Bangla flash on every load, or force those pages to become Client Components (losing server-side data fetching). A cookie is readable server-side via `next/headers`, avoiding both problems. This is a deliberate, justified deviation from the localStorage convention, not an oversight.

## Phase 1 scope — exact surfaces

Infrastructure (above) plus these files get their hardcoded strings converted to translation calls:
- `apps/web/src/components/layout/navbar.tsx`, `footer.tsx`, `top-bar.tsx`
- `apps/web/src/components/shop/search-command.tsx` — UI strings only ("Search products…", "Type at least 2 characters…", "No products match…", voice-search toasts); never product names in the results list.
- `apps/web/src/app/page.tsx` — the homepage's own hardcoded strings ("Trending devices", "Shop all", "Featured devices", empty states). Settings-driven sections (hero, editorial CTA, deals banner) are skipped per Non-goals.
- `apps/web/src/components/shop/brand-strip.tsx`, `stats-band.tsx` — hardcoded section labels.
- `apps/web/src/components/shop/product-grid.tsx`, `product-card.tsx` — UI chrome only (e.g. "Add to cart" hover affordance, stock badges) — never the product's own name/price formatting logic.
- `apps/web/src/app/(shop)/products/page.tsx` — filter/sort control labels, empty-state copy.
- `apps/web/src/app/(shop)/products/[slug]/page.tsx` and `apps/web/src/components/shop/add-to-cart.tsx` — static PDP chrome: breadcrumb ("Shop"), section headings ("Description", "Specifications", "Reviews"), stock messages, Add to Cart button — never `product.name`/`product.description`/`product.attributes`.

The premium PDP template (`premium-product-page.tsx`) and the reviews component are explicitly **not** in Phase 1 — deferred to a later phase to keep this round's surface area contained to the single standard template.

## Translation content strategy

Both `en.json` (extracted verbatim from the current hardcoded strings — the English UI shouldn't change wording, only become translatable) and `bn.json` (newly written) are authored directly in this implementation. No admin UI for editing translations — these are developer-owned static strings, versioned in git like any other code, consistent with how this codebase already treats copy that isn't explicitly meant to be admin-editable.

## Testing

No existing e2e framework (consistent with the rest of this codebase). Verification is: `pnpm typecheck`/`pnpm lint` clean, then a live boot with Playwright — toggle the language switcher, confirm the cookie is set, confirm `router.refresh()` re-renders the affected Server Components in Bangla, spot-check that product names/prices/admin-authored copy remain untouched (proving the Non-goals boundary actually held in the implementation, not just in the spec). Given the translation-quality caveat above, the live-verification pass should include a plain-language readback of a few `bn.json` strings in the final report, so a native speaker can be pointed at specific lines to review before this reaches production.
