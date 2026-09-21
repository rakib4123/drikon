# Futuristic 3D Storefront — Design

**Date:** 2026-09-21
**Status:** Approved (brainstorming), pending spec review
**Scope:** Storefront only — home, listing, product, cart, checkout, auth, account. Admin keeps its current look, except for one new form field.

## Goal

Replace the light "tech megastore" look with a dark neon-cyber interface that has real WebGL 3D. Shopping must stay fast, accessible and SEO-friendly.

## Decisions

| Question | Choice |
|---|---|
| Kind of 3D | Full WebGL: real scenes on storefront pages |
| Approach | **A**: 3D scenes where they matter, plus CSS 3D for dense UI (grids). Not one global canvas for everything; not Spline embeds. |
| Product 3D | Both: an optional `.glb` model per product, otherwise the product photo shown in a 3D scene |
| Mood | Dark neon cyber |

## 1. Visual system

All tokens live in `@theme {}` in `apps/web/src/styles/globals.css`; there is no JS config. Components already read `var(--accent)`, `var(--fg)`, `var(--border)` and so on, so most of the retheme is changing token values.

**Colors**

| Token | Value |
|---|---|
| background | `#05060d` |
| surface (glass) | `rgba(20,24,48,0.55)` + `backdrop-filter: blur(14px)` |
| border | `rgba(120,140,255,0.16)`; hover glow `rgba(34,229,255,0.45)` |
| accent | cyan `#22e5ff` |
| accent-2 | violet `#8b5cf6` |
| sale | magenta `#ff2e88` |
| star | `#ffc940` |
| fg | `#e6ecff` |
| fg-muted | `#8a93b8` |

Text on accent fills uses the dark background colour for contrast. Aim for WCAG AA contrast on body text and controls.

**Admin stays light.** The tokens are global, so the admin layout gets a `.theme-classic` scope that re-declares the current light token values; the admin UI is unchanged.

**Type.** Space Grotesk for display and headings (new, via `next/font`). Plus Jakarta Sans stays for body text, JetBrains Mono for prices, SKUs and labels, and Hind Siliguri for Bangla.

**Surfaces.** `.glass` panel, `.neon-edge` hover glow, gradient-border primary button, glowing pill badges, and a subtle grid/scanline section texture. Component classes stay inside `@layer components`.

**Motion.**
- Motion 11 springs (`stiffness 300, damping 30`), as `CLAUDE.md` requires.
- Product cards get a CSS 3D tilt: `perspective`, up to 8°, and a cursor-following glare.
- Tilt is disabled on `(hover: none)` devices and when `useReducedMotion()` is true.
- Only `transform` and `opacity` are animated.

## 2. 3D architecture

Location: `apps/web/src/components/three/`. Every file is `"use client"` and is mounted through `next/dynamic({ ssr: false })`, so the 3D code never runs on the server and never blocks first paint.

**Dependencies** (in `apps/web` only):
- `three`
- `@react-three/fiber` v9 (React 19)
- `@react-three/drei`, with selected imports only
- `@react-three/postprocessing`

**Shared infrastructure**
- `SceneCanvas`: a wrapper around R3F `<Canvas>`.
  - Limits device pixel ratio (`[1, 1.75]`; `1` on the low tier).
  - Uses `frameloop="demand"` when reduced motion is on or the canvas is off-screen (IntersectionObserver).
  - Pauses rendering when the tab is hidden.
  - Wrapped in an error boundary that renders the given 2D `fallback`.
- `useDeviceTier()` returns `'none' | 'low' | 'high'`:
  - `none`: WebGL unavailable.
  - `low`: coarse pointer plus a small screen, `navigator.connection.saveData`, `deviceMemory <= 4`, or `hardwareConcurrency <= 4`.
  - `high`: everything else.
  - It is a pure function of injectable inputs so it can be unit-tested.
- `useWebGLSupport()` is used inside `useDeviceTier`.

**Scenes**

1. **`SpaceBackdrop`** is mounted once by `SiteChrome` (`components/layout/site-chrome.tsx`), which already covers every non-admin route: the homepage at `app/page.tsx` sits outside the `(shop)` group. It persists across navigations. It sits in a fixed, full-viewport layer behind the content and ignores the pointer.
   - Contents: a neon perspective grid floor (shader or `gridHelper`-style lines), a particle starfield (2000 points on `high`, 600 on `low`) and fog.
   - The camera drifts slightly with the mouse (lerped) and with scroll.
   - Fallback: a CSS radial gradient plus a CSS grid background.
2. **`HeroScene`** (homepage) shows a glowing core, floating glass and neon primitives, and up to 6 featured product photos on rounded glass panels orbiting the core.
   - Hovering a panel scales it and brings it forward; clicking it navigates to `/products/[slug]`.
   - Headline, sub-copy and buttons stay as HTML over the canvas.
   - Fallback: the existing static hero, restyled.
3. **`ProductViewer3D`** takes the main slot of the product page gallery.
   - With `modelUrl`: drei `useGLTF`, `OrbitControls` (drag rotate, zoom clamped), auto-rotating turntable, neon rim lights, contact shadow.
   - Without it: the current photo on a glass panel on a lit, rotating plinth. The existing thumbnails change which photo is shown.
   - A "3D / Photos" toggle always switches to the existing 2D `ProductGallery`. The choice is remembered in `localStorage`, wrapped in try/catch.
   - Loading state: a neon spinner over the 2D image.
   - Fallback: `ProductGallery`.
4. **`CartOrb`** (cart page, small) is a rotating holographic ring with the item count at its centre. It is decorative: `aria-hidden`, and the totals stay in HTML.

Bloom (`@react-three/postprocessing`) runs only on the `high` tier.

**Images in WebGL.**
- Product photos come from allowlisted remote hosts, loaded as textures with `crossOrigin="anonymous"`.
- If a host doesn't send CORS headers, that texture fails. The panel then shows a neutral glass surface, and the HTML still shows the image.
- Cloudinary and Unsplash both send CORS headers.

## 3. Backend: `modelUrl`

- Prisma: `Product.modelUrl String?`, added in one migration.
- DTO validation, matching `videoUrl`:
  - optional
  - `https:` only
  - pathname ends with `.glb` or `.gltf`
  - at most 2048 characters
- Returned on product detail. Added to `@drikon/shared-types` `Product`.
- Admin product form: a "3D model URL (.glb)" text input next to the video URL. No other admin changes.
- No upload endpoint: models are hosted externally, as videos are.

## 4. Fallbacks and accessibility

- Every page renders completely without JavaScript-driven 3D; WebGL enhances it.
- `prefers-reduced-motion`: no auto-rotate, no camera drift, no tilt. Scenes render a still frame.
- Canvases are `aria-hidden`; nothing interactive exists only in WebGL. For example, the hero panels duplicate links already in the HTML product rows.
- A WebGL context loss or a scene error switches that scene to its 2D fallback without breaking the page.

## 5. Performance budget

- The 3D chunk loads only on pages that use a scene, after hydration (dynamic import).
- The listing and checkout first-load JS must not grow by more than 5 kB from this work. The backdrop is lazy.
- Canvases stop rendering when off-screen or when the tab is hidden.

## 6. Testing

- Existing API (192) and web (38) tests stay green; typecheck, lint and build stay clean.
- Unit tests:
  - `modelUrl` validation (accepts `https://…/x.glb`, rejects `http:`, other extensions and `javascript:`)
  - `useDeviceTier` classification
- Playwright:
  - The home, product and cart pages load with WebGL, with no console errors.
  - With WebGL disabled (`--disable-gpu --disable-webgl`), fallbacks render and pages stay usable.
  - The product viewer toggles between 3D and Photos.
  - With reduced motion emulated, there is no tilt transform on cards.
- Screenshots at 390 px and 1440 px for review.
- The build output is checked for the listing and checkout first-load sizes.

## Out of scope

- Admin redesign
- 3D model upload or hosting
- Per-card WebGL thumbnails (approach B)
- AR / WebXR
- Generating 3D models from photos
