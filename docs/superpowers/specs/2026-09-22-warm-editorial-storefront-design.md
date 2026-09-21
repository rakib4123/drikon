# Warm Editorial Storefront — Design

**Date:** 2026-09-22
**Status:** Approved (brainstorming), pending spec review
**Branch:** `warm-editorial-storefront`, created from `futuristic-3d-storefront`. PR #4 is superseded: it closes unmerged, and a new PR replaces it.
**Scope:** The whole storefront: header/menu, footer, homepage, product listing, product page, cart, checkout, auth and account. Admin keeps its current look.

## Why

The owner rejected two directions:
- the WordPress-style megastore layout (top bar, blue category bar, category sidebar, dense rows)
- the dark neon theme on PR #4: "the colour combo is disturbing, the information mixes with the background, not professional"

The site should feel calm, premium and readable, and still use 3D where it earns its place.

## Decisions (from brainstorming)

| Question | Choice |
|---|---|
| Colour direction | **C · Warm Premium**: cream, charcoal text, black buttons, bronze highlights |
| Homepage layout | **2 · Editorial Store**: headline plus 3D piece, category tiles, spotlight stories between grids |
| Pages | Whole storefront; admin unchanged |
| Build approach | **A**: build on the 3D branch (reuse its 3D engine, viewer, `modelUrl`, tests), replace the theme and layout |

## 1. Visual system

Tokens live in `@theme {}` in `apps/web/src/styles/globals.css`. Components already read the variables, so the retheme is mostly value changes plus the removals listed below.

| Token | Value | Use |
|---|---|---|
| `--color-bg` | `#f5f1ea` | page background (cream) |
| `--color-bg-soft` | `#efe9df` | image wells, alternate sections |
| surface (`--surface`, `--surface-solid`) | `#fffdf9` | cards, header, panels. Solid, never translucent |
| `--color-border` | `#e7dfd3` | hairlines |
| `--border-strong` | `#d6cbbb` | inputs, dividers |
| `--color-fg` | `#1c1917` | text (charcoal) |
| `--color-fg-muted` | `#57534e` | secondary text |
| `--color-accent` | `#1c1917` | primary buttons (black) |
| `--color-accent-fg` | `#fffdf9` | text on primary buttons |
| `--color-accent-2` | `#b45309` | bronze: highlights, links on hover, active states, the 3D glow |
| `--color-sale` | `#b91c1c` | sale price and sale badge fill (with white text) |
| `--color-success` | `#15803d` | in stock |
| `--color-star` | `#d97706` | ratings |
| `--color-ink` | `#1c1917` | dark bands (Deals, footer) |

Rules:
- **Nothing sits behind text.** No grid, no stars, no translucent glass over moving content. Every content surface is solid.
- **Contrast:** every text/background pair used on the storefront meets WCAG AA (4.5:1 for body text, 3:1 for large text and UI outlines). A unit test asserts the key pairs with the existing `lib/contrast.ts` helpers.
- **Focus:** visible focus rings in bronze (`--ring: #b45309`) on every interactive element, including inside the header.
- **Type:**
  - Headings use **Fraunces** (a serif, loaded through `next/font`, weights 500/600, `--font-display`).
  - Body text stays Plus Jakarta Sans. Prices and SKUs stay JetBrains Mono. Bangla stays Hind Siliguri, second in both font stacks.
- **Shape:** card radius 16px, control radius 12px, soft warm shadows (`rgba(28,25,23,0.08)`).
- **Motion:** Motion 11 springs as in `CLAUDE.md`. Card tilt is at most 5° (it was 8°). Fade-and-rise entrances on sections.
- **Admin:** `.theme-classic` keeps the old light megastore values. Fix the open PR #4 issue at the same time: admin text on accent fills uses `var(--accent-fg)` instead of hard-coded white, so a saved brand accent stays readable.
- **Brand accent override** (`layout.tsx`): it currently repaints `--color-accent`. In this design the accent is black, so the admin "accent colour" setting drives **`--color-accent-2` (bronze)** on the storefront instead, with `--color-accent-fg` computed by `accentForeground()` wherever it is used as a fill. Admin keeps its existing behaviour.

## 2. Layout

### Header (replaces top bar, navbar, blue category bar, mega menu)
- A **floating rounded bar**, sticky with a 12px inset from the top, solid `#fffdf9` with a soft shadow. It contains:
  - logo
  - **Shop ▾**: a Radix NavigationMenu panel with categories (with icons) and top brands, in two columns
  - Deals · New · Track order
  - search (the existing `HeaderSearch`, restyled)
  - language switch · account · wishlist · compare · cart with count
- **Mobile:** logo · search icon · cart · menu button, which opens the existing mobile-menu drawer, restyled.
- **Removed:** `top-bar.tsx` (its free-shipping promo moves into the trust strip) and the full-width accent category bar.

### Footer
Dark ink band (`#1c1917`) with cream text: brand and tagline, category links, help links, contact and socials, payment chips and language.

### Homepage (Editorial Store, top to bottom)
1. **Hero:**
   - Left: the admin hero copy (`c.heroBadge`, `c.heroTitle`, `c.heroSubtitle`, both CTAs) in Fraunces.
   - Right: a **3D showcase stage** with the first featured product on a warm lit stand, slowly turning.
   - Solid cream surface; no scrim is needed because the text and the 3D don't overlap.
2. **Category tiles:** the 3 top categories as large tiles (image or icon, name, product count) with gentle CSS tilt, plus a chip row with every category.
3. **Campaigns:** admin banner slides (`HeroSlider`, restyled), shown only when banners exist.
4. **Spotlight 1:** a featured product's story: name, short description, price, "View product" button, and its 3D showcase beside it. The layout is split: text left, 3D right.
5. **New arrivals:** a 4-column product grid.
6. **Deals band:** a dark ink band with a countdown, shown only while a flash sale is live (the existing `FlashSaleSection`, restyled).
7. **Spotlight 2:** the next featured product, mirrored (3D left, text right).
8. **Best sellers:** a 4-column product grid.
9. **Brands strip, then trust strip:** free delivery over ৳3,000 · 14-day returns · genuine devices · support.

Spotlight products are `featured[1]` and `featured[2]`, skipping products without an image. If there are fewer featured products, the missing spotlights are left out. The hero uses `featured[0]`. If there are no featured products, the hero shows the copy only and the right side shows a static warm composition.

**Removed from the homepage:** the category sidebar, promo tiles, the static and orbiting hero, and the "Shop by category" icon grid (replaced by the tiles).

### Other pages
They keep their structure and switch to the new tokens:
- **Listing:** filters in a solid side panel on desktop and a drawer on mobile.
- **Product page:** the 3D / Photos viewer on a warm stage (details in §3).
- **Cart, checkout, auth, account:** solid cream cards, black primary buttons.
- **Product card:** a solid `#fffdf9` card with the image in a `#efe9df` well, and a black "Add to cart" button.
  - Sale badge: `#b91c1c` with white text. Sold out: charcoal with cream text.
  - Tilt at most 5°, only on fine pointers, never under reduced motion.

## 3. 3D

**Kept:**
- `SceneCanvas`: DPR cap, off-screen pause, error boundary, context-loss fallback
- `useDeviceTier` (with the cached WebGL probe) and `useSafeTexture`
- `ProductViewer3D`: `.glb` via `modelUrl`, or the photo on a stand
- the CSP model-host allowlist and `Product.modelUrl`

**Removed** (files deleted, with no references left):
- `space-backdrop.tsx` and `backdrop-loader.tsx`, the global canvas behind every page
- `hero-scene.tsx` and `hero-scene-loader.tsx`, the orbiting panels
- `cart-orb.tsx` and `cart-orb-loader.tsx`
- the neon CSS: `.space-fallback`, `.grid-texture`, `.neon-edge`, `.neon-text`, the glow tokens

**New: `ShowcaseScene`**, one reusable "product on a stand" scene:
- Props: `{ imageUrl: string | null; modelUrl?: string | null; tier: 'low'|'high'; name: SceneName }`
- Warm studio lighting (key, fill and rim, colour-temperature warm). No bloom or post-processing.
- A cream stand with a thin bronze ring.
- Slow turntable: a ±0.35 rad sway for photos, full rotation for models. Stopped under reduced motion.
- Not interactive: no OrbitControls and no pointer capture, so the page always scrolls.
- Photos load through `useSafeTexture`. On failure the scene shows the stand alone and does not log console errors.

**Uses:**
- Homepage hero (`name: 'hero'`)
- Spotlights (`name: 'spotlight'`, added to `SceneName`)
- A small loader decides the tier and passes a static 2D fallback: the product photo on a cream disc, drawn with CSS.
- The homepage has at most 3 canvases; each pauses when off screen.

**Product page viewer (`ProductViewer3D`):**
- Warm stage: a `#efe9df` background and a cream stand with a bronze ring, replacing the dark neon stage.
- Fix PR #4's open phone-scroll issue: apply `touch-action` to the element OrbitControls actually attaches to (`controls.domElement` / R3F `events.connected`). On coarse pointers, mount OrbitControls only after the visitor taps "Tap to rotate", so the page scrolls normally until then.

## 4. Fallbacks and accessibility

- The page renders completely without WebGL: static CSS fallbacks for the hero and spotlights, and the 2D gallery on the product page.
- Canvases are `aria-hidden`. Every product shown in 3D is also a normal link on the page (the spotlight "View product" button, grids).
- Reduced motion: no turntable, no tilt, no entrance motion.
- There is exactly one `<h1>` on the homepage (the hero headline). Section titles are `<h2>`.

## 5. Performance

- First Load JS for `/products` and `/checkout` grows by no more than 5 kB versus `main`.
- The global backdrop is removed, so no canvas runs on pages without a scene.
- 3D code still loads only through `next/dynamic({ ssr: false })` from `components/three/*`.

## 6. Testing

Existing API and web unit tests stay green; typecheck, lint and build stay clean.

Unit tests:
- the contrast pairs from §1 (all ≥ 4.5:1 for text pairs)
- `accentForeground` on bronze

Playwright (update `e2e/three-d.spec.ts`):
- home: one `h1`, `[data-scene="hero"]` present, no backdrop canvas, no console errors (same network-noise rule as today)
- WebGL off: hero and spotlight fallbacks render, and there is no `canvas`
- product viewer: 3D / Photos toggle still works; on a touch-emulated phone, a wheel or swipe over the viewer scrolls the page
- reduced motion: tilt stays off, with the positive control kept

Also:
- screenshots at 390px and 1440px of home, listing, product, cart, checkout and login, reviewed for contrast and "nothing behind text"
- the pre-existing `storefront.spec.ts` "unknown routes" failure stays out of scope

## Out of scope

- Admin redesign (beyond the accent-text fix)
- New admin controls for picking spotlight products (featured order drives them)
- 3D model hosting or upload
- Blog or content pages
