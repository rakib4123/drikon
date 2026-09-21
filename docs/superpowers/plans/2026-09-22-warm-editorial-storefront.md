# Warm Editorial Storefront Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the dark-neon/megastore storefront with the approved Warm Premium palette and Editorial Store layout. The storefront keeps calm, contained 3D: a hero, spotlights and the product viewer.

**Architecture:**
- Retheme through `@theme` token values in `globals.css`, and remove the neon-only CSS and 3D files.
- A new reusable, non-interactive `ShowcaseScene` (product on a warm stand) powers the hero and two spotlights. It sits on the existing `SceneCanvas` / `useDeviceTier` / `useSafeTexture` infrastructure.
- The header becomes one floating bar. The homepage is recomposed into editorial sections.

**Tech Stack:** Next.js 15.5 App Router, React 19.2, Tailwind v4 (`@theme`), Motion 11 (`motion/react`), R3F 9.7 / drei 10.7.8 / three 0.186, Radix NavigationMenu, next-intl (en/bn), Vitest, Playwright.

**Spec:** `docs/superpowers/specs/2026-09-22-warm-editorial-storefront-design.md`

## Global Constraints

- **Branch:** `warm-editorial-storefront`. Commit per task. Every commit message ends with `Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>`.
- **Tooling:** pnpm only. Motion is imported from `motion/react`. `'use client'` only on files that use state, effects, handlers, Motion or R3F. Props use explicit types; no `any`.
- **Tokens** (verbatim from the spec):

  | Token | Value |
  |---|---|
  | bg | `#f5f1ea` |
  | bg-soft | `#efe9df` |
  | surface / surface-solid | `#fffdf9` |
  | border | `#e7dfd3` |
  | border-strong | `#d6cbbb` |
  | fg | `#1c1917` |
  | fg-muted | `#57534e` |
  | accent | `#1c1917` |
  | accent-fg | `#fffdf9` |
  | accent-2 (bronze) | `#b45309` |
  | sale | `#b91c1c` |
  | success | `#15803d` |
  | star | `#d97706` |
  | ink | `#1c1917` |
  | ring | `#b45309` |
- **Surfaces:** all content surfaces are solid. There is no grid, stars, translucent glass or backdrop canvas behind text.
- **Contrast:** every storefront text/background pair meets WCAG AA (4.5:1 body text, 3:1 large text and UI).
- **Fonts:** Fraunces (headings, `--font-display`, weights 500/600). Plus Jakarta Sans (body), JetBrains Mono (prices/SKU) and Hind Siliguri (Bangla, second in every stack) stay.
- **Shape:** radius card 16px, ctl 12px; shadows `rgba(28,25,23,0.08)`.
- **Tilt:** max 5°, fine pointers only, off under reduced motion.
- **Admin:** `.theme-classic` keeps its current look; the only admin change is using `var(--accent-fg)` for text on accent fills.
- **3D:**
  - Scenes load only via `next/dynamic({ ssr: false })` from `components/three/*`.
  - Canvases are `aria-hidden`.
  - At most 3 canvases on the homepage, each paused off-screen.
  - No bloom or post-processing on storefront scenes.
- **Markers:**
  - `data-scene="<name>"` / `data-scene-fallback="<name>"`
  - names: `hero`, `spotlight`, `product`
  - the homepage has exactly one `<h1>`
- **Budget:** `/products` and `/checkout` First Load JS grows by no more than 5 kB versus `main` (main: 225 kB / 174 kB).
- **Verification commands** (from the repo root):
  - `pnpm --filter @drikon/web test`
  - `pnpm --filter @drikon/web typecheck`
  - `pnpm lint`
  - `pnpm --filter @drikon/web build`
- **Local services:**
  - API: `cd apps/api && WEB_ORIGIN=http://localhost:3000,http://localhost:3100 node dist/main.js`. Build it first with `pnpm --filter @drikon/api build` if `dist` is stale.
  - Web: `pnpm --filter @drikon/web exec next start -p 3100`.
  - Chromium: `/home/dextro/.cache/ms-playwright/chromium-1234/chrome-linux64/chrome` with `['--use-angle=swiftshader','--enable-unsafe-swiftshader']`.
  - E2E: `PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH=<that path>`.
  - Stop the web server with `kill $(fuser 3100/tcp 2>/dev/null)` (never `pkill -f`).
- **Screenshots:** `/tmp/claude-1000/-home-dextro-Desktop-RED-PROJECTS-drikon/b155f20b-fd1c-4401-bd18-3d4763fce40d/scratchpad/warm/`

---

### Task 1: Warm tokens, Fraunces, contrast test, accent override

**Files:**
- Modify: `apps/web/src/styles/globals.css`
- Modify: `apps/web/src/app/layout.tsx`
- Modify: `apps/web/src/lib/contrast.ts`
- Test: `apps/web/src/lib/contrast.test.ts`
- Modify: admin files with `bg-[color:var(--accent)] text-white`:
  - `app/(admin)/admin/layout.tsx`
  - `components/admin/admin-sidebar.tsx`
  - `components/admin/product-form.tsx`
  - `.theme-classic .btn-primary` in globals.css

**Interfaces:**
- Produces:
  - `export function contrastRatioHex(a: string, b: string): number` in `lib/contrast.ts`
  - all spec tokens as CSS variables
  - `--font-display` bound to Fraunces
- Consumes: the existing `accentForeground(hex)`.

- [ ] **Step 1: Failing test.** Append to `apps/web/src/lib/contrast.test.ts`:
```ts
import { contrastRatioHex } from './contrast';

describe('warm palette contrast (spec §1)', () => {
  const pairs: [string, string, string, number][] = [
    ['body text on page', '#1c1917', '#f5f1ea', 4.5],
    ['muted text on page', '#57534e', '#f5f1ea', 4.5],
    ['body text on card', '#1c1917', '#fffdf9', 4.5],
    ['muted text on card', '#57534e', '#fffdf9', 4.5],
    ['button text on black', '#fffdf9', '#1c1917', 4.5],
    ['bronze link on card', '#b45309', '#fffdf9', 4.5],
    ['white on sale badge', '#ffffff', '#b91c1c', 4.5],
    ['in-stock green on card', '#15803d', '#fffdf9', 4.5],
    ['cream text on ink band', '#fffdf9', '#1c1917', 4.5],
    ['focus ring vs page', '#b45309', '#f5f1ea', 3],
  ];
  it.each(pairs)('%s meets its minimum', (_label, fg, bg, min) => {
    expect(contrastRatioHex(fg, bg)).toBeGreaterThanOrEqual(min);
  });
  it('is symmetric and 21 for black/white', () => {
    expect(contrastRatioHex('#000000', '#ffffff')).toBeCloseTo(21, 1);
    expect(contrastRatioHex('#ffffff', '#000000')).toBeCloseTo(21, 1);
  });
});
```
If the file doesn't already import `describe`/`it`/`expect` from `vitest`, add the import.

- [ ] **Step 2: Run it and confirm it fails.** Run `pnpm --filter @drikon/web exec vitest run src/lib/contrast.test.ts`. Expected: FAIL (`contrastRatioHex` not exported).

- [ ] **Step 3: Implement.** In `lib/contrast.ts`, add:
```ts
/** WCAG contrast ratio (1–21) between two hex colours. Invalid input → 1. */
export function contrastRatioHex(a: string, b: string): number {
  const ra = parseHex(a);
  const rb = parseHex(b);
  if (!ra || !rb) return 1;
  return contrastRatio(relativeLuminance(...ra), relativeLuminance(...rb));
}
```

- [ ] **Step 4: Run it and confirm it passes.** Same command. Expected: PASS. If any pair fails, stop and report; don't change the spec colours.

- [ ] **Step 5: Retheme `globals.css`.**
  - Replace the `@theme` colour values with the Global Constraints token table:
    - `--color-bg`, `--color-bg-soft`, `--color-fg`, `--color-fg-muted`, `--color-border`
    - `--color-accent` `#1c1917`, `--color-accent-2` `#b45309`, `--color-accent-fg` `#fffdf9`, `--color-ring` `#b45309`
    - `--color-ink` `#1c1917`, `--color-ink-soft` `#292524`
    - `--color-sale` `#b91c1c`, `--color-success` `#15803d`, `--color-star` `#d97706`
    - `--font-display: var(--font-fraunces), var(--font-bangla), ui-serif, Georgia, serif;`
    - `--radius-card: 16px; --radius-ctl: 12px;`
  - In the plain `:root` block, set:
    - `--surface` and `--surface-solid`: `#fffdf9`
    - `--image-well`: `#efe9df`
    - `--border-strong`: `#d6cbbb`
    - `--glass`: `#fffdf9`
    - `--shadow`: `rgba(28, 25, 23, 0.08)`
    - `color-scheme: light;`
    - remove `--glow-edge` and `--grid-line` if nothing outside the removed classes uses them (`grep -rn "glow-edge\|grid-line" apps/web/src`). Keep a variable if something still uses it, but give it a warm value.
  - Rewrite the header comment of the token block to describe Warm Premium.
  - Components layer:
    - `.btn-primary`: background `var(--accent)`, colour `var(--accent-fg)`, a soft shadow and no glow; hover `background: #292524`.
    - `.btn-ghost`: background `var(--surface)`, border `var(--border-strong)`; hover border `var(--fg)`.
    - `.card`: solid `var(--surface)`, `backdrop-filter: none`, shadow `0 1px 2px var(--shadow), 0 8px 24px -16px var(--shadow)`.
    - `.card-hover:hover`: border `var(--border-strong)`, shadow `0 14px 32px -18px rgba(28,25,23,0.25)`.
    - `.badge-sale`: background `var(--color-sale)`, colour `#ffffff`.
    - `.badge-deal`: background `var(--color-accent-2)`, colour `#fffdf9`.
    - `.section-title` / `.display` / `.font-display`: `font-family: var(--font-display); font-weight: 600; letter-spacing: -0.015em;`.
    - `.skeleton`: base `var(--bg-soft)`, shimmer `rgba(255,253,249,0.7)`.
    - Delete `.neon-text`, `.neon-edge`, `.grid-texture`, `.space-fallback`, `.aurora`, `.grain`, `.bg-drikon-mesh` and `.text-glow` **only if** `grep -rn "<class>" apps/web/src --include=*.tsx` finds no remaining users. Otherwise leave them for Task 2/5 to remove along with their users, and note them in your report.
  - `.theme-classic`: keep it all. Change `.theme-classic .btn-primary { color: #ffffff; … }` to `color: var(--accent-fg);`. `.theme-classic` defines `--color-accent-fg: #ffffff`, so admin is unchanged.
  - `::selection`: background `#b45309`, colour `#fffdf9`.

- [ ] **Step 6: `layout.tsx`.**
  - Replace the `Space_Grotesk` font with `Fraunces`, importing `Fraunces` from `next/font/google`:
    ```ts
    const fraunces = Fraunces({ subsets: ['latin'], weight: ['500', '600'], variable: '--font-fraunces', display: 'swap' });
    ```
    Replace `${grotesk.variable}` with `${fraunces.variable}` in the `<html>` className. Update the comment.
  - Set `themeColor: '#f5f1ea'`, with the comment "Matches the cream storefront background."
  - Accent override: on the storefront, the admin `accentColor` now drives the bronze highlight; admin behaviour is unchanged. Replace `accentCss` with:
    ```ts
    const storefrontAccent = s.accentColor
      ? `:root{--color-accent-2:${s.accentColor};--color-ring:${s.accentColor};}`
      : '';
    const adminAccent =
      s.accentColor || s.accentColor2
        ? `.theme-classic{${
            s.accentColor
              ? `--color-accent:${s.accentColor};--color-ring:${s.accentColor};--color-accent-fg:${accentForeground(s.accentColor)};`
              : ''
          }${s.accentColor2 ? `--color-accent-2:${s.accentColor2};` : ''}}`
        : '';
    const accentCss = storefrontAccent + adminAccent || null;
    ```
    Also guard against injection. Before this block, add `const HEX = /^#[0-9a-fA-F]{6}$/;` and only use `s.accentColor` / `s.accentColor2` when `HEX.test(...)`. Treat anything else as unset. Update the comment: the storefront accent is black, so the brand colour drives the bronze highlight and ring; admin keeps the full override; values are re-validated because they're interpolated into a `<style>` tag.

- [ ] **Step 7: Admin text on accent fills.** In `app/(admin)/admin/layout.tsx`, `components/admin/admin-sidebar.tsx` and `components/admin/product-form.tsx`, replace `text-white` with `text-[color:var(--accent-fg)]` only on elements whose background is `bg-[color:var(--accent)]`. Find them with `grep -n "bg-\[color:var(--accent)\].*text-white\|text-white.*bg-\[color:var(--accent)\]"`.

- [ ] **Step 8: Verify.** Run the four verification commands, all clean. Expect the unit test count to rise by the new cases.

- [ ] **Step 9: Commit.** Message: `feat(web): warm premium tokens, Fraunces headings, brand colour drives bronze`.

---

### Task 2: Remove the neon-only 3D and chrome

**Files:**
- Delete:
  - `apps/web/src/components/three/space-backdrop.tsx`, `backdrop-loader.tsx`
  - `hero-scene.tsx`, `hero-scene-loader.tsx`
  - `cart-orb.tsx`, `cart-orb-loader.tsx`
- Modify:
  - `components/layout/site-chrome.tsx`: remove `<BackdropLoader />`
  - `app/(shop)/cart/page.tsx`: remove `CartOrbLoader`; the heading becomes `<h1 className="font-display mt-4 mb-6 text-2xl md:text-3xl">…</h1>`, keeping the count span
  - `components/three/scene-canvas.tsx`: `SceneName` becomes `'hero' | 'spotlight' | 'product'`
  - `components/home/hero-stage.tsx`: temporarily render the copy-only hero. Remove the `HeroSceneLoader` import and the scene layer; keep the text. Task 5 replaces this file.
  - `e2e/three-d.spec.ts`:
    - remove backdrop and cart assertions
    - the home test asserts `canvas` count is 0 for now and that there is one `h1`
    - WebGL-off asserts no `canvas`
    - keep the product viewer and tilt tests
  - `globals.css`: delete the neon classes listed in Task 1 Step 5 that now have no users

**Interfaces:**
- Produces: `SceneName = 'hero' | 'spotlight' | 'product'`.
- Consumes: nothing new.

- [ ] **Step 1:** Delete the six files. Then run `grep -rn "space-backdrop\|backdrop-loader\|hero-scene\|cart-orb\|BackdropLoader\|HeroSceneLoader\|CartOrbLoader" apps/web/src apps/web/e2e`. Fix every hit as listed above, until the grep returns nothing.
- [ ] **Step 2:** Update `SceneName`. Run typecheck and fix any leftover `'backdrop'` / `'cart'` usages.
- [ ] **Step 3:** Delete the neon CSS classes with no users. Re-run the grep for each class name to confirm.
- [ ] **Step 4: Verify.** The four commands are clean. Start the API and web, then run `cd apps/web && PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH=… pnpm exec playwright test e2e/three-d.spec.ts`. Everything passes. Stop the web server.
- [ ] **Step 5: Commit.** Message: `refactor(web): remove neon backdrop, orbit hero and cart orb`.

---

### Task 3: `ShowcaseScene`, the product on a warm stand

**Files:**
- Create: `apps/web/src/components/three/showcase-scene.tsx` (default export)
- Create: `apps/web/src/components/three/showcase-loader.tsx`

**Interfaces:**
- Consumes:
  - `SceneCanvas({ name: SceneName, tier: 'low'|'high', fallback: ReactNode, className?, camera?, children })`
  - `useDeviceTier(): 'none'|'low'|'high'|null`
  - `useSafeTexture(url: string|null): { texture: Texture|null; failed: boolean }`
- Produces:
  - `ShowcaseLoader({ name: 'hero' | 'spotlight'; imageUrl: string | null; modelUrl?: string | null; alt: string; className?: string })`: client component. Renders a static 2D fallback (the photo on a cream disc) until the 3D is ready; renders only the fallback when the tier is `none`/`null` or both URLs are null.

- [ ] **Step 1: `showcase-scene.tsx`.**
```tsx
'use client';

import { Suspense, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { Center, ContactShadows, Image as DreiImage, useGLTF } from '@react-three/drei';
import { useReducedMotion } from 'motion/react';
import type { Group } from 'three';
import { SceneCanvas, type SceneName } from './scene-canvas';
import { useSafeTexture } from '@/lib/three/use-safe-texture';

const CREAM = '#f3ece1';
const BRONZE = '#b45309';

/** Cream stand with a thin bronze ring — the constant base of every showcase. */
function Stand() {
  return (
    <group position={[0, -0.95, 0]}>
      <mesh receiveShadow>
        <cylinderGeometry args={[1.05, 1.15, 0.2, 64]} />
        <meshStandardMaterial color={CREAM} roughness={0.55} metalness={0.05} />
      </mesh>
      <mesh position={[0, 0.101, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <ringGeometry args={[0.98, 1.02, 96]} />
        <meshStandardMaterial color={BRONZE} roughness={0.35} metalness={0.6} />
      </mesh>
    </group>
  );
}

function Turntable({ spin, full, children }: { spin: boolean; full: boolean; children: React.ReactNode }) {
  const g = useRef<Group>(null);
  useFrame(({ clock }, d) => {
    if (!spin || !g.current) return;
    if (full) g.current.rotation.y += d * 0.35;
    else g.current.rotation.y = Math.sin(clock.elapsedTime * 0.5) * 0.35;
  });
  return <group ref={g}>{children}</group>;
}

function Photo({ url }: { url: string }) {
  const { texture } = useSafeTexture(url);
  if (!texture) return null; // stand alone while loading or on failure — no console errors
  return <DreiImage texture={texture} scale={[1.55, 1.55]} radius={0.08} position={[0, -0.05, 0]} />;
}

function Model({ url }: { url: string }) {
  // Plain glTF only (no Draco/Meshopt) — see CSP notes in next.config.mjs.
  const { scene } = useGLTF(url, false, false);
  return (
    <Center top position={[0, -0.85, 0]}>
      <primitive object={scene} scale={1.2} />
    </Center>
  );
}

export default function ShowcaseScene({
  name,
  tier,
  imageUrl,
  modelUrl,
  fallback,
}: {
  name: SceneName;
  tier: 'low' | 'high';
  imageUrl: string | null;
  modelUrl?: string | null;
  fallback: React.ReactNode;
}) {
  const spin = !useReducedMotion();
  return (
    <SceneCanvas name={name} tier={tier} fallback={fallback} className="h-full w-full" camera={{ position: [0, 0.35, 4.4], fov: 38 }}>
      <hemisphereLight args={['#fff7ed', '#e7dfd3', 0.9]} />
      <directionalLight position={[2.5, 4, 3]} intensity={1.6} color="#fff1dc" />
      <directionalLight position={[-3, 1.5, -2]} intensity={0.6} color="#fde7c7" />
      <Stand />
      <Turntable spin={spin} full={!!modelUrl}>
        {modelUrl ? (
          <Suspense fallback={null}>
            <Model url={modelUrl} />
          </Suspense>
        ) : imageUrl ? (
          <Photo url={imageUrl} />
        ) : null}
      </Turntable>
      <ContactShadows position={[0, -1.06, 0]} opacity={0.35} scale={5} blur={2.6} far={2} color="#57534e" />
    </SceneCanvas>
  );
}
```
If a drei prop doesn't type-check against 10.7.8 (`Image` `texture`, `ringGeometry` args, `Center top`), check the `.d.ts` and use the nearest equivalent. Note each change.

- [ ] **Step 2: `showcase-loader.tsx`.**
```tsx
'use client';

import dynamic from 'next/dynamic';
import { useDeviceTier } from '@/lib/three/use-device-tier';
import { ProductThumb } from '@/components/shop/product-thumb';
import { cn } from '@/lib/utils';

const ShowcaseScene = dynamic(() => import('./showcase-scene'), { ssr: false });

/**
 * A product on a warm stand. The 2D fallback (photo on a cream disc) renders
 * on the server and on devices without WebGL; the 3D scene replaces it once
 * the device qualifies. Non-interactive — the page always scrolls.
 */
export function ShowcaseLoader({
  name,
  imageUrl,
  modelUrl = null,
  alt,
  className,
}: {
  name: 'hero' | 'spotlight';
  imageUrl: string | null;
  modelUrl?: string | null;
  alt: string;
  className?: string;
}) {
  const tier = useDeviceTier();
  const fallback = (
    <div data-scene-fallback={name} className="relative grid h-full w-full place-items-center">
      <div className="absolute bottom-[12%] h-[16%] w-[62%] rounded-[50%] bg-[#e7dfd3] shadow-[0_18px_30px_-12px_rgba(28,25,23,0.35)]" />
      <div className="relative aspect-square w-[58%] overflow-hidden rounded-[var(--radius-card)]">
        {imageUrl && <ProductThumb src={imageUrl} alt={alt} sizes="(min-width: 1024px) 30vw, 60vw" />}
      </div>
    </div>
  );
  const can3d = !!tier && tier !== 'none' && (!!imageUrl || !!modelUrl);
  return (
    <div className={cn('relative', className)}>
      {can3d ? (
        <ShowcaseScene name={name} tier={tier === 'high' ? 'high' : 'low'} imageUrl={imageUrl} modelUrl={modelUrl} fallback={fallback} />
      ) : (
        fallback
      )}
    </div>
  );
}
```
Check `ProductThumb`'s real props in `components/shop/product-thumb.tsx`, and adapt `src`/`alt`/`sizes` to them.

- [ ] **Step 3: Verify.** Run typecheck, lint and build. Nothing imports ShowcaseLoader yet; Task 5 does the first render. Check that the build output has no new first-load weight on `/products`.
- [ ] **Step 4: Commit.** Message: `feat(web): ShowcaseScene — product on a warm stand for hero and spotlights`.

---

### Task 4: Floating header and ink footer

**Files:**
- Modify: `components/layout/navbar.tsx`, `mega-menu.tsx`, `mobile-menu.tsx`, `header-search.tsx`, `footer.tsx`, `language-switcher.tsx`, `count-badge.tsx`
- Modify: `app/layout.tsx`: drop `<TopBar …/>` from the `header` prop
- Delete: `components/layout/top-bar.tsx`, if nothing else imports it
- Modify: `src/messages/en.json` and `bn.json` for any new nav labels (namespace `nav`)

**Interfaces:**
- Consumes: the existing `Navbar({ brand, categories })`, `HeaderSearch`, `MegaMenu`, `MobileMenu` and `Footer` props. Keep their prop signatures unless the change is necessary, and list it if so.
- Produces: the same exports (no renames), so `app/layout.tsx` wiring stays a one-line change.

**Requirements** (spec §2 Header / Footer):
- **Header shell:**
```tsx
<header className="sticky top-3 z-40 px-3 sm:px-4">
  <div className="mx-auto flex h-16 max-w-[1320px] items-center gap-3 rounded-full border border-[color:var(--border)] bg-[color:var(--surface-solid)] px-4 shadow-[0_8px_30px_-12px_rgba(28,25,23,0.18)] sm:px-6">
    {/* logo · desktop nav (Shop ▾ panel, Deals, New, Track order) · search · language · account · wishlist · compare · cart */}
  </div>
</header>
```
- **"Shop ▾"** is the existing Radix NavigationMenu mega menu, restyled as a solid cream panel with a 16px radius and a soft shadow. It has two columns: categories (icon and name) and top brands. It replaces the full-width accent category bar entirely; delete that bar's markup from navbar.tsx.
  - Links: Deals → `/products?featured=true`, New → `/products?sort=newest`, Track order → `/orders`.
  - Use existing i18n keys where they exist; add missing ones to both en and bn.
- **Search:** a pill input with a solid `var(--bg-soft)` fill and no accent border. The submit button is a black circle with a cream icon.
- **Icons:** 20px, `var(--fg)`, hover `var(--accent-2)`. Count badges are bronze with cream text.
- **Mobile (<lg):** logo · search icon button (opens the existing search UI) · cart · menu button opening `MobileMenu`. The drawer uses a solid cream panel with Fraunces section titles.
- **Focus:** every interactive element shows a 2px bronze `focus-visible` ring (`outline: 2px solid var(--ring); outline-offset: 2px`). Remove any `outline-none` that has no visible replacement.
- **Footer:** `bg-[color:var(--color-ink)]` with cream text `#fffdf9` and muted `#d6cbbb`. Columns: brand and tagline, categories, help (track order, shipping & returns, contact, privacy, terms), contact and socials. Bottom row: payment chips, language, copyright. Socials are cream icons with a bronze hover. Keep the existing props and data.

- [ ] **Step 1:** Implement the header and delete the top bar. The free-shipping promo is shown by the trust strip in Task 5.
- [ ] **Step 2:** Implement the footer.
- [ ] **Step 3: Verify.**
  - Run the four commands.
  - Start the API and web, and screenshot `/` and `/products` at 1440 and 390 (390 with the mobile menu open too) into the screenshots dir.
  - Look at them. Check with the `contrastRatioHex` values you used that header text, icons and footer text all meet AA.
  - Tab through the header at 1440, screenshot the focus ring on the Shop trigger, and confirm it's visible.
- [ ] **Step 4: Commit.** Message: `feat(web): floating cream header and ink footer`.

---

### Task 5: Editorial homepage

**Files:**
- Rewrite: `components/home/hero-stage.tsx`
- Create:
  - `components/home/category-tiles.tsx`
  - `components/home/spotlight.tsx`
  - `components/home/trust-strip.tsx` (replaces `service-strip.tsx`; delete the old file once unused)
- Modify:
  - `app/page.tsx`
  - `components/home/section-header.tsx`, `product-row.tsx`, `promo-banner.tsx` (restyle only)
  - `components/shop/hero-slider.tsx`, `brand-strip.tsx`, `flash-sale-section.tsx` (restyle only)
- Delete when unused:
  - `components/home/category-sidebar.tsx`, `promo-tiles.tsx`, `category-grid.tsx`
  - neon CSS classes that are now unused
- Modify: `src/messages/en.json` and `bn.json` (namespace `home`) for new labels
  - trust strip: "Free delivery over ৳3,000", "14-day returns", "Genuine devices", "Real support"
  - "View product", "Shop the category", "products" count label
  - Bangla must be real Bangla (for example "৳৩,০০০-এর বেশি অর্ডারে ফ্রি ডেলিভারি", "১৪ দিনে রিটার্ন", "আসল ডিভাইস", "সত্যিকারের সাপোর্ট", "প্রোডাক্ট দেখুন", "ক্যাটাগরি দেখুন").

**Interfaces:**
- Consumes:
  - `ShowcaseLoader({ name, imageUrl, modelUrl?, alt, className? })`
  - `ResolvedContent` from `@/lib/settings` (`heroBadge`, `heroTitle`, `heroSubtitle`, `heroCtaHref`, `heroCtaLabel`, `heroCtaAltHref`, `heroCtaAltLabel`)
  - `ProductSummary` and the categories type used by `getCategories()` (check `lib/catalog.ts`)
  - `localize(name, nameBn, locale)` for product and category names
- Produces:
  - `HeroStage({ c, product }: { c: ResolvedContent; product: ProductSummary | null })`
  - `CategoryTiles({ categories })`
  - `Spotlight({ product, flip, labels })`
  - `TrustStrip()`

**Requirements** (spec §2 Homepage, in this order):
1. **HeroStage**, a solid `var(--surface)` section with a 16px radius, two columns from `lg` and stacked below.
   - Left: `badge-deal` with `c.heroBadge`, then `<h1 className="font-display text-4xl sm:text-5xl lg:text-6xl leading-[1.05]">` with `c.heroTitle` (split on `\n` with `<br/>`), then the subtitle in `--fg-muted`, then `btn-primary` and `btn-ghost` CTAs.
   - Right: `<ShowcaseLoader name="hero" imageUrl={product?.images?.[0]?.url ?? null} alt={…} className="h-[280px] sm:h-[380px] lg:h-[460px]" />`.
   - Motion: the entrance fade and rise on the text column follows the CLAUDE.md pattern, in a small client leaf only if needed. Otherwise use the existing CSS `animate-fade-up`.
2. **CategoryTiles:** the first 3 categories as large tiles (`card card-hover`, 16px radius, image or icon on a `var(--image-well)` block, Fraunces name, "Shop the category →"), each wrapped in the existing `TiltCard`. Tilt is max 5°: add an optional `max` prop to `TiltCard`, default 5, passed into `tiltFromPointer(…, max)`. Below the tiles, a row of chips for all categories.
3. **Campaigns:** `{banners.length > 0 && <HeroSlider slides={banners} />}`, restyled with a 16px radius, cream arrows and bronze dots.
4. **Spotlight 1** (`featured[1]`), then **New arrivals** (`ProductRow`, newest), then **FlashSaleSection** (dark ink band, restyled, still renders only while live), then **Spotlight 2** (`featured[2]`, `flip`), then **Best sellers** (`ProductRow`, popular), then **BrandStrip**, then **TrustStrip**. Keep `RecommendedForYou` wherever page.tsx already renders it.
   - **Spotlight** is a two-column section: text (kicker "Spotlight", Fraunces `<h2>` with the product name, short description, price in `price-now`, "View product" `btn-primary` link to `/products/{slug}`) and `ShowcaseLoader name="spotlight" imageUrl=… modelUrl=null`. `flip` swaps the columns from `lg`. It renders nothing if `product` is null or has no image.
   - Choose the spotlight products from `featured.filter(p => p.images?.[0]?.url)`: `[0]` is the hero, `[1]` and `[2]` are the spotlights.
5. **Removed:** `CategorySidebar`, `PromoTiles`, `CategoryGrid` and the old `ServiceStrip` usage, and their files if nothing else imports them.
6. Section titles are `<h2>`, and there is exactly one `<h1>`.

- [ ] **Step 1:** Add the `max` prop to TiltCard and a unit test in `src/lib/tilt.test.ts`: `tiltFromPointer(300, 200, rect, 5)` returns `{ rotateX: 5, rotateY: 5, glareX: 100, glareY: 0 }`. Run the test and see it pass. `tiltFromPointer` already takes `max`, so the test documents the 5° cap. Change ProductCard to use TiltCard's default of 5.
- [ ] **Step 2:** Build the components and page.tsx as specified.
- [ ] **Step 3: Verify.**
  - Run the four commands.
  - With the API and web running, screenshot `/` full-page at 1440 and 390. Scroll first (`window.scrollTo` in steps) so `whileInView` sections render.
  - Look at the screenshots: nothing behind text, the hero 3D stand visible, spotlights alternating, tiles readable.
  - Check `curl -s localhost:3100/ | grep -o '<h1' | wc -l` gives 1, and that `[data-scene="hero"] canvas` exists with swiftshader.
- [ ] **Step 4: Commit.** Message: `feat(web): editorial homepage — hero stage, category tiles, spotlights`.

---

### Task 6: Product viewer on a warm stage, and the phone-scroll fix

**Files:**
- Modify: `apps/web/src/components/three/product-viewer-3d.tsx`, `apps/web/src/components/shop/product-media.tsx`

**Interfaces:**
- Consumes: the existing viewer props `{ tier, modelUrl, imageUrl, onFail, onReady }`.
- Produces: the same props (no signature change).

**Requirements** (spec §3 "Product page viewer"):
- **Stage:**
  - The background colour is `#efe9df`; remove the `<color attach="background" args={['#070914']}>` dark value.
  - Wrapper `bg-[#070914]` in product-media.tsx → `[background:var(--image-well)]`.
  - Lights are warm, like ShowcaseScene. There is no neon cyan or violet anywhere.
  - PhotoPlinth: the cylinder colour is cream `#f3ece1` and the ring is bronze `#b45309` (use a `ringGeometry` on top, like `Stand` in showcase-scene.tsx, or restyle the torus with a bronze material). Contact shadows are `#57534e`.
  - The hint text stays in `--fg-muted`.
- **Phone-scroll fix:** OrbitControls attaches to R3F's `events.connected` wrapper div, not the canvas, and sets `touch-action: none` there.
  - Remove the current `TouchActionSync` approach.
  - On coarse pointers, **do not mount `<OrbitControls>` at all** until the visitor taps the "Tap to rotate" button (keep the existing `pdp.viewerTapHint`). Before that, the model turns on its own turntable: add a `Turntable`-style `useFrame` rotation around the model when controls aren't mounted and reduced motion is off. Tapping mounts OrbitControls (`enableZoom={false}`, `enablePan={false}`).
  - On fine pointers, mount OrbitControls as today, with `enableZoom={false}`.
  - In photo mode there are no OrbitControls (already true).
- Keep ReadySignal inside Suspense, useSafeTexture, the FailSignal paths and the `useGLTF(url, false, false)` comment.

- [ ] **Step 1:** Implement.
- [ ] **Step 2: Verify.**
  - Run the four commands.
  - Set a model on one local product: `docker exec -i drikon-postgres psql -U drikon -d drikon -c "UPDATE \"Product\" SET \"modelUrl\"='https://modelviewer.dev/shared-assets/models/Astronaut.glb' WHERE slug='google-pixel-watch-2';"`.
  - Build web with `NEXT_PUBLIC_MODEL_HOSTS=https://modelviewer.dev`.
  - In a Playwright context with `hasTouch: true, isMobile: true, viewport 390×844`, open `/products/google-pixel-watch-2`. Record `window.scrollY`, run `page.mouse.wheel(0, 600)` with the pointer over the viewer, and also a `touchscreen` swipe if feasible. Assert that scrollY increased. Also assert `document.querySelectorAll('[data-scene="product"] div')`: no element has computed `touchAction === 'none'` before the tap.
  - Tap "Tap to rotate" and confirm the controls mount (for example, the button disappears).
  - Screenshot the warm stage (photo mode and model mode) at 1440 and 390.
  - Reset: `UPDATE … SET "modelUrl"=NULL WHERE slug='google-pixel-watch-2'`, and rebuild without the env var.
- [ ] **Step 3: Commit.** Message: `fix(web): warm product stage; controls mount only after tap on phones`.

---

### Task 7: Product card and page sweep (listing, product, cart, checkout, auth, account)

**Files:**
- Modify: `components/shop/product-card.tsx` and any storefront component under `components/shop`, `components/auth`, `components/ui`, `app/(shop)`, `app/(auth)`, `app/(account)`, `app/about`, `app/contact` and `app/*` legal pages that still hard-codes neon-era or dark values.

**Requirements:**
- **Product card:**
  - a solid `var(--surface)` card with a 16px radius, the image in the `var(--image-well)` well
  - name in `--fg`, brand in `--fg-muted`, price in `price-now`
  - "Add to cart" is a solid black `btn-primary`-style button (full width, 12px radius, cream text); disabled style is `bg-soft` with muted text
  - sale badge is `badge-sale` (`#b91c1c`, white text); sold out is `bg-[color:var(--fg)] text-[color:var(--bg)]`
- **Sweep:**
  - `grep -rnE "#070914|#05060d|#0d1122|#22e5ff|#8b5cf6|#ff2e88|rgba\(20, ?24, ?48|backdrop-blur|shadow-\[0_0_[0-9]+px_var\(--glow" apps/web/src --include=*.tsx --include=*.css`, excluding `(admin)` and `components/admin`
  - replace every storefront hit with the warm tokens (`--surface`, `--bg-soft`, `--fg`, `--accent-2`) or remove it
  - blur is only allowed on the sticky header, and only if its fill stays ≥95% opaque; otherwise remove it
- **Listing filters:** a solid surface panel with Fraunces headings. The active filter chips use `bg-soft` fill and `--fg` text, with a bronze border on hover.
- **Checkout step numbers, pagination current page, active tab underline:** black fill with cream text, or a bronze underline.
- **Premium product template** (`premium-product-page.tsx`): leave it (a self-contained, admin-chosen template).

- [ ] **Step 1:** Implement the product card and the sweep. The grep must end empty apart from documented exceptions.
- [ ] **Step 2: Verify.**
  - Run the four commands.
  - Screenshot at 1440 and 390: `/products`, one product page (photo mode), `/cart` with one item (add it in the same context), `/checkout` (fake `/auth/me` with `page.route`, as earlier tasks did), `/login` and `/register`.
  - Look at all of them and list any unreadable text or leftover dark or neon patches. Fix them before committing.
- [ ] **Step 3: Commit.** Message: `feat(web): warm product cards and storefront page sweep`.

---

### Task 8: E2E, budget and final verification

**Files:**
- Modify: `apps/web/e2e/three-d.spec.ts`

**Requirements:**
- **WebGL on:**
  - home: exactly one `h1`; `[data-scene="hero"] canvas` visible (15 s); `[data-scene="spotlight"]` count ≥ 1 when featured products exist; no `canvas` outside `[data-scene]`; no console errors (keep the "Failed to load resource" rule)
  - product viewer 3D / Photos toggle, as today
  - reduced-motion tilt test with the positive control, as today
- **WebGL off:** `[data-scene-fallback="hero"]` visible; canvas count 0; product page shows the plain gallery; add-to-cart visible.
- **Phone scroll:** a new test in a `hasTouch`/`isMobile` 390×844 context on a product page (photo mode): `mouse.wheel` over the viewer increases `scrollY`.
- **Budget:** build `main` in a temporary worktree (`git worktree add ../drikon-main main`, `pnpm install --frozen-lockfile`, build web, record the numbers, `git worktree remove ../drikon-main --force`). If that fails, use main's figures of 225 kB / 174 kB. Compare `/`, `/products`, `/products/[slug]`, `/cart` and `/checkout`.
- **Full verification:**
  - `pnpm --filter @drikon/api test`, then the four web commands
  - `playwright test e2e/three-d.spec.ts e2e/storefront.spec.ts`: all pass except the known pre-existing storefront "unknown routes" failure
- **Final screenshots:** home, listing, product, cart, checkout, login and account dashboard (faked auth) at 1440 and 390, into `warm/final/`.

- [ ] **Step 1:** Update the spec. Run it, and fix test code only. Real product bugs are reported, not papered over.
- [ ] **Step 2:** Run the budget and full verification, and take the screenshots.
- [ ] **Step 3: Commit.** Message: `test(web): e2e for the warm editorial storefront`.
