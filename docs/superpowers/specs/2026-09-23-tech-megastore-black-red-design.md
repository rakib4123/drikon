# Tech Megastore (Black / Red / Orange / White) — Design

**Date:** 2026-09-23
**Status:** Approved (brainstorming), pending spec review
**Scope:** The whole storefront: chrome, homepage, listing, product, cart, checkout, auth, account. Admin keeps its own look.
**Base:** branch from `responsive-system` (PR #9), so the fluid sizing and the 12-size matrix stay in force. PR #9 is superseded by this branch if it hasn't merged by then.

## Why

The owner wants the WordPress-style megastore structure back — it reads as a real shop, dense and familiar — but premium, with a technical feel, the 3D kept, and a black / red / orange / white palette. The warm editorial layout on `main` is calm but sparse, and its cream palette isn't the wanted mood.

## Decisions (from brainstorming)

| Question | Choice |
|---|---|
| Approach | **A**: rebuild the megastore sections in today's code, using `442dce7`'s components only as a reference for structure and copy. No wholesale file restore, which would reintroduce fixed pixel sizes and break the responsive matrix. |
| Darkness | Dark chrome, white content: black bars and footer, white page and cards |
| Pieces | All of them: utility top bar, full-width category bar with mega menu, homepage category sidebar, promo tiles, dense product rows, service strip, deal band |

## 1. Palette

Tokens live in `@theme {}` in `apps/web/src/styles/globals.css`. The fluid type and space scales from the responsive work are unchanged.

| Token | Value | Use |
|---|---|---|
| `--color-bg` | `#ffffff` | page |
| `--color-bg-soft` | `#f4f5f7` | alternating section bands, image wells |
| `--color-fg` | `#12141a` | text |
| `--color-fg-muted` | `#5b6170` | secondary text |
| `--color-border` | `#e3e6ec` | hairlines |
| `--border-strong` | `#c9ced8` | inputs, dividers |
| `--color-accent` | `#e11d2a` (red) | primary buttons, prices, active nav, the search button |
| `--color-accent-fg` | `#ffffff` | text on red |
| `--color-accent-2` | `#ff7a1a` (orange) | deals, sale badges, countdowns, hover underlines, 3D rim light |
| `--color-ink` | `#0a0a0a` | top bar, category bar, footer, dark bands |
| `--color-ink-soft` | `#141414` | raised dark surfaces on dark bands |
| `--color-sale` | `#e11d2a` | sale prices |
| `--color-star` | `#ff9f1a` | ratings |
| `--color-success` | `#0d7d43` | in stock (5.21:1 on white; `#0f8a4a` fails AA at 4.42:1) |
| `--ring` | `#e11d2a` | focus rings |

Contrast, computed with the WCAG formula and verified before writing this spec:

| Pair | Ratio |
|---|---|
| white on red `#e11d2a` | 4.76:1 |
| near-black `#12141a` on orange `#ff7a1a` | 7.06:1 |
| text on white | 18.41:1 |
| muted `#5b6170` on white | 6.20:1 |
| red price on white | 4.76:1 |
| white on ink `#0a0a0a` | 19.80:1 |
| `#c9ced8` on ink | 12.54:1 |
| orange on ink | 7.59:1 |
| success `#0d7d43` on white | 5.21:1 |

Orange fills always take dark text; red fills always take white. The existing `contrastRatioHex` test is extended to cover every pair in this table.

**Type.** Headings move from the serif to a tight technical sans: **Chakra Petch** for display (`--font-display`), which suits the techy vibe. Body stays Plus Jakarta Sans, prices stay JetBrains Mono, Bangla stays Hind Siliguri.

**Shape and depth.** Radius drops to 10px for cards and 8px for controls (megastore, not editorial). Cards use a hairline border plus a soft shadow. Dark bands use a subtle diagonal carbon texture at 4% opacity, and a thin red-to-orange gradient rule under section headings.

## 2. Chrome

- **Top bar** (`#0a0a0a`, ~36px): free-delivery promo on the left; track order, language, support on the right. Muted white text with orange hover.
- **Header** (white, sticky with the shadow appearing on scroll): logo, wide search with a red submit button, then account, wishlist, compare and cart with orange count badges.
- **Category bar** (`#0a0a0a`, full width): "All categories" with the mega-menu trigger, then Home, All products, Deals, New arrivals, Best sellers, Track order. The active and hovered item gets a 3px orange underline. It collapses into the mobile drawer below `lg`.
- **Mega menu:** white panel, red column headings, two columns of categories with icons and brands, plus a promo slot on the right.
- **Footer** (`#0a0a0a`): brand and contact, categories, help, payment chips, socials, language, copyright.
- **Mobile:** top bar hides; the header keeps logo, search icon, cart and a menu button; the drawer holds categories, brands and account links.

## 3. Homepage

In order:
1. **Opening row:** left category sidebar (all categories with icons, "All products" footer link) · banner slider (admin banners, or a static hero when there are none) · promo tiles column.
2. **Service strip:** delivery, returns, genuine products, support.
3. **Deal of the day:** black band with an orange countdown, the discounted product, and its price in red.
4. **Category grid:** every category as a compact tile.
5. **Featured products:** dense row carousel.
6. **3D spotlight band:** black, full-bleed; the featured product turns on a dark stage under red and orange rim light, with its name, price and a red "View product" button beside it. Uses the existing `ShowcaseScene` with a new dark lighting preset.
7. **New arrivals** row, **promo banner**, **best sellers** row.
8. **Brand strip**, then the trust strip.

`RecommendedForYou` stays where it already is.

## 4. Components

- **Product card:** white, hairline border, radius 10px. Image in a `#f4f5f7` well. Brand in muted caps, name in two lines, rating, price in red with the struck price muted, and a black "Add to cart" that turns red on hover. Sale badge in orange with dark text; "Sold out" in near-black with white text. Hover raises the card 2px with a stronger shadow and shows the wishlist and compare buttons.
- **Buttons:** primary red with white text; secondary white with a `--border-strong` outline; dark buttons `#0a0a0a`. Hover darkens by 8%.
- **Section heading:** display font, with a 3px red-to-orange gradient rule beneath, and a "View all" link on the right.
- **Listing, cart, checkout, auth, account:** same structure as today, moved onto the new palette: white cards on `#f4f5f7`, red primary actions, orange highlights.

## 5. 3D

Unchanged engine: `SceneCanvas`, `useDeviceTier`, `useSafeTexture`, `FitCamera`, the product viewer with its 3D / Photos toggle and the phone-scroll fix.

What changes is the look:
- Stage: near-black backdrop, a dark plinth (`#141414`) with a thin red ring.
- Lights: neutral key light, a red rim from the left and an orange rim from the right, tuned so product photos stay true.
- The homepage spotlight band uses it at full width; hero keeps a smaller instance beside the banner only when there are no admin banners (otherwise the banner owns that slot).

## 6. Kept as is

- The responsive system: fluid type and space, auto-fitting product grids, container-query sections, viewport-safe heights, safe areas, and `e2e/responsive.spec.ts` (12 sizes × 6 pages) must still pass.
- Admin (`.theme-classic`), the API, `Product.modelUrl`, the CSP model-host allowlist.
- 12px minimum text, 44px minimum mobile tap targets, AA contrast.
- No new dependencies beyond the one new font; First Load JS must not grow beyond +2 kB.

## 7. Testing

- Unit: the contrast pairs for the new palette; existing tests stay green.
- Playwright: the responsive matrix passes unchanged; `three-d.spec.ts` and `storefront.spec.ts` pass; the home test's scene markers still resolve.
- Screenshots at 390, 1440 and 2560 for home, listing, product, cart, checkout and login, reviewed against the goal: premium, technical, dense but readable.

## 8. Out of scope

- Admin redesign
- New product data or CMS-driven homepage ordering
- Changing the API
- Bringing back the neon or warm palettes as options

## Success criteria

- The homepage reads as a dense tech megastore with the black chrome, red actions and orange deals.
- The 3D spotlight band renders on the dark stage, with the 2D fallback when WebGL is unavailable.
- The responsive matrix passes at all 12 sizes with no new violations.
- All text pairs meet AA, verified by unit test.
