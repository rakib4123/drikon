# Bangla/English Storefront i18n — Phase 1 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Let a customer switch the storefront between English and Bangla via a nav toggle, remembered across visits, for the highest-traffic surfaces (nav, homepage, product listing, PDP chrome).

**Architecture:** `next-intl` in cookie-based "without routing" mode — a `NEXT_LOCALE` cookie (set via a Server Action, read via `next/headers`) determines which `messages/{locale}.json` dictionary loads per request. Server Components translate via `getTranslations()`, Client Components via `useTranslations()`. No URL changes, no new route segments.

**Tech Stack:** Next.js 15 App Router, React 19, `next-intl` (new dependency), Tailwind v4.

**Spec:** [docs/superpowers/specs/2026-08-20-bangla-i18n-phase-1-design.md](../specs/2026-08-20-bangla-i18n-phase-1-design.md)

## Global Constraints

- Admin panel (`apps/web/src/app/(admin)/`) is never touched — stays English-only.
- Product names/descriptions and anything from `resolveContent(settings)` (hero, CTAs, feature strip, footer note, etc.) are never wrapped in translation calls — they stay exactly as the admin entered them.
- No URL-based locale routing (no `/bn/...` paths) and no browser-language auto-detection — English is always the default for a visitor with no `NEXT_LOCALE` cookie yet.
- Every string moved into `messages/en.json` must have the *exact same English wording* it had hardcoded before — this is a mechanical extraction, not a copy rewrite.
- Message keys are namespaced by feature area (`common`, `nav`, `search`, `home`, `products`, `product`, `pdp`) — never one flat list.
- `en.json` and `bn.json` must stay structurally identical (same keys, same nesting) after every task — a key in one without the other is a bug.

---

## File Structure

- `apps/web/src/i18n/request.ts` (new) — `getRequestConfig`, reads the `NEXT_LOCALE` cookie, loads the matching message file.
- `apps/web/src/messages/en.json`, `apps/web/src/messages/bn.json` (new) — translation dictionaries, built up incrementally task by task.
- `apps/web/src/lib/set-locale.ts` (new) — the Server Action that sets the cookie.
- `apps/web/src/components/layout/language-switcher.tsx` (new) — the nav toggle.
- `apps/web/next.config.mjs` (modify) — wrap with `createNextIntlPlugin()`.
- `apps/web/src/app/layout.tsx` (modify) — `NextIntlClientProvider`, dynamic `lang` attribute, translated skip-link.
- `apps/web/src/components/layout/navbar.tsx`, `top-bar.tsx`, `footer.tsx` (modify) — `nav` namespace + switcher placement.
- `apps/web/src/components/shop/search-command.tsx` (modify) — `search` namespace (short strings only — see Task 4).
- `apps/web/src/app/page.tsx`, `apps/web/src/components/shop/brand-strip.tsx`, `stats-band.tsx` (modify) — `home` namespace.
- `apps/web/src/components/shop/product-card.tsx`, `add-to-cart.tsx` (modify) — `product` namespace. (`product-grid.tsx`, named in the spec's Phase 1 scope, turns out on inspection to have zero hardcoded strings of its own — it only composes `ProductCard` with a stagger animation. No task touches it; this is a deliberate no-op, not a gap.)
- `apps/web/src/app/(shop)/products/page.tsx` (modify) — `products` namespace.
- `apps/web/src/app/(shop)/products/[slug]/page.tsx` (modify) — `pdp` namespace.

---

### Task 1: next-intl infrastructure + root layout

**Files:**
- Create: `apps/web/src/i18n/request.ts`
- Create: `apps/web/src/messages/en.json`
- Create: `apps/web/src/messages/bn.json`
- Modify: `apps/web/next.config.mjs`
- Modify: `apps/web/src/app/layout.tsx`

**Interfaces:**
- Produces: the `messages/*.json` files (with a `common` namespace containing `skipToContent`) that every later task adds its own namespace to. The `NEXT_LOCALE` cookie name and `'en' | 'bn'` locale union, reused by Task 2's Server Action.

- [ ] **Step 1: Install the dependency**

Run: `pnpm --filter web add next-intl`
Expected: `apps/web/package.json` gains a `next-intl` entry under `dependencies`.

- [ ] **Step 2: Create the message dictionaries**

Create `apps/web/src/messages/en.json`:

```json
{
  "common": {
    "skipToContent": "Skip to content"
  }
}
```

Create `apps/web/src/messages/bn.json`:

```json
{
  "common": {
    "skipToContent": "মূল কনটেন্টে যান"
  }
}
```

- [ ] **Step 3: Create the request config**

Create `apps/web/src/i18n/request.ts`:

```ts
import { getRequestConfig } from 'next-intl/server';
import { cookies } from 'next/headers';

export const SUPPORTED_LOCALES = ['en', 'bn'] as const;
export type Locale = (typeof SUPPORTED_LOCALES)[number];
export const DEFAULT_LOCALE: Locale = 'en';
export const LOCALE_COOKIE = 'NEXT_LOCALE';

function resolveLocale(raw: string | undefined): Locale {
  return (SUPPORTED_LOCALES as readonly string[]).includes(raw ?? '') ? (raw as Locale) : DEFAULT_LOCALE;
}

export default getRequestConfig(async () => {
  const cookieStore = await cookies();
  const locale = resolveLocale(cookieStore.get(LOCALE_COOKIE)?.value);

  return {
    locale,
    messages: (await import(`../messages/${locale}.json`)).default,
  };
});
```

- [ ] **Step 4: Wire the Next.js plugin**

Modify `apps/web/next.config.mjs` — add the import at the top and wrap the default export:

```js
import createNextIntlPlugin from 'next-intl/plugin';
```

```js
const withNextIntl = createNextIntlPlugin('./src/i18n/request.ts');

export default withNextIntl(nextConfig);
```
(Replace the existing `export default nextConfig;` line with the two lines above.)

- [ ] **Step 5: Wrap the root layout**

Modify `apps/web/src/app/layout.tsx`. Add imports:

```tsx
import { NextIntlClientProvider } from 'next-intl';
import { getLocale, getMessages, getTranslations } from 'next-intl/server';
```

In `RootLayout`, alongside the existing `Promise.all([getSettings(), getCategories()])` call, also resolve the locale/messages/translator:

```tsx
  const [s, categories] = await Promise.all([getSettings(), getCategories()]);
  const [locale, messages, t] = await Promise.all([getLocale(), getMessages(), getTranslations('common')]);
```

Change `<html lang="en" suppressHydrationWarning>` to:

```tsx
    <html lang={locale} suppressHydrationWarning>
```

Change the skip-link text from the hardcoded `Skip to content` to `{t('skipToContent')}`:

```tsx
        <a
          href="#main"
          className="sr-only focus:not-sr-only focus:fixed focus:top-3 focus:left-3 focus:z-[100] focus:px-4 focus:py-2 focus:rounded-lg focus:bg-[color:var(--accent)] focus:text-white focus:font-medium"
        >
          {t('skipToContent')}
        </a>
```

Wrap the existing `<Providers settings={s}>...</Providers>` block in `<NextIntlClientProvider>`:

```tsx
        <NextIntlClientProvider locale={locale} messages={messages}>
          <Providers settings={s}>
            <TopBar supportEmail={s.supportEmail} facebook={s.socialFacebook} instagram={s.socialInstagram} promo={content.topbarPromo} />
            <Navbar brand={brand} categories={categories} />
            <main id="main" className="flex-1">{children}</main>
            <Footer brand={brand} categories={categories} note={content.footerNote} />
            <CompareTray />
          </Providers>
        </NextIntlClientProvider>
```

- [ ] **Step 6: Typecheck**

Run: `pnpm --filter web typecheck`
Expected: no errors.

- [ ] **Step 7: Live-verify**

```bash
lsof -ti :3000 | xargs -r kill -9
pnpm --filter web dev &
```
Wait for "Ready", then:
```bash
curl -s http://localhost:3000 | grep -o '<html lang="[^"]*"'
```
Expected: `<html lang="en"` (no cookie set yet, defaults to English).
```bash
curl -s -H "Cookie: NEXT_LOCALE=bn" http://localhost:3000 | grep -o '<html lang="[^"]*"'
```
Expected: `<html lang="bn"`.
Stop the server: `lsof -ti :3000 | xargs -r kill -9`

- [ ] **Step 8: Commit**

```bash
git add apps/web/package.json apps/web/pnpm-lock.yaml apps/web/next.config.mjs apps/web/src/i18n apps/web/src/messages apps/web/src/app/layout.tsx
git commit -m "feat(web): add next-intl infrastructure (cookie-based, no URL routing)"
```

---

### Task 2: Language switcher

**Files:**
- Create: `apps/web/src/lib/set-locale.ts`
- Create: `apps/web/src/components/layout/language-switcher.tsx`
- Modify: `apps/web/src/components/layout/navbar.tsx`

**Interfaces:**
- Consumes: `Locale`, `SUPPORTED_LOCALES`, `LOCALE_COOKIE` from `apps/web/src/i18n/request.ts` (Task 1).
- Produces: `<LanguageSwitcher />`, a self-contained client component with no props, usable from `Navbar` and (in later phases) anywhere else in the tree.

- [ ] **Step 1: Create the Server Action**

Create `apps/web/src/lib/set-locale.ts`:

```ts
'use server';

import { cookies } from 'next/headers';
import { LOCALE_COOKIE, type Locale } from '@/i18n/request';

const ONE_YEAR_SECONDS = 60 * 60 * 24 * 365;

export async function setLocale(locale: Locale) {
  const cookieStore = await cookies();
  cookieStore.set(LOCALE_COOKIE, locale, { maxAge: ONE_YEAR_SECONDS, path: '/' });
}
```

- [ ] **Step 2: Create the switcher component**

Create `apps/web/src/components/layout/language-switcher.tsx`:

```tsx
'use client';

import { useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { useLocale } from 'next-intl';
import { setLocale } from '@/lib/set-locale';
import type { Locale } from '@/i18n/request';

export function LanguageSwitcher() {
  const locale = useLocale() as Locale;
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  const toggle = () => {
    const next: Locale = locale === 'en' ? 'bn' : 'en';
    startTransition(async () => {
      await setLocale(next);
      router.refresh();
    });
  };

  return (
    <button
      type="button"
      onClick={toggle}
      disabled={isPending}
      aria-label={locale === 'en' ? 'বাংলায় দেখুন' : 'View in English'}
      className="px-2.5 py-1.5 rounded-lg text-xs font-medium text-[color:var(--fg-muted)] hover:bg-[color:var(--bg-soft)] hover:text-[color:var(--fg)] transition-colors disabled:opacity-50"
    >
      {locale === 'en' ? 'বাংলা' : 'EN'}
    </button>
  );
}
```

(The button's own label is deliberately the *other* language's name, not the current one — "বাংলা" invites switching to Bangla, matching how language switchers conventionally work. Language names themselves are never translated — "EN" and "বাংলা" are the same regardless of which is currently active.)

- [ ] **Step 3: Place it in the navbar**

Modify `apps/web/src/components/layout/navbar.tsx` — add the import:

```tsx
import { LanguageSwitcher } from '@/components/layout/language-switcher';
```

Add `<LanguageSwitcher />` as the first child of the icon cluster, right before `<SearchCommand />`:

```tsx
        <div className="flex items-center gap-2">
          <LanguageSwitcher />
          <SearchCommand />
```

- [ ] **Step 4: Typecheck**

Run: `pnpm --filter web typecheck`
Expected: no errors.

- [ ] **Step 5: Live-verify**

```bash
lsof -ti :3000 | xargs -r kill -9
pnpm --filter web dev &
```
Wait for "Ready", then open `http://localhost:3000` in a browser (or via Playwright): click the "বাংলা" button in the nav, confirm the page reloads (via `router.refresh()`, no full navigation) and the button now reads "EN". Reload the page manually (F5) — confirm it stays on Bangla (cookie persisted).
Stop the server: `lsof -ti :3000 | xargs -r kill -9`

- [ ] **Step 6: Commit**

```bash
git add apps/web/src/lib/set-locale.ts apps/web/src/components/layout/language-switcher.tsx apps/web/src/components/layout/navbar.tsx
git commit -m "feat(web): add EN/Bangla language switcher to the navbar"
```

---

### Task 3: Translate nav chrome (Navbar, TopBar, Footer)

**Files:**
- Modify: `apps/web/src/messages/en.json`, `apps/web/src/messages/bn.json`
- Modify: `apps/web/src/components/layout/navbar.tsx`, `top-bar.tsx`, `footer.tsx`

**Interfaces:**
- Produces: the `nav` namespace, consumed by no later task directly (each task's namespace is independent) but establishes the pattern (Client Component `useTranslations`, Server Component `getTranslations`) every subsequent task repeats.

- [ ] **Step 1: Add the `nav` namespace**

Add to `apps/web/src/messages/en.json` (as a new top-level key alongside `common`):

```json
  "nav": {
    "featured": "Featured",
    "allProducts": "All products",
    "admin": "Admin",
    "wishlist": "Wishlist",
    "cart": "Cart",
    "signIn": "Sign in",
    "getStarted": "Get started",
    "trackOrder": "Track order",
    "shop": "Shop",
    "company": "Company",
    "legal": "Legal",
    "shippingReturns": "Shipping & Returns",
    "termsOfService": "Terms of Service",
    "privacyPolicy": "Privacy Policy",
    "about": "About",
    "contact": "Contact",
    "allRightsReserved": "All rights reserved."
  }
```

Add to `apps/web/src/messages/bn.json`:

```json
  "nav": {
    "featured": "ফিচার্ড",
    "allProducts": "সকল পণ্য",
    "admin": "অ্যাডমিন",
    "wishlist": "ইচ্ছেতালিকা",
    "cart": "কার্ট",
    "signIn": "সাইন ইন",
    "getStarted": "শুরু করুন",
    "trackOrder": "অর্ডার ট্র্যাক করুন",
    "shop": "শপ",
    "company": "কোম্পানি",
    "legal": "আইনি তথ্য",
    "shippingReturns": "শিপিং ও রিটার্ন",
    "termsOfService": "ব্যবহারের শর্তাবলী",
    "privacyPolicy": "গোপনীয়তা নীতি",
    "about": "আমাদের সম্পর্কে",
    "contact": "যোগাযোগ",
    "allRightsReserved": "সর্বস্বত্ব সংরক্ষিত।"
  }
```

- [ ] **Step 2: Translate `Navbar`**

Modify `apps/web/src/components/layout/navbar.tsx`. Add the import:

```tsx
import { useTranslations } from 'next-intl';
```

Inside `Navbar`, add: `const t = useTranslations('nav');`

Replace the hardcoded strings:

```tsx
          <Link href="/showcase" className="hover:text-[color:var(--accent)] transition-colors">
            {t('featured')}
          </Link>
          <Link href="/products" className="hover:text-[color:var(--accent)] transition-colors">
            {t('allProducts')}
          </Link>
          {isAdmin && (
            <Link href="/admin" className="text-[color:var(--accent)] hover:underline transition-colors">
              {t('admin')}
            </Link>
          )}
```

```tsx
          <Link
            href="/wishlist"
            aria-label={t('wishlist')}
            className="p-2 rounded-lg hover:bg-[color:var(--bg-soft)] transition-colors relative hidden sm:inline-flex"
          >
```

```tsx
          <Link
            href="/cart"
            aria-label={t('cart')}
            className="p-2 rounded-lg hover:bg-[color:var(--bg-soft)] transition-colors relative"
          >
```

```tsx
            <div className="hidden sm:flex items-center gap-2">
              <Link href="/login" className="btn-ghost text-sm py-2 px-3">
                {t('signIn')}
              </Link>
              <Link href="/register" className="btn-primary text-sm py-2 px-3">
                {t('getStarted')}
              </Link>
            </div>
```

- [ ] **Step 3: Translate `TopBar`**

`TopBar` has no `'use client'` directive — it's a Server Component. Modify `apps/web/src/components/layout/top-bar.tsx`. Add the import:

```tsx
import { getTranslations } from 'next-intl/server';
```

Change `export function TopBar({` to `export async function TopBar({` (Server Components using `getTranslations` must be async). Inside the function body, before the `return`: `const t = await getTranslations('nav');`

Replace:

```tsx
          <Link href="/orders" className="hover:text-[color:var(--fg)] transition-colors">{t('trackOrder')}</Link>
```

- [ ] **Step 4: Translate `Footer`**

`Footer` is also a Server Component (no `'use client'`). Modify `apps/web/src/components/layout/footer.tsx`. Add the import:

```tsx
import { getTranslations } from 'next-intl/server';
```

Change `export function Footer({` to `export async function Footer({`. Inside the function body: `const t = await getTranslations('nav');`

Replace the four section labels and three link labels:

```tsx
        <div>
          <div className="text-sm font-semibold mb-3">{t('shop')}</div>
          <ul className="space-y-2 text-sm text-[color:var(--fg-muted)]">
            <li><Link href="/products" className="hover:text-[color:var(--fg)]">{t('allProducts')}</Link></li>
```

```tsx
        <div>
          <div className="text-sm font-semibold mb-3">{t('company')}</div>
          <ul className="space-y-2 text-sm text-[color:var(--fg-muted)]">
            <li><Link href="/about" className="hover:text-[color:var(--fg)]">{t('about')}</Link></li>
            <li><Link href="/contact" className="hover:text-[color:var(--fg)]">{t('contact')}</Link></li>
          </ul>
        </div>

        <div>
          <div className="text-sm font-semibold mb-3">{t('legal')}</div>
          <ul className="space-y-2 text-sm text-[color:var(--fg-muted)]">
            <li><Link href="/shipping-returns" className="hover:text-[color:var(--fg)]">{t('shippingReturns')}</Link></li>
            <li><Link href="/terms" className="hover:text-[color:var(--fg)]">{t('termsOfService')}</Link></li>
            <li><Link href="/privacy" className="hover:text-[color:var(--fg)]">{t('privacyPolicy')}</Link></li>
          </ul>
        </div>
```

```tsx
          <span>© {new Date().getFullYear()} {brand.siteName}. {t('allRightsReserved')}</span>
```

- [ ] **Step 5: Typecheck**

Run: `pnpm --filter web typecheck`
Expected: no errors.

- [ ] **Step 6: Live-verify**

Boot the dev server, toggle to Bangla via the switcher, confirm the navbar links ("Featured"→"ফিচার্ড" etc.), the top bar's "Track order", and the footer's four column headers + link labels + "All rights reserved" all render in Bangla. Confirm the brand name, category names in the footer's Shop column, and the settings-driven footer note (if any) are **unchanged** — they're admin/category data, not translated. Stop the server.

- [ ] **Step 7: Commit**

```bash
git add apps/web/src/messages apps/web/src/components/layout/navbar.tsx apps/web/src/components/layout/top-bar.tsx apps/web/src/components/layout/footer.tsx
git commit -m "feat(web): translate nav, top bar, and footer chrome"
```

---

### Task 4: Translate SearchCommand (short strings only)

**Files:**
- Modify: `apps/web/src/messages/en.json`, `apps/web/src/messages/bn.json`
- Modify: `apps/web/src/components/shop/search-command.tsx`

**Scope note:** the `SPEECH_ERROR_MESSAGES` dictionary in this file (mic-permission/speech-service troubleshooting text) is deliberately **not** translated in this task — those are long, technical, rare-path diagnostic messages (browser terminology like "Site settings" is itself usually shown untranslated by the browser), and getting them right in Bangla without native review carries more risk than the value of translating an edge-case error path. Only the common-path UI strings (labels, placeholder, the voice-confirm card, results-list footer) are translated here.

**Interfaces:**
- Produces: the `search` namespace.

- [ ] **Step 1: Add the `search` namespace**

Add to `apps/web/src/messages/en.json`:

```json
  "search": {
    "searchLabel": "Search",
    "searchPlaceholder": "Search products…",
    "searchByVoice": "Search by voice",
    "stopVoiceSearch": "Stop voice search",
    "closeSearch": "Close search",
    "didYouMean": "Did you mean:",
    "each": "each",
    "addToCart": "Add to cart",
    "searchInstead": "Search instead",
    "typeAtLeastTwoChars": "Type at least 2 characters to search the catalog.",
    "noProductsMatch": "No products match \"{query}\".",
    "seeAllResults": "See all results",
    "escToClose": "Esc to close",
    "addedToCartToast": "Added {quantity} × {product} to cart"
  }
```

Add to `apps/web/src/messages/bn.json`:

```json
  "search": {
    "searchLabel": "সার্চ",
    "searchPlaceholder": "পণ্য খুঁজুন…",
    "searchByVoice": "কণ্ঠে খুঁজুন",
    "stopVoiceSearch": "কণ্ঠ সার্চ বন্ধ করুন",
    "closeSearch": "সার্চ বন্ধ করুন",
    "didYouMean": "আপনি কি এটা বুঝিয়েছেন:",
    "each": "প্রতিটি",
    "addToCart": "কার্টে যোগ করুন",
    "searchInstead": "এর পরিবর্তে সার্চ করুন",
    "typeAtLeastTwoChars": "ক্যাটালগ খুঁজতে অন্তত ২টি অক্ষর টাইপ করুন।",
    "noProductsMatch": "\"{query}\" এর সাথে মিলে এমন কোনো পণ্য নেই।",
    "seeAllResults": "সব ফলাফল দেখুন",
    "escToClose": "বন্ধ করতে Esc চাপুন",
    "addedToCartToast": "কার্টে {quantity} × {product} যোগ করা হয়েছে"
  }
```

- [ ] **Step 2: Wire the hook and replace strings**

Modify `apps/web/src/components/shop/search-command.tsx`. Add the import:

```tsx
import { useTranslations } from 'next-intl';
```

Inside `SearchCommand`, add: `const t = useTranslations('search');`

Replace each hardcoded string with its translation call, keeping everything else (logic, classNames, structure) unchanged:

- `aria-label="Search"` (the closed-state trigger button) → `aria-label={t('searchLabel')}`
- `placeholder="Search products…"` → `placeholder={t('searchPlaceholder')}`
- `aria-label={listening ? 'Stop voice search' : 'Search by voice'}` → `aria-label={listening ? t('stopVoiceSearch') : t('searchByVoice')}`
- `aria-label="Close search"` → `aria-label={t('closeSearch')}`
- `<p className="text-xs text-[color:var(--fg-muted)] mb-3">Did you mean:</p>` → `<p className="text-xs text-[color:var(--fg-muted)] mb-3">{t('didYouMean')}</p>`
- `{' '}each` (after the formatted price in the voice-confirm card) → `{' '}{t('each')}`
- `<ShoppingCart className="w-4 h-4" /> Add to cart` (confirm-card button) → `<ShoppingCart className="w-4 h-4" /> {t('addToCart')}`
- `Search instead` (confirm-card button text) → `{t('searchInstead')}`
- `Type at least 2 characters to search the catalog.` → `{t('typeAtLeastTwoChars')}`
- `No products match "{query.trim()}".` → `{t('noProductsMatch', { query: query.trim() })}`
- `<CornerDownLeft className="w-3 h-3" /> See all results` → `<CornerDownLeft className="w-3 h-3" /> {t('seeAllResults')}`
- `Esc to close` → `{t('escToClose')}`
- `toast.success(\`Added ${quantity} × ${product.name} to cart\`);` (in `confirmAddToCart`) → `toast.success(t('addedToCartToast', { quantity, product: product.name }));`

- [ ] **Step 3: Typecheck**

Run: `pnpm --filter web typecheck`
Expected: no errors.

- [ ] **Step 4: Live-verify**

Boot the dev server, switch to Bangla, open search (⌘K), confirm placeholder/aria-labels/footer strings are Bangla, type a 1-character query and confirm the "type at least 2 characters" message is Bangla, type a query with no matches and confirm the interpolated "No products match" message renders correctly with the actual query text embedded. Confirm product names in the results list stay in whatever language they were entered (untranslated). Stop the server.

- [ ] **Step 5: Commit**

```bash
git add apps/web/src/messages apps/web/src/components/shop/search-command.tsx
git commit -m "feat(web): translate search command UI chrome"
```

---

### Task 5: Translate homepage chrome (page.tsx, BrandStrip, StatsBand)

**Files:**
- Modify: `apps/web/src/messages/en.json`, `apps/web/src/messages/bn.json`
- Modify: `apps/web/src/app/page.tsx`, `apps/web/src/components/shop/brand-strip.tsx`, `apps/web/src/components/shop/stats-band.tsx`

**Interfaces:**
- Produces: the `home` namespace.

- [ ] **Step 1: Add the `home` namespace**

Add to `apps/web/src/messages/en.json`:

```json
  "home": {
    "featuredDevices": "Featured devices",
    "trendingDevices": "Trending devices",
    "shopAll": "Shop all",
    "noFeaturedYet": "No featured devices yet.",
    "markFeaturedHint": "Mark products as featured in the admin to show them here.",
    "trustedBrands": "Trusted brands",
    "premiumBrandsYouLove": "Premium brands you love",
    "statAccessories": "Premium accessories",
    "statDispatch": "Same-day dispatch",
    "statAuthentic": "Authentic devices",
    "statSupport": "Device support"
  }
```

Add to `apps/web/src/messages/bn.json`:

```json
  "home": {
    "featuredDevices": "ফিচার্ড ডিভাইস",
    "trendingDevices": "ট্রেন্ডিং ডিভাইস",
    "shopAll": "সব দেখুন",
    "noFeaturedYet": "এখনো কোনো ফিচার্ড ডিভাইস নেই।",
    "markFeaturedHint": "এখানে দেখাতে অ্যাডমিন থেকে পণ্যগুলো ফিচার্ড হিসেবে চিহ্নিত করুন।",
    "trustedBrands": "বিশ্বস্ত ব্র্যান্ড",
    "premiumBrandsYouLove": "আপনার পছন্দের প্রিমিয়াম ব্র্যান্ড",
    "statAccessories": "প্রিমিয়াম আনুষাঙ্গিক",
    "statDispatch": "একই দিনে পাঠানো",
    "statAuthentic": "আসল ডিভাইস",
    "statSupport": "ডিভাইস সাপোর্ট"
  }
```

- [ ] **Step 2: Translate `page.tsx`**

`HomePage` is already `async` — it's a Server Component. Modify `apps/web/src/app/page.tsx`. Add the import:

```tsx
import { getTranslations } from 'next-intl/server';
```

Inside `HomePage`, alongside the existing `Promise.all([...])` call for featured/settings/banners/categories/brands, add the translator (it doesn't depend on any of those, so it can resolve independently — add it as its own `await`, not inside that `Promise.all`, to avoid restructuring the existing destructure):

```tsx
  const t = await getTranslations('home');
```

Replace:

```tsx
            <div className="text-xs font-mono uppercase tracking-[0.2em] text-[color:var(--accent)] mb-2">
              {t('featuredDevices')}
            </div>
            <h2 className="display text-3xl md:text-4xl">{t('trendingDevices')}</h2>
          </div>
          <Link href="/products" className="text-sm font-medium hover:text-[color:var(--accent)] transition-colors inline-flex items-center gap-1">
            {t('shopAll')} <ArrowRight className="w-4 h-4" />
          </Link>
        </div>

        {featured && featured.items.length > 0 ? (
          <ProductGrid products={featured.items} />
        ) : (
          <div className="card text-center py-16 text-[color:var(--fg-muted)]">
            <p>{t('noFeaturedYet')}</p>
            <p className="text-xs mt-2">{t('markFeaturedHint')}</p>
          </div>
        )}
```

- [ ] **Step 3: Translate `BrandStrip`**

`BrandStrip` is a Client Component (`'use client'`). Modify `apps/web/src/components/shop/brand-strip.tsx`. Add the import:

```tsx
import { useTranslations } from 'next-intl';
```

Inside `BrandStrip`, add (after the early-return guard, since hooks must run unconditionally — move the `const t = useTranslations('home');` line to the top of the function, before the `if (!brands...) return null;` check):

```tsx
export function BrandStrip({ brands }: { brands: Brand[] }) {
  const t = useTranslations('home');
  if (!brands || brands.length === 0) return null;
```

Replace:

```tsx
        <div className="text-xs font-mono uppercase tracking-[0.2em] text-[color:var(--accent)] mb-2">
          {t('trustedBrands')}
        </div>
        <h2 className="display text-2xl md:text-3xl">{t('premiumBrandsYouLove')}</h2>
```

- [ ] **Step 4: Translate `StatsBand`**

`StatsBand` is a Server Component (no `'use client'`) but its `STATS` array is currently a module-level constant built before any request context exists — translated labels need to come from inside the (now-async) component function instead. Modify `apps/web/src/components/shop/stats-band.tsx`. Add the import:

```tsx
import { getTranslations } from 'next-intl/server';
```

Move the `STATS` array's construction inside the function (it can no longer be a module-level constant, since the labels now depend on the request's locale) and translate it. Replace the whole file's `STATS` constant and `StatsBand` function with:

```tsx
export async function StatsBand() {
  const t = await getTranslations('home');
  const STATS: { icon: ReactNode; value: string; label: string }[] = [
    { icon: <Boxes className="w-5 h-5" />, value: '500+', label: t('statAccessories') },
    { icon: <Truck className="w-5 h-5" />, value: '24h', label: t('statDispatch') },
    { icon: <ShieldCheck className="w-5 h-5" />, value: '100%', label: t('statAuthentic') },
    { icon: <Headphones className="w-5 h-5" />, value: '7-day', label: t('statSupport') },
  ];

  return (
    <section className="max-w-7xl mx-auto px-6 pb-4">
      <div className="relative overflow-hidden rounded-3xl bg-drikon-gradient grain text-white">
        <div className="relative z-10 grid grid-cols-2 md:grid-cols-4 gap-px bg-white/10">
          {STATS.map((s) => (
            <div key={s.label} className="bg-white/5 px-6 py-8 flex flex-col items-center text-center gap-2">
              <span className="w-11 h-11 rounded-xl bg-white/12 grid place-items-center text-white">
                {s.icon}
              </span>
              <div className="display text-3xl md:text-4xl">{s.value}</div>
              <div className="text-xs md:text-sm text-white/80">{s.label}</div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
```

(The `/** Full-width gradient stats band... */` comment above the old function declaration stays as-is; only the function itself and the `STATS` constant's location change.)

- [ ] **Step 5: Typecheck**

Run: `pnpm --filter web typecheck`
Expected: no errors.

- [ ] **Step 6: Live-verify**

Boot the dev server, switch to Bangla, load the homepage, confirm "Featured devices"/"Trending devices"/"Shop all" (or their empty-state equivalents if no featured products exist), the "Trusted brands"/"Premium brands you love" heading pair, and all four stats-band labels render in Bangla — while the hero title/subtitle/CTA text (settings-driven) and actual product names in the featured grid stay untouched. Stop the server.

- [ ] **Step 7: Commit**

```bash
git add apps/web/src/messages apps/web/src/app/page.tsx apps/web/src/components/shop/brand-strip.tsx apps/web/src/components/shop/stats-band.tsx
git commit -m "feat(web): translate homepage chrome, brand strip, and stats band"
```

---

### Task 6: Translate ProductCard + AddToCart

**Files:**
- Modify: `apps/web/src/messages/en.json`, `apps/web/src/messages/bn.json`
- Modify: `apps/web/src/components/shop/product-card.tsx`, `apps/web/src/components/shop/add-to-cart.tsx`

**Interfaces:**
- Produces: the `product` namespace, shared by both files (both render on the listing page and the PDP).

- [ ] **Step 1: Add the `product` namespace**

Add to `apps/web/src/messages/en.json`:

```json
  "product": {
    "soldOut": "SOLD OUT",
    "addedToCartToastTitle": "Added to cart",
    "addToCartAria": "Add to cart",
    "addedQtyToCart": "Added {qty} to cart",
    "decreaseQuantity": "Decrease quantity",
    "increaseQuantity": "Increase quantity",
    "soldOutButton": "Sold out",
    "outOfStockButton": "Out of stock",
    "addToCart": "Add to cart"
  }
```

Add to `apps/web/src/messages/bn.json`:

```json
  "product": {
    "soldOut": "স্টক শেষ",
    "addedToCartToastTitle": "কার্টে যোগ করা হয়েছে",
    "addToCartAria": "কার্টে যোগ করুন",
    "addedQtyToCart": "কার্টে {qty}টি যোগ করা হয়েছে",
    "decreaseQuantity": "পরিমাণ কমান",
    "increaseQuantity": "পরিমাণ বাড়ান",
    "soldOutButton": "স্টক শেষ",
    "outOfStockButton": "স্টকে নেই",
    "addToCart": "কার্টে যোগ করুন"
  }
```

- [ ] **Step 2: Translate `ProductCard`**

`ProductCard` is a Client Component. Modify `apps/web/src/components/shop/product-card.tsx`. Add the import:

```tsx
import { useTranslations } from 'next-intl';
```

Inside `ProductCard`, add: `const t = useTranslations('product');`

Replace:

```tsx
        {product.stock === 0 && (
          <span className="absolute bottom-3 left-3 px-2 py-1 text-[10px] font-bold rounded-md bg-black/70 text-white">
            {t('soldOut')}
          </span>
        )}
```

```tsx
              toast.success('Added to cart', { description: product.name });
```
→
```tsx
              toast.success(t('addedToCartToastTitle'), { description: product.name });
```

```tsx
            aria-label="Add to cart"
```
→
```tsx
            aria-label={t('addToCartAria')}
```

- [ ] **Step 3: Translate `AddToCart`**

`AddToCart` is a Client Component. Modify `apps/web/src/components/shop/add-to-cart.tsx`. Add the import:

```tsx
import { useTranslations } from 'next-intl';
```

Inside `AddToCart`, add: `const t = useTranslations('product');`

Replace:

```tsx
    toast.success(`Added ${qty} to cart`, { description: product.name });
```
→
```tsx
    toast.success(t('addedQtyToCart', { qty }), { description: product.name });
```

```tsx
        {soldOut ? 'Sold out' : 'Add to cart'}
```
(the `compact` branch) →
```tsx
        {soldOut ? t('soldOutButton') : t('addToCart')}
```

```tsx
          aria-label="Decrease quantity"
```
→
```tsx
          aria-label={t('decreaseQuantity')}
```

```tsx
          aria-label="Increase quantity"
```
→
```tsx
          aria-label={t('increaseQuantity')}
```

```tsx
        {soldOut ? 'Out of stock' : 'Add to cart'}
```
(the full, non-compact branch) →
```tsx
        {soldOut ? t('outOfStockButton') : t('addToCart')}
```

- [ ] **Step 4: Typecheck**

Run: `pnpm --filter web typecheck`
Expected: no errors.

- [ ] **Step 5: Live-verify**

Boot the dev server, switch to Bangla, visit `/products`, confirm a sold-out product (if any exist in seed data) shows "স্টক শেষ", add a product to cart from a card and confirm the toast reads "কার্টে যোগ করা হয়েছে". Visit a PDP and exercise the quantity stepper + Add to cart button, confirming both the aria-labels (via screen-reader inspection or DOM query) and the button text/toast are Bangla. Stop the server.

- [ ] **Step 6: Commit**

```bash
git add apps/web/src/messages apps/web/src/components/shop/product-card.tsx apps/web/src/components/shop/add-to-cart.tsx
git commit -m "feat(web): translate product card and add-to-cart UI"
```

---

### Task 7: Translate the product listing page

**Files:**
- Modify: `apps/web/src/messages/en.json`, `apps/web/src/messages/bn.json`
- Modify: `apps/web/src/app/(shop)/products/page.tsx`

**Interfaces:**
- Produces: the `products` namespace.

- [ ] **Step 1: Add the `products` namespace**

Add to `apps/web/src/messages/en.json`:

```json
  "products": {
    "search": "Search",
    "shop": "Shop",
    "allProducts": "All products",
    "productsCount": "{count} products",
    "all": "All",
    "couldntLoadProducts": "Couldn't load products",
    "failedToLoadProducts": "Failed to load products",
    "tryAgain": "Try again",
    "noProductsMatch": "No products match",
    "noResultsForFilters": "Nothing here for those filters yet — try clearing them.",
    "noProductsYet": "No products have been added yet. Check back soon.",
    "clearFilters": "Clear filters",
    "previous": "← Previous",
    "next": "Next →",
    "pageOf": "Page {page} of {totalPages}",
    "sortNewest": "Newest",
    "sortPopular": "Most popular",
    "sortPriceAsc": "Price ↑",
    "sortPriceDesc": "Price ↓",
    "sortRating": "Top rated"
  }
```

Add to `apps/web/src/messages/bn.json`:

```json
  "products": {
    "search": "সার্চ",
    "shop": "শপ",
    "allProducts": "সকল পণ্য",
    "productsCount": "{count}টি পণ্য",
    "all": "সব",
    "couldntLoadProducts": "পণ্য লোড করা যায়নি",
    "failedToLoadProducts": "পণ্য লোড করতে ব্যর্থ হয়েছে",
    "tryAgain": "আবার চেষ্টা করুন",
    "noProductsMatch": "কোনো পণ্য মেলেনি",
    "noResultsForFilters": "এই ফিল্টারগুলোর জন্য এখানে কিছু নেই — মুছে ফেলার চেষ্টা করুন।",
    "noProductsYet": "এখনো কোনো পণ্য যোগ করা হয়নি। শীঘ্রই আবার দেখুন।",
    "clearFilters": "ফিল্টার মুছুন",
    "previous": "← আগের",
    "next": "পরের →",
    "pageOf": "{totalPages} এর মধ্যে {page} পৃষ্ঠা",
    "sortNewest": "নতুন",
    "sortPopular": "সবচেয়ে জনপ্রিয়",
    "sortPriceAsc": "দাম ↑",
    "sortPriceDesc": "দাম ↓",
    "sortRating": "সেরা রেটিং"
  }
```

- [ ] **Step 2: Translate the page**

`ProductsPage` is already `async`. Modify `apps/web/src/app/(shop)/products/page.tsx`. Add the import:

```tsx
import { getTranslations } from 'next-intl/server';
```

Inside `ProductsPage`, add near the top (after `const params = await searchParams;` is fine, order doesn't matter since it has no dependency on `params`):

```tsx
  const t = await getTranslations('products');
```

Replace the `error` fallback message:

```tsx
    error = e instanceof ApiError ? e.message : t('failedToLoadProducts');
```

Replace the eyebrow/heading block:

```tsx
          <div className="text-xs font-mono uppercase tracking-[0.2em] text-[color:var(--accent)] mb-2">
            {currentSearch ? t('search') : currentCategory ? currentCategory : t('shop')}
          </div>
          <h1 className="display text-4xl md:text-5xl">
            {currentSearch
              ? `“${currentSearch}”`
              : currentCategory
                ? capitalize(currentCategory)
                : t('allProducts')}
          </h1>
          {data && (
            <p className="text-sm text-[color:var(--fg-muted)] mt-2">
              {t('productsCount', { count: data.pagination.total })}
            </p>
          )}
```

Replace the "All" category chip:

```tsx
        <CategoryChip active={!currentCategory} href="/products">{t('all')}</CategoryChip>
```

Replace the two `EmptyState` blocks:

```tsx
      {error ? (
        <div className="card !p-0">
          <EmptyState
            icon={<PackageX className="w-6 h-6" />}
            title={t('couldntLoadProducts')}
            description={error}
            action={<Link href="/products" className="btn-primary">{t('tryAgain')}</Link>}
          />
        </div>
      ) : !data || data.items.length === 0 ? (
        <div className="card !p-0">
          <EmptyState
            icon={<SearchX className="w-6 h-6" />}
            title={t('noProductsMatch')}
            description={currentSearch || currentCategory ? t('noResultsForFilters') : t('noProductsYet')}
            action={(currentSearch || currentCategory) && <Link href="/products" className="btn-primary">{t('clearFilters')}</Link>}
          />
        </div>
      ) : (
```

Replace the pagination block:

```tsx
              {data.pagination.hasPrev && (
                <PageLink params={params} page={page - 1}>{t('previous')}</PageLink>
              )}
              <span className="px-4 py-2 text-sm text-[color:var(--fg-muted)]">
                {t('pageOf', { page, totalPages: data.pagination.totalPages })}
              </span>
              {data.pagination.hasNext && (
                <PageLink params={params} page={page + 1}>{t('next')}</PageLink>
              )}
```

Replace the `SortLinks` function's `options` array construction. Since `SortLinks` is a plain (non-async) helper function called from within the already-translated page, pass `t` down as a parameter rather than calling `getTranslations` again:

```tsx
function SortLinks({
  current,
  params,
  t,
}: {
  current: string;
  params: Record<string, string | string[] | undefined>;
  t: Awaited<ReturnType<typeof getTranslations<'products'>>>;
}) {
  const options: Array<{ value: string; label: string }> = [
    { value: 'newest', label: t('sortNewest') },
    { value: 'popular', label: t('sortPopular') },
    { value: 'price_asc', label: t('sortPriceAsc') },
    { value: 'price_desc', label: t('sortPriceDesc') },
    { value: 'rating', label: t('sortRating') },
  ];
```

And update its call site to pass `t`:

```tsx
        <SortLinks current={currentSort} params={params} t={t} />
```

- [ ] **Step 3: Typecheck**

Run: `pnpm --filter web typecheck`
Expected: no errors. (If the `Awaited<ReturnType<typeof getTranslations<'products'>>>` type doesn't resolve cleanly against the installed `next-intl` version, use the simpler `(key: string, values?: Record<string, string | number>) => string` function type instead for `SortLinks`'s `t` prop — functionally equivalent, just less precisely typed to next-intl's own generics.)

- [ ] **Step 4: Live-verify**

Boot the dev server, switch to Bangla, visit `/products`, confirm the eyebrow/heading, product count, "All" chip, sort dropdown options, and pagination controls are Bangla. Visit `/products?search=doesnotexist12345` to trigger the empty state and confirm its Bangla text. Confirm actual category names (from the category chips beyond "All") and product names in the grid stay untouched. Stop the server.

- [ ] **Step 5: Commit**

```bash
git add apps/web/src/messages "apps/web/src/app/(shop)/products/page.tsx"
git commit -m "feat(web): translate product listing page"
```

---

### Task 8: Translate PDP chrome

**Files:**
- Modify: `apps/web/src/messages/en.json`, `apps/web/src/messages/bn.json`
- Modify: `apps/web/src/app/(shop)/products/[slug]/page.tsx`

**Interfaces:**
- Produces: the `pdp` namespace. This task only touches the standard PDP template — `premium-product-page.tsx` is explicitly out of scope for Phase 1 (per the spec).

- [ ] **Step 1: Add the `pdp` namespace**

Add to `apps/web/src/messages/en.json`:

```json
  "pdp": {
    "shop": "Shop",
    "reviewsCount": "{count} reviews",
    "outOfStock": "Out of stock",
    "onlyLeftInStock": "Only {stock} left in stock",
    "inStock": "In stock",
    "description": "Description",
    "watchItInAction": "Watch it in action",
    "specifications": "Specifications",
    "frequentlyBoughtTogether": "Frequently bought together",
    "youMightAlsoLike": "You might also like",
    "offBadge": "−{discount}% OFF"
  }
```

Add to `apps/web/src/messages/bn.json`:

```json
  "pdp": {
    "shop": "শপ",
    "reviewsCount": "{count}টি রিভিউ",
    "outOfStock": "স্টকে নেই",
    "onlyLeftInStock": "মাত্র {stock}টি স্টকে আছে",
    "inStock": "স্টকে আছে",
    "description": "বিবরণ",
    "watchItInAction": "কার্যক্ষমতা দেখুন",
    "specifications": "স্পেসিফিকেশন",
    "frequentlyBoughtTogether": "একসাথে যা কেনা হয়",
    "youMightAlsoLike": "আপনার আরও পছন্দ হতে পারে",
    "offBadge": "−{discount}% ছাড়"
  }
```

- [ ] **Step 2: Translate the page**

`ProductDetailPage` is already `async`. Modify `apps/web/src/app/(shop)/products/[slug]/page.tsx`. Add the import:

```tsx
import { getTranslations } from 'next-intl/server';
```

Inside `ProductDetailPage`, after `if (!product) notFound();`, add:

```tsx
  const t = await getTranslations('pdp');
```

Replace the breadcrumb:

```tsx
        <Link href="/products" className="hover:text-[color:var(--fg)] inline-flex items-center gap-1">
          <ArrowLeft className="w-3 h-3" /> {t('shop')}
        </Link>
```

Replace the sale badge:

```tsx
          {onSale && (
            <span className="absolute top-4 left-4 px-3 py-1.5 text-xs font-bold rounded-md bg-[color:var(--accent)] text-white">
              {t('offBadge', { discount })}
            </span>
          )}
```

Replace the reviews count:

```tsx
              <span className="text-[color:var(--fg-muted)]">{t('reviewsCount', { count: product.reviewCount })}</span>
```

Replace the three stock states:

```tsx
            {product.stock === 0 ? (
              <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-red-500/10 text-red-600 border border-red-500/30">
                {t('outOfStock')}
              </span>
            ) : product.stock <= 5 ? (
              <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-amber-500/10 text-amber-600 border border-amber-500/30">
                {t('onlyLeftInStock', { stock: product.stock })}
              </span>
            ) : (
              <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-green-500/10 text-green-600 border border-green-500/30">
                {t('inStock')}
              </span>
            )}
```

Replace the three section headings:

```tsx
        <h2 className="display text-2xl mb-4">{t('description')}</h2>
```

```tsx
          <h2 className="display text-2xl mb-4">{t('watchItInAction')}</h2>
```

```tsx
          <h2 className="display text-2xl mb-4">{t('specifications')}</h2>
```

Replace the related-products heading:

```tsx
          <h2 className="display text-2xl mb-6">
            {frequentlyBoughtTogether.length > 0 ? t('frequentlyBoughtTogether') : t('youMightAlsoLike')}
          </h2>
```

- [ ] **Step 3: Typecheck**

Run: `pnpm --filter web typecheck`
Expected: no errors.

- [ ] **Step 4: Live-verify**

Boot the dev server, switch to Bangla, visit a non-premium-template product (e.g. `iphone-15-pro-titanium` if it's still the standard template, or any product whose `attributes.template !== 'premium'`), confirm the breadcrumb, stock badge/message, section headings ("Description"/"Specifications"/etc.), and the related-products heading are Bangla — while the product's own name, description, specification values, and price stay exactly as entered. If any seeded product happens to have `attributes.template === 'premium'`, visit it too and confirm it's **unaffected** (still fully English, since `premium-product-page.tsx` is out of scope). Stop the server.

- [ ] **Step 5: Commit**

```bash
git add apps/web/src/messages "apps/web/src/app/(shop)/products/[slug]/page.tsx"
git commit -m "feat(web): translate PDP chrome"
```

---

### Task 9: End-to-end verification

**Files:** none (verification only; fix forward in the relevant file from Tasks 1-8 if something's broken).

- [ ] **Step 1: Full typecheck, lint, build**

```bash
pnpm --filter web typecheck
pnpm --filter web lint
pnpm --filter web build
```
Expected: all three clean. The build step in particular catches any Server/Client Component boundary mistake (e.g. calling `getTranslations` from a Client Component) that `next dev` might not surface immediately.

- [ ] **Step 2: JSON structural parity check**

```bash
node -e "
const en = require('./apps/web/src/messages/en.json');
const bn = require('./apps/web/src/messages/bn.json');
const keysOf = (o, prefix = '') => Object.entries(o).flatMap(([k, v]) =>
  typeof v === 'object' ? keysOf(v, prefix + k + '.') : [prefix + k]
);
const enKeys = new Set(keysOf(en));
const bnKeys = new Set(keysOf(bn));
const onlyEn = [...enKeys].filter((k) => !bnKeys.has(k));
const onlyBn = [...bnKeys].filter((k) => !enKeys.has(k));
console.log('Keys only in en.json:', onlyEn);
console.log('Keys only in bn.json:', onlyBn);
process.exit(onlyEn.length || onlyBn.length ? 1 : 0);
"
```
Expected: both arrays empty, exit code 0. If not, fix the mismatched file(s) before proceeding.

- [ ] **Step 3: Live walkthrough of every Phase 1 surface**

```bash
lsof -ti :3000,:4000 | xargs -r kill -9
pnpm dev &
```
Wait for both to be ready. Log in as no one (guest is fine — nothing in Phase 1 requires auth). Using a browser (or Playwright):
1. Load `/`, confirm it's English by default (no cookie set).
2. Click the language switcher, confirm the page updates to Bangla without a full navigation.
3. Walk `/`, `/products`, `/products?search=iphone`, a PDP under the standard template, and confirm every Phase 1 string (per Tasks 3–8) renders in Bangla.
4. Confirm, on every one of those pages: product names, prices, category/brand names, and the homepage hero/CTA text are **unchanged** — proving the Non-goals boundary held in the actual implementation.
5. Reload the browser (full page reload, not SPA navigation) and confirm Bangla persists (cookie survives).
6. Toggle back to English, confirm everything reverts.
7. Visit `/admin` (as an admin, if convenient — or just confirm by reading the code that no admin file was touched in Tasks 1–8) and confirm it's unaffected by the current language cookie — still fully English regardless of the toggle state.

Stop the servers: `lsof -ti :3000,:4000 | xargs -r kill -9`

- [ ] **Step 4: Report translation lines for native-speaker review**

In the final report, list every `bn.json` string added across Tasks 3–8 (the file's full content at this point, since it's not large) so a native Bangla speaker can be pointed at it before this reaches production — per the spec's translation-quality caveat. This is a reporting step, not a blocking gate; Phase 1 is still considered complete pending that review, not blocked by it.

- [ ] **Step 5: Fix forward or finish**

If any expectation above failed, fix it in the relevant file from Tasks 1–8 and re-run the affected verification step. Once everything passes, this task needs no separate commit (nothing changes unless a fix was needed).
