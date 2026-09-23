# Tech Megastore (Black / Red / Orange / White) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Rebuild the storefront as a dense, premium tech megastore — black chrome, white content, red actions, orange deals — keeping the 3D and the responsive system intact.

**Architecture:**
- Palette and shape change through `@theme` token values; the fluid type and space scales from the responsive work stay exactly as they are.
- The megastore sections are written fresh against today's components and tokens. Commit `442dce7` is a **read-only reference** for structure and copy; never `git checkout` those files, because they carry fixed pixel sizes the responsive work removed.
- The 3D engine is untouched; only its stage and lighting change.

**Tech Stack:** Next.js 15.5 App Router, Tailwind v4 (`@theme`), Motion 11 (`motion/react`), Radix NavigationMenu + Dialog, R3F 9.7 / drei 10.7.8 / three 0.186, next-intl (en/bn), Vitest, Playwright.

**Spec:** `docs/superpowers/specs/2026-09-23-tech-megastore-black-red-design.md`

## Global Constraints

- **Branch:** `tech-megastore-red`, created from `responsive-system`. One commit per task, each ending with `Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>`.
- **Tooling:** pnpm only. Motion from `motion/react`. `'use client'` only where needed. Typed props, no `any`.
- **Palette tokens** (verbatim):

  | Token | Value |
  |---|---|
  | `--color-bg` | `#ffffff` |
  | `--color-bg-soft` | `#f4f5f7` |
  | `--color-fg` | `#12141a` |
  | `--color-fg-muted` | `#5b6170` |
  | `--color-border` | `#e3e6ec` |
  | `--border-strong` | `#c9ced8` |
  | `--color-accent` | `#e11d2a` |
  | `--color-accent-fg` | `#ffffff` |
  | `--color-accent-2` | `#ff7a1a` |
  | `--color-ink` | `#0a0a0a` |
  | `--color-ink-soft` | `#141414` |
  | `--color-sale` | `#e11d2a` |
  | `--color-star` | `#ff9f1a` |
  | `--color-success` | `#0d7d43` |
  | `--color-ring` | `#e11d2a` |
- **Contrast rules:** orange fills always take dark text (`#12141a`), red fills always take white. Every pair in the spec's table must pass its stated ratio, asserted by unit test.
- **Shape:** `--radius-card: 10px`, `--radius-ctl: 8px`.
- **Fonts:** display becomes **Chakra Petch** (`--font-display`, weights 500/600/700). Plus Jakarta Sans, JetBrains Mono and Hind Siliguri stay.
- **Responsive system is untouched:** fluid `--text-*` and `--spacing-*`, `.shell` `min(1800px, 94vw)`, `.grid-auto-products`, container queries, `dvh` heights, safe areas. `apps/web/e2e/responsive.spec.ts` must keep passing at all 12 sizes: no horizontal scrolling, no text overflow, 44px minimum tap targets under 768px, no text under 12px, header and `h1` visible.
- **Admin untouched:** `.theme-classic` keeps its own values; where a token changes, admin needs its own override so it renders as before.
- **Budget:** First Load JS grows by at most 2 kB versus `responsive-system`; the only new dependency is the Chakra Petch font through `next/font`.
- **Verification commands** (repo root): `pnpm --filter @drikon/web test`, `pnpm --filter @drikon/web typecheck`, `pnpm lint`, `pnpm --filter @drikon/web build`.
- **Local services:** docker `drikon-postgres` up; API `cd apps/api && WEB_ORIGIN=http://localhost:3000,http://localhost:3100 node dist/main.js` (build first if `dist` is stale); web `pnpm --filter @drikon/web exec next start -p 3100`; Chromium `/home/dextro/.cache/ms-playwright/chromium-1234/chrome-linux64/chrome` with `['--use-angle=swiftshader','--enable-unsafe-swiftshader']`, and `PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH` for e2e. Stop web with `kill $(fuser 3100/tcp 2>/dev/null)`; never `pkill -f`.
- **Screenshots:** `/tmp/claude-1000/-home-dextro-Desktop-RED-PROJECTS-drikon/b155f20b-fd1c-4401-bd18-3d4763fce40d/scratchpad/megastore/`.
- **Reference commit:** `git show 442dce7:apps/web/src/components/<path>` for the old megastore components (`home/category-sidebar.tsx`, `home/promo-tiles.tsx`, `home/category-grid.tsx`, `home/service-strip.tsx`, `layout/top-bar.tsx`, `layout/navbar.tsx`, `layout/mega-menu.tsx`). Read them for structure, class ideas and copy; write new code.

---

### Task 1: Palette, fonts, shape, contrast tests

**Files:**
- Modify: `apps/web/src/styles/globals.css` (`@theme`, `:root`, `.theme-classic`, component classes)
- Modify: `apps/web/src/app/layout.tsx` (font, `themeColor`)
- Test: `apps/web/src/lib/contrast.test.ts`

**Interfaces:**
- Produces: every token in Global Constraints, plus `.section-rule` (the red-to-orange gradient rule) and `.carbon` (the dark-band texture), used by Tasks 2–4.
- Consumes: `contrastRatioHex(a, b)` from `@/lib/contrast`.

- [ ] **Step 1: Write the failing test.** Append to `apps/web/src/lib/contrast.test.ts`:
```ts
describe('megastore palette contrast (spec §1)', () => {
  const pairs: [string, string, string, number][] = [
    ['white on red', '#ffffff', '#e11d2a', 4.5],
    ['dark on orange', '#12141a', '#ff7a1a', 4.5],
    ['text on white', '#12141a', '#ffffff', 4.5],
    ['muted on white', '#5b6170', '#ffffff', 4.5],
    ['red price on white', '#e11d2a', '#ffffff', 4.5],
    ['white on ink', '#ffffff', '#0a0a0a', 4.5],
    ['muted white on ink', '#c9ced8', '#0a0a0a', 4.5],
    ['orange on ink', '#ff7a1a', '#0a0a0a', 4.5],
    ['success on white', '#0d7d43', '#ffffff', 4.5],
    ['focus ring on white', '#e11d2a', '#ffffff', 3],
  ];
  it.each(pairs)('%s meets its minimum', (_label, fg, bg, min) => {
    expect(contrastRatioHex(fg, bg)).toBeGreaterThanOrEqual(min);
  });
  it('rejects white text on orange, which must use dark text', () => {
    expect(contrastRatioHex('#ffffff', '#ff7a1a')).toBeLessThan(4.5);
  });
});
```

- [ ] **Step 2: Run it and watch it fail.** `pnpm --filter @drikon/web exec vitest run src/lib/contrast.test.ts` — the new block fails while the old warm values are in place only if a pair regresses; if it passes immediately, that is fine, since the assertions are about the palette constants, not the CSS. Record which happened.

- [ ] **Step 3: Apply the palette.** In `globals.css`'s `@theme`, set every token from the Global Constraints table, and `--radius-card: 10px; --radius-ctl: 8px;`. Update the block comment to describe the megastore palette. In the plain `:root` block set `--surface: #ffffff; --surface-solid: #ffffff; --image-well: #f4f5f7; --border-strong: #c9ced8; --shadow: rgba(10, 12, 20, 0.10); --skeleton-shine: rgba(255,255,255,0.75);` and keep `color-scheme: light`.

- [ ] **Step 4: Component classes.** In `@layer components`:
  - `.btn-primary`: background `var(--accent)`, colour `var(--accent-fg)`, border same, `box-shadow: 0 1px 2px var(--shadow)`; hover `background: color-mix(in srgb, var(--accent) 88%, #000)`.
  - `.btn-ghost`: white background, `var(--border-strong)` border; hover border `var(--fg)`.
  - `.btn-dark`: `var(--color-ink)` with white text; hover `var(--accent)`.
  - `.card`: white, 1px `var(--border)`, radius `var(--radius-card)`, `box-shadow: 0 1px 2px var(--shadow)`.
  - `.card-hover:hover`: `transform: translateY(-2px)`, `box-shadow: 0 12px 24px -12px rgba(10,12,20,0.25)`, border `var(--border-strong)`.
  - `.badge-sale`: `var(--color-sale)` with white text. `.badge-deal`: `var(--accent-2)` with `var(--color-fg)` text.
  - Add:
```css
  /* Section heading underline: red into orange, the house signature. */
  .section-rule { position: relative; padding-bottom: 0.6rem; }
  .section-rule::after {
    content: '';
    position: absolute;
    left: 0;
    bottom: 0;
    width: 3.5rem;
    height: 3px;
    border-radius: 2px;
    background: linear-gradient(90deg, var(--accent), var(--accent-2));
  }

  /* Faint diagonal texture for the black bands, so they read as material. */
  .carbon {
    background-image: repeating-linear-gradient(
      45deg,
      rgba(255, 255, 255, 0.04) 0 1px,
      transparent 1px 6px
    );
  }
```
  - Keep `.theme-classic` intact and add overrides for any token whose admin appearance would otherwise change: `--radius-card: 10px; --radius-ctl: 8px;` were already 10/8 in admin before the warm work, so check `git show 442dce7:apps/web/src/styles/globals.css` and match admin to that.

- [ ] **Step 5: Font and theme colour.** In `layout.tsx`, replace the Fraunces import with `Chakra_Petch` (`subsets: ['latin']`, `weight: ['500','600','700']`, `variable: '--font-chakra'`), update `--font-display` in `@theme` to `var(--font-chakra), var(--font-bangla), ui-sans-serif, system-ui, sans-serif`, swap the `<html>` className variable, and set `themeColor: '#0a0a0a'`.

- [ ] **Step 6: Verify.** Run the four verification commands. Start the API and web, screenshot `/` at 390 and 1440 into the screenshots directory as `t1-{390,1440}.png`, and look: black bars aren't built yet, but the page should be white with red buttons and orange badges, and the headings should be in the new font.

- [ ] **Step 7: Commit.** `feat(web): black/red/orange megastore palette, Chakra Petch display font`

---

### Task 2: Chrome — top bar, header, category bar, mega menu, footer

**Files:**
- Create: `apps/web/src/components/layout/top-bar.tsx`, `apps/web/src/components/layout/category-bar.tsx`
- Modify: `apps/web/src/components/layout/navbar.tsx`, `mega-menu.tsx`, `mobile-menu.tsx`, `header-search.tsx`, `footer.tsx`, `count-badge.tsx`, `language-switcher.tsx`
- Modify: `apps/web/src/app/layout.tsx` (compose `header={<><TopBar …/><Navbar …/><CategoryBar …/></>}`)
- Modify: `apps/web/src/messages/en.json`, `bn.json` (`nav` namespace) for any new labels

**Interfaces:**
- Consumes: Task 1's tokens and `.carbon`; `getCategories()` and `getTopBrands()` from `@/lib/catalog`; the existing `HeaderSearch`, `MegaMenu`, `MobileMenu` and `Footer` props.
- Produces:
  - `TopBar({ supportEmail, facebook, instagram, promo }: { supportEmail?: string | null; facebook?: string | null; instagram?: string | null; promo?: string | null })`
  - `CategoryBar({ categories, brands }: { categories: NavCategory[]; brands: NavBrand[] })` — the black full-width bar that owns the mega menu.
  - `Navbar` keeps its current props.

Reference (read, don't copy): `git show 442dce7:apps/web/src/components/layout/top-bar.tsx` and `…/navbar.tsx`.

- [ ] **Step 1: `TopBar`.** A `bg-[color:var(--color-ink)] carbon text-[color:#c9ced8]` strip, `text-xs`, min-height 36px, hidden below `md`. Left: the promo line (fall back to "Free delivery over ৳3,000 · Authentic devices"). Right: Track order (`/orders`), the language switcher, and `mailto:` support. Links hover to `var(--accent-2)`. Everything sits inside `.shell`.

- [ ] **Step 2: `Navbar` (white row).** Keep it sticky, drop the floating pill: full-width white, `border-b border-[color:var(--border)]`, and a shadow once scrolled (`shadow-[0_2px_10px_rgba(10,12,20,0.08)]`). Inside `.shell`: logo, then `HeaderSearch` taking the free space (restyled: white field, `--border-strong` border, red submit button with white icon), then account, wishlist, compare and cart. Count badges become `bg-[color:var(--accent-2)] text-[color:var(--fg)]`. Below `lg`: logo, search icon, cart, menu button. Every control keeps a 44px minimum box on mobile.

- [ ] **Step 3: `CategoryBar`.** Full-width `bg-[color:var(--color-ink)] carbon`, hidden below `lg`, inside `.shell`: a left "All categories" button that opens the Radix mega menu, then Home, All products, Deals (`/products?featured=true`), New arrivals (`/products?sort=newest`), Best sellers (`/products?sort=popular`), Track order. Items are `text-sm font-semibold text-white/85`, hover and active add a 3px orange underline (`after:` element, animated via `transform` only). Move the mega menu out of `navbar.tsx` into this component.

- [ ] **Step 4: Mega menu panel.** White, radius 10px, shadow, two columns of categories with icons plus a brands column; column headings in `var(--accent)`, `text-xs uppercase tracking-wide`. Keep Radix NavigationMenu semantics and the existing focus behaviour.

- [ ] **Step 5: Footer.** `bg-[color:var(--color-ink)] carbon` with white text and `#c9ced8` muted; columns brand/contact, categories, help, payments; socials hover orange; bottom row with language and copyright; keep the safe-area bottom padding.

- [ ] **Step 6: Mobile drawer.** Restyle to white with black section headings and orange active states; keep Radix Dialog, focus trap and escape.

- [ ] **Step 7: Verify.** Four verification commands; then with API and web running screenshot `/` at 390, 1024 and 1440 (`t2-*.png`), plus one with the mega menu open and one with the mobile drawer open. Check: black top bar and category bar, white header, orange underline on hover, nothing clipped at 390.

- [ ] **Step 8: Run the responsive matrix.** `cd apps/web && PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH=… pnpm exec playwright test e2e/responsive.spec.ts --workers=4`. All 60 must pass; fix any violation in the chrome you just wrote.

- [ ] **Step 9: Commit.** `feat(web): megastore chrome — black top bar, white header, black category bar`

---

### Task 3: Homepage

**Files:**
- Create: `apps/web/src/components/home/category-sidebar.tsx`, `promo-tiles.tsx`, `category-grid.tsx`, `service-strip.tsx`, `spotlight-band.tsx`
- Modify: `apps/web/src/app/page.tsx`, `components/home/section-header.tsx`, `product-row.tsx`, `promo-banner.tsx`, `trust-strip.tsx`, `components/shop/hero-slider.tsx`, `flash-sale-section.tsx`, `brand-strip.tsx`
- Delete when unused: `components/home/hero-stage.tsx`, `spotlight.tsx`, `category-tiles.tsx`
- Modify: `apps/web/src/messages/en.json`, `bn.json` (`home` namespace)

**Interfaces:**
- Consumes: Task 1 tokens and `.section-rule`; `ShowcaseLoader({ name: 'hero' | 'spotlight'; imageUrl; modelUrl?; alt; className? })`; `ProductRow`, `ProductGrid`, `HeroSlider`, `FlashSaleSection`, `BrandStrip`, `RecommendedForYou`; `ResolvedContent` from `@/lib/settings`.
- Produces:
  - `CategorySidebar({ categories, brands })` — desktop-only left rail
  - `PromoTiles({ dealsTitle, dealsBlurb, dealsImage, pick })`
  - `CategoryGrid({ categories })`
  - `ServiceStrip({ features })`
  - `SpotlightBand({ product, labels }: { product: ProductSummary | null; labels: { kicker: string; view: string } })` — the black 3D band

Reference (read, don't copy): `git show 442dce7:apps/web/src/components/home/{category-sidebar,promo-tiles,category-grid,service-strip}.tsx`.

- [ ] **Step 1: Opening row.** In `page.tsx`, build a `.shell` grid `lg:grid-cols-[260px_minmax(0,1fr)] xl:grid-cols-[260px_minmax(0,1fr)_280px]`: `CategorySidebar` (white card, category list with icons and counts, hover row in `--bg-soft` with an orange left edge, "All products →" footer link), the banner slider (or a static black hero with a red CTA when there are no banners), and `PromoTiles` on `xl`. All three use container queries where they switch internally, per the responsive system.

- [ ] **Step 2: Service strip and category grid.** `ServiceStrip`: one row of four features (delivery, returns, genuine, support) with orange icons on white, inside a `.card`. `CategoryGrid`: `.grid-auto-products`-style auto-fit tiles, each a white card with the category icon, name and product count, hover raising the card and turning the name red.

- [ ] **Step 3: Deal band.** Restyle `FlashSaleSection` (it already renders only while a sale runs and has the countdown) as a black `.carbon` band: white heading, orange countdown pills, product cards on `--ink-soft`, prices in white with the struck price muted. Keep its data logic untouched.

- [ ] **Step 4: `SpotlightBand`.** Full-bleed black `.carbon` section: left column the kicker ("Spotlight" from i18n), the product name in the display font, its short description, price in orange, and a red "View product" button linking to `/products/{slug}`; right column `<ShowcaseLoader name="spotlight" … className="aspect-[4/3] min-h-[16rem] max-h-[70dvh] w-full" />`. Renders nothing when `product` is null. Place it between the featured row and new arrivals.

- [ ] **Step 5: Rows and the rest.** `SectionHeader` gains `.section-rule`. Product rows stay dense carousels. Order in `page.tsx`: opening row → service strip → deal band → category grid → featured row → spotlight band → new arrivals row → promo banner → best sellers row → brand strip → trust strip → `RecommendedForYou` where it already sits. Exactly one `<h1>` on the page: the hero's.

- [ ] **Step 6: i18n.** Add any new labels to both `en.json` and `bn.json`, with real Bangla. At minimum: `home.allCategories` ("All categories" / "সব ক্যাটাগরি"), `home.dealOfTheDay` ("Deal of the day" / "আজকের সেরা ডিল"), `home.spotlightKicker` if it isn't already there.

- [ ] **Step 7: Delete what's now unused.** Remove `hero-stage.tsx`, `spotlight.tsx` and `category-tiles.tsx` once nothing imports them; confirm with `grep -rn "hero-stage\|HeroStage\|category-tiles\|CategoryTiles\|components/home/spotlight" apps/web/src`.

- [ ] **Step 8: Verify.** Four verification commands. Then screenshot `/` full-page at 390, 1440 and 2560 (`t3-home-*.png`), scrolling in steps first so `whileInView` sections render. Look at them: dense, premium, black bands with orange accents, nothing behind text. Check one `<h1>`, and that `[data-scene="spotlight"]` exists with swiftshader.

- [ ] **Step 9: Responsive matrix.** Run it again; all 60 pass.

- [ ] **Step 10: Commit.** `feat(web): megastore homepage — sidebar, deal band, 3D spotlight, dense rows`

---

### Task 4: Product card and the page sweep

**Files:**
- Modify: `apps/web/src/components/shop/product-card.tsx`, `product-grid.tsx`, `product-carousel.tsx`, `filter-panel.tsx`, `active-filters.tsx`, `product-media.tsx`, and the storefront pages under `app/(shop)`, `app/(auth)`, `app/(account)`
- Modify: `apps/web/src/components/ui/*` where colours are hard-coded

**Interfaces:**
- Consumes: Task 1 tokens.

- [ ] **Step 1: Product card.** White `.card card-hover`, radius 10px, image well `--image-well`. Brand in `text-2xs uppercase tracking-wide text-[color:var(--fg-muted)]`; name two lines; rating stars in `--color-star`; price in `var(--accent)` with the struck price muted; "Add to cart" full-width `bg-[color:var(--color-ink)] text-white` turning `var(--accent)` on hover. Sale badge `badge-deal` (orange, dark text) showing the discount; "Sold out" `bg-[color:var(--fg)] text-white`. Keep the tilt wrapper, the 44px minimum controls and the existing add-to-cart behaviour.

- [ ] **Step 2: Sweep.** `grep -rnE "#f5f1ea|#fffdf9|#efe9df|#e7dfd3|#d6cbbb|#1c1917|#57534e|#b45309|#b91c1c|#15803d|#d97706|f3ece1" apps/web/src --include=*.tsx --include=*.css | grep -v "(admin)" | grep -v components/admin` and replace every storefront hit with the new tokens. The greps must end empty except for documented exceptions.

- [ ] **Step 3: Pages.** Listing (filter panel as a white card with red "Apply", chips in `--bg-soft` with orange hover), cart, checkout (step circles red with white numerals), auth (white card on `--bg-soft`), account (white cards, red primary actions). Keep every structure; change only colour, radius and emphasis.

- [ ] **Step 4: Verify.** Four verification commands. Screenshot at 390 and 1440: `/products`, a product page, `/cart` with an item, `/checkout` (fake `/api/v1/auth/me` with `page.route`), `/login` (`t4-*.png`). Look at each and fix anything unreadable or off-palette.

- [ ] **Step 5: Responsive matrix.** All 60 pass.

- [ ] **Step 6: Commit.** `feat(web): megastore product cards and storefront page sweep`

---

### Task 5: 3D dark stage, then full verification

**Files:**
- Modify: `apps/web/src/components/three/showcase-scene.tsx`, `product-viewer-3d.tsx`
- Modify: `apps/web/e2e/three-d.spec.ts` only if a marker or label changed

**Interfaces:**
- Consumes: `SceneCanvas`, `Stand`, `Turntable`, `FitCamera`, `useSafeTexture` — all unchanged in behaviour.

- [ ] **Step 1: Stage and lights.** In `showcase-scene.tsx`, change `CREAM` to `#141414` and `BRONZE` to `#e11d2a` (the plinth and its ring), and set the lights to: `hemisphereLight args={['#ffffff', '#0a0a0a', 0.55]}`, a neutral key `directionalLight position={[2.5, 4, 3]} intensity={1.5}`, a red rim `directionalLight position={[-3, 1.5, -2]} intensity={0.9} color="#e11d2a"`, and an orange rim `directionalLight position={[3, 1, -2.5]} intensity={0.7} color="#ff7a1a"`. Keep `ContactShadows` but change its colour to `#0a0a0a`.

- [ ] **Step 2: Product viewer.** In `product-viewer-3d.tsx`, change the scene background to `#0f1115`, match the same four lights, and set the plinth ring to `#e11d2a`. The wrapper in `product-media.tsx` becomes `bg-[color:var(--color-ink)]`. Leave the model path, the tap-to-rotate behaviour and `FitCamera` alone.

- [ ] **Step 3: Check photos still look true.** Screenshot a product page in 3D mode at 1440 and a spotlight band at 1440 (`t5-*.png`). Product photos must not look tinted red; if they do, lower the rim intensities until they don't, and report the values you settled on.

- [ ] **Step 4: Full verification.**
  - `pnpm --filter @drikon/api test`, then the four web commands.
  - `cd apps/web && PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH=… pnpm exec playwright test --workers=4`: everything passes.
  - CI parity: stop the API, `rm -rf apps/web/.next/cache/fetch-cache`, restart web, run the whole suite again; it must pass with pages in their empty states.
  - Record `/products` and `/checkout` First Load JS and compare with `responsive-system` (228 kB / 175 kB): at most +2 kB.
- [ ] **Step 5: Final screenshots.** Home, listing, product, cart, checkout, login at 390, 1440 and 2560 into the screenshots directory under `final/`. Review them as a set for the goal: premium, technical, dense but readable.

- [ ] **Step 6: Commit.** `feat(web): dark 3D stage with red and orange rim light`
