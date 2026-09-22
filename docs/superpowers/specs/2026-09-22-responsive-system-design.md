# Responsive System — Design

**Date:** 2026-09-22
**Status:** Approved (brainstorming), pending spec review
**Scope:** The whole storefront: header, footer, homepage, listing, product, cart, checkout, auth and account. Admin is out of scope.
**Base:** `main` at the warm editorial storefront.

## Why

The storefront was designed and checked at two widths, 390px and 1440px. Everywhere else is untested and partly hard-coded:
- content is capped at `1360px`, so a 4K or ultrawide screen shows a narrow strip
- 42 hard-coded font sizes between 10px and 15px never scale, and several are below a comfortable reading size on phones
- section heights are fixed pixels (`h-[280px] sm:h-[380px] lg:h-[460px]`), which crop in landscape phones and look thin on tall monitors
- product grids use fixed column counts up to `xl` (5), so a 2560px screen shows five stretched columns
- 3D scenes use one camera for every container shape

The goal is a system where the UI adapts to any resolution and aspect ratio, rather than a set of sizes that happen to work.

## Decisions (from brainstorming)

| Question | Choice |
|---|---|
| Approach | **A**: fluid `clamp()` scales, auto-fitting grids and container queries, keeping breakpoints for genuine layout switches |
| Very wide screens | Scale up, capped: content grows to `1800px`, then centres with margins |
| Verification | Automated size matrix across 12 sizes, failing the build on real breakages |

## 1. Sizing tokens

All tokens live in `@theme {}` in `apps/web/src/styles/globals.css`.

**Type scale.** Every step is a `clamp(min, preferred, max)` where the preferred term is a `vw`-based value, so text grows smoothly between a 360px phone and a 1920px screen and stops growing beyond it.

| Token | Min (phone) | Max (large) |
|---|---|---|
| `--text-2xs` | 12px | 13px |
| `--text-xs` | 12px | 14px |
| `--text-sm` | 13px | 15px |
| `--text-base` | 15px | 17px |
| `--text-lg` | 17px | 20px |
| `--text-xl` | 19px | 24px |
| `--text-2xl` | 22px | 30px |
| `--text-3xl` | 26px | 38px |
| `--text-4xl` | 30px | 50px |
| `--text-5xl` | 34px | 68px |

**Minimum readable size is 12px.** `--text-2xs` is the floor; nothing on the storefront may set a smaller size.

**Space scale.** `--space-1` through `--space-16`, also `clamp()`-based, so section padding and gaps grow with the screen (roughly 0.75× on phones, 1.35× on 4K relative to today's values).

**Shell.** `.shell` becomes `width: min(1800px, 94vw)` with fluid inline padding, replacing the `1360px` cap and its media query. On screens wider than ~1915px the content is centred with equal margins.

**Breakpoints.** Tailwind's defaults stay (`sm` 640, `md` 768, `lg` 1024, `xl` 1280) and two are added: `2xl` 1536 and `3xl` 1920. Breakpoints are only for layout switches (one column to two), never for type or spacing, which are fluid.

**Reading measure.** Body copy blocks get `max-width: 68ch`, so long text doesn't stretch across a 4K screen.

## 2. Layout rules

- **Product grids** (`components/shop/product-grid.tsx`, carousels, related products) switch from fixed column counts to `repeat(auto-fill, minmax(clamp(9.5rem, 22vw, 15rem), 1fr))`. The column floor is itself fluid, so columns follow the available width:

  | Viewport | Column min | Columns |
  |---|---|---|
  | 390px | 152px | 2 |
  | 768px | 169px | 4 |
  | 1440px | 240px | 5 |
  | 1920px and up (content capped at 1800px) | 240px | 7 |

  Inside the listing page's narrower content column the same rule yields correspondingly fewer, with no extra classes.
- **Two-column sections** (hero, spotlight, category tiles, trust strip) switch on their **own** width with container queries (`@container`), not the viewport. A section in a narrow column stacks even on a wide screen. Each gets `container-type: inline-size` on its wrapper.
- **Section heights** stop being fixed. The showcase slots (`hero-stage.tsx`, `spotlight.tsx`) use `aspect-ratio` with a `min-height` and a `max-height` in `dvh`, so they never exceed the visible viewport on a landscape phone and never look thin on a tall monitor.
- **The header** keeps its floating pill. In short viewports (height under 500px, landscape phones) its vertical padding halves. It never becomes taller than 20% of the viewport height.
- **Safe areas:** the header's top inset and the footer's bottom padding add `env(safe-area-inset-*)`, so notched phones don't clip them.
- **No horizontal scrolling at 320px.** The narrowest supported width is 320px.

## 3. Type sweep

The 42 hard-coded `text-[10px] … text-[15px]` class instances (and the `w-[18px]`/`h-[18px]` icon pairs beside them) are replaced by the fluid tokens through Tailwind utilities (`text-2xs`, `text-xs`, …). Icons next to text use `em` units so they scale with their label.

Mapping: 10px and 11px → `--text-2xs`; 12px and 13px → `--text-xs`; 14px and 15px → `--text-sm`. Anything already using Tailwind's own `text-sm`/`text-base` scale keeps working, because `@theme` redefines those tokens fluidly.

## 4. 3D scenes

- `SceneCanvas` already caps device pixel ratio and pauses off-screen. It gains an aspect-aware camera: a small `useThree` helper reads `viewport.aspect` and adjusts the camera distance (or `fov`) so the subject fits with a constant margin in portrait, square and landscape containers.
- `ShowcaseLoader`'s 2D fallback follows the same aspect rules, so the switch between fallback and scene never changes layout.
- Canvas size follows its container, which the container queries above already size correctly.

## 5. Verification: the size matrix

A new Playwright spec, `apps/web/e2e/responsive.spec.ts`, loads each of `/`, `/products`, a product page, `/cart`, `/checkout` (with faked auth) and `/login` at these sizes:

| Name | Size |
|---|---|
| small phone | 320×568 |
| phone | 360×800 |
| phone large | 390×844 |
| phone landscape | 844×390 |
| tablet portrait | 768×1024 |
| tablet landscape | 1024×768 |
| laptop | 1280×800 |
| desktop | 1440×900 |
| portrait monitor | 1080×1920 |
| full HD | 1920×1080 |
| QHD ultrawide | 2560×1080 |
| 4K | 3840×2160 |

At every size, each page must satisfy:
1. **No horizontal scrolling:** `document.documentElement.scrollWidth <= innerWidth + 1`.
2. **No text overflowing its own box:** for every text element, `scrollWidth <= clientWidth + 1`, excluding elements with a deliberate `overflow-x: auto` scroller.
3. **Tap targets:** at widths under 768px, every button and link has a box of at least 44×44 CSS px, unless it's inline within a paragraph.
4. **Readable text:** no rendered text has a computed `font-size` under 12px.
5. **The header is visible and inside the viewport,** and the page's `<h1>` is visible.

Screenshots for each page and size go to the run's artifacts directory for review.

The matrix runs in CI without the API, like the existing suite, so pages render their empty states. Tests skip the product-dependent pages when there are no products, matching the current convention.

## 6. Constraints

- No visual regression at 390px and 1440px beyond the intended smoothing.
- First Load JS must not grow: this is CSS and markup only, with no new dependencies.
- Existing unit tests, typecheck, lint and the current e2e suite stay green.
- Admin (`.theme-classic`) is untouched.
- Motion rules from `CLAUDE.md` still apply; container queries and `clamp()` are CSS, so nothing animates on resize.

## 7. Out of scope

- Admin responsiveness
- Serving different image resolutions per breakpoint beyond what `next/image` `sizes` already does
- RTL layout
- Print styles

## Success criteria

- The matrix passes at all 12 sizes on all 6 pages.
- On a 4K screen the catalogue shows 6 or more product columns, with content centred inside 1800px.
- On a 320px phone nothing scrolls sideways and no text is under 12px.
- On a landscape phone (844×390) the hero and product viewer fit without cropping.
