# Responsive System Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make the storefront adapt to any resolution and aspect ratio — 320px phones through 4K and ultrawide — with fluid type and spacing, auto-fitting grids, container-query sections, aspect-aware 3D, and an automated size matrix that fails on real breakages.

**Architecture:**
- Type and space become `clamp()` scales declared in `@theme`, so Tailwind's own `text-*` utilities become fluid and existing markup inherits the behaviour.
- Layout switches stay on breakpoints only where a layout genuinely changes; component-level switches use container queries so a section responds to its own width.
- A new Playwright spec drives 6 pages × 12 sizes and asserts the invariants.

**Tech Stack:** Next.js 15.5 App Router, Tailwind v4 (`@theme`, CSS-first), Motion 11, R3F 9.7 / drei 10.7.8, next-intl, Vitest, Playwright.

**Spec:** `docs/superpowers/specs/2026-09-22-responsive-system-design.md`

## Global Constraints

- **Branch:** `responsive-system`, created from `main`. One commit per task, each ending with `Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>`.
- **Tooling:** pnpm only. Motion from `motion/react`. `'use client'` only where needed. Typed props, no `any`.
- **Minimum readable text is 12px.** Nothing on the storefront may compute smaller.
- **Narrowest supported width is 320px**, with no horizontal scrolling at any size.
- **Shell:** `width: min(1800px, 94vw)`, centred.
- **Breakpoints:** Tailwind defaults (`sm` 640, `md` 768, `lg` 1024, `xl` 1280) plus `2xl` 1536 and `3xl` 1920. Breakpoints are for layout switches only; type and spacing are fluid.
- **Type scale** (all `clamp()`, min at 360px, max at 1920px):

  | Token | Min | Max |
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
- **Product grid rule:** `repeat(auto-fill, minmax(clamp(9.5rem, 22vw, 15rem), 1fr))` — 2 columns at 390px, 4 at 768px, 5 at 1440px, 7 at 1920px+.
- **Reading measure:** body copy blocks cap at `68ch`.
- **Admin is untouched.** `.theme-classic` keeps its current fixed sizing; admin must not inherit fluid type. Where a token change would reach admin, add a `.theme-classic` override.
- **No new dependencies.** First Load JS must not grow.
- **Verification commands** (repo root): `pnpm --filter @drikon/web test`, `pnpm --filter @drikon/web typecheck`, `pnpm lint`, `pnpm --filter @drikon/web build`.
- **Local services:** API — `cd apps/api && WEB_ORIGIN=http://localhost:3000,http://localhost:3100 node dist/main.js` (build first if `dist` is stale; docker container `drikon-postgres` must be up). Web — `pnpm --filter @drikon/web exec next start -p 3100`. Chromium — `/home/dextro/.cache/ms-playwright/chromium-1234/chrome-linux64/chrome`, with `PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH` for e2e and args `['--use-angle=swiftshader','--enable-unsafe-swiftshader']` for WebGL. Stop web with `kill $(fuser 3100/tcp 2>/dev/null)`; never `pkill -f`.
- **Screenshots:** `/tmp/claude-1000/-home-dextro-Desktop-RED-PROJECTS-drikon/b155f20b-fd1c-4401-bd18-3d4763fce40d/scratchpad/responsive/`.
- **Size matrix** (used from Task 5 on): 320×568, 360×800, 390×844, 844×390, 768×1024, 1024×768, 1280×800, 1440×900, 1080×1920, 1920×1080, 2560×1080, 3840×2160.

---

### Task 1: Fluid tokens, shell and breakpoints

**Files:**
- Modify: `apps/web/src/styles/globals.css` — the `@theme` block, `.shell`, and a `.theme-classic` guard

**Interfaces:**
- Produces, for every later task:
  - font-size tokens `--text-2xs … --text-5xl`, which Tailwind emits as `text-2xs`, `text-xs`, `text-sm`, `text-base`, `text-lg`, `text-xl`, `text-2xl`, `text-3xl`, `text-4xl`, `text-5xl`
  - space tokens `--space-1 … --space-16`, emitted as `p-*`, `gap-*`, `m-*` and friends through Tailwind's `--spacing-*` namespace
  - breakpoints `--breakpoint-2xl: 1536px`, `--breakpoint-3xl: 1920px`
  - `.measure` (a `68ch` cap) and `.shell` (fluid width)

- [ ] **Step 1: Add the fluid type scale to `@theme`.**

Insert after the `--font-mono` line. Each step interpolates between 360px and 1920px:
```css
  /* Fluid type: each step grows smoothly between a 360px phone and a 1920px
     screen, then stops. Breakpoints never change type size — only layout.
     12px is the floor; nothing on the storefront may compute smaller. */
  --text-2xs: clamp(0.75rem, 0.734rem + 0.07vw, 0.8125rem);
  --text-xs:  clamp(0.75rem, 0.718rem + 0.14vw, 0.875rem);
  --text-sm:  clamp(0.8125rem, 0.781rem + 0.14vw, 0.9375rem);
  --text-base: clamp(0.9375rem, 0.906rem + 0.14vw, 1.0625rem);
  --text-lg:  clamp(1.0625rem, 1.0rem + 0.27vw, 1.25rem);
  --text-xl:  clamp(1.1875rem, 1.075rem + 0.49vw, 1.5rem);
  --text-2xl: clamp(1.375rem, 1.19rem + 0.82vw, 1.875rem);
  --text-3xl: clamp(1.625rem, 1.35rem + 1.2vw, 2.375rem);
  --text-4xl: clamp(1.875rem, 1.49rem + 1.7vw, 3.125rem);
  --text-5xl: clamp(2.125rem, 1.51rem + 2.7vw, 4.25rem);
```

- [ ] **Step 2: Add the fluid space scale and the new breakpoints.**

```css
  /* Fluid spacing: ~0.8x on phones, ~1.3x on 4K, relative to the old fixed rem
     values. Tailwind's --spacing-* namespace drives p-*, gap-*, m-*, space-*. */
  --spacing-1: clamp(0.2rem, 0.19rem + 0.05vw, 0.3rem);
  --spacing-2: clamp(0.4rem, 0.37rem + 0.1vw, 0.6rem);
  --spacing-3: clamp(0.6rem, 0.56rem + 0.16vw, 0.9rem);
  --spacing-4: clamp(0.8rem, 0.74rem + 0.21vw, 1.2rem);
  --spacing-5: clamp(1rem, 0.93rem + 0.26vw, 1.5rem);
  --spacing-6: clamp(1.2rem, 1.11rem + 0.32vw, 1.8rem);
  --spacing-8: clamp(1.6rem, 1.48rem + 0.42vw, 2.4rem);
  --spacing-10: clamp(2rem, 1.85rem + 0.53vw, 3rem);
  --spacing-12: clamp(2.4rem, 2.22rem + 0.63vw, 3.6rem);
  --spacing-16: clamp(3.2rem, 2.96rem + 0.84vw, 4.8rem);

  --breakpoint-2xl: 1536px;
  --breakpoint-3xl: 1920px;
```

**Check that the spacing override actually takes effect.** Tailwind v4 derives its default spacing utilities from a single `--spacing` value, so per-step `--spacing-N` entries may or may not drive `p-4` in this version. After the build, inspect a rendered element's computed padding at two widths (for example `.card` at 390 and 1920): if it doesn't change, Tailwind baked the old values in. In that case keep the type scale, drop the per-step spacing entries, and instead scale the base: `--spacing: clamp(0.22rem, 0.2rem + 0.06vw, 0.3rem);`. Report which path you took.

- [ ] **Step 3: Make `.shell` fluid and add `.measure`.**

Replace the whole `.shell` rule and its media query inside `@layer components` with:
```css
  /* Content column: grows with the screen up to 1800px, then centres. The
     inline padding is fluid too, so a 320px phone keeps a 16px gutter and a
     4K screen gets a generous one. */
  .shell {
    width: min(1800px, 94vw);
    margin-inline: auto;
    padding-inline: clamp(1rem, 0.85rem + 0.7vw, 2rem);
  }

  /* Readable line length for prose blocks on wide screens. */
  .measure { max-width: 68ch; }
```

- [ ] **Step 4: Keep admin on fixed sizing.**

Add inside `@layer components`, after the `.theme-classic` component overrides:
```css
  /* Admin keeps fixed type and spacing: its dense tables and forms were tuned
     against the old scale, and it is out of scope for the responsive work. */
  .theme-classic {
    --text-2xs: 0.6875rem;
    --text-xs: 0.75rem;
    --text-sm: 0.875rem;
    --text-base: 1rem;
    --text-lg: 1.125rem;
    --text-xl: 1.25rem;
    --text-2xl: 1.5rem;
    --text-3xl: 1.875rem;
    --text-4xl: 2.25rem;
    --text-5xl: 3rem;
    --spacing-1: 0.25rem;
    --spacing-2: 0.5rem;
    --spacing-3: 0.75rem;
    --spacing-4: 1rem;
    --spacing-5: 1.25rem;
    --spacing-6: 1.5rem;
    --spacing-8: 2rem;
    --spacing-10: 2.5rem;
    --spacing-12: 3rem;
    --spacing-16: 4rem;
  }
```
Note: Tailwind resolves `--spacing-*` at build time for utilities that use the default spacing scale, so this override only affects rules that read the variables at runtime. Check after the build whether admin spacing actually changed: screenshot `/admin` (it redirects to `/login` without a session, so instead compare a `.theme-classic`-wrapped page you can reach, or diff computed styles of `.card` inside a `theme-classic` container in a scratch page). If Tailwind proves to bake spacing in, keep the type overrides, drop the spacing ones, and say so in the report.

- [ ] **Step 5: Verify.**

Run the four verification commands. Then start the API and web, and screenshot `/` at 390, 1440 and 2560 into the screenshots directory as `t1-{390,1440,2560}.png`. Look at them:
- 390: type sizes look the same as before, or very slightly larger.
- 1440: no layout jumps, content noticeably wider than the old 1360px cap.
- 2560: content stops at 1800px and is centred.

- [ ] **Step 6: Commit.** `feat(web): fluid type and space scales, fluid shell, wide breakpoints`

---

### Task 2: Replace hard-coded font sizes

**Files:**
- Modify: every storefront `.tsx` with a `text-[10px] … text-[15px]` class (42 instances). Find them with:
  `grep -rn "text-\[1[0-5]px\]" apps/web/src --include=*.tsx | grep -v "(admin)" | grep -v components/admin`
- Modify: the icon pairs beside those labels (`w-[18px] h-[18px]` and similar)

**Interfaces:**
- Consumes: the Task 1 type tokens.
- Produces: no storefront markup sets a pixel font size.

- [ ] **Step 1: Swap the sizes.**

Mapping, applied literally:
- `text-[10px]` and `text-[11px]` → `text-2xs`
- `text-[12px]` and `text-[13px]` → `text-xs`
- `text-[14px]` and `text-[15px]` → `text-sm`

Keep every other class on the element unchanged, including tracking and weight.

- [ ] **Step 2: Make adjacent icons scale with their text.**

Where an icon sits inside a label whose size you just changed, replace fixed `w-[18px] h-[18px]`-style pairs with `w-[1.15em] h-[1.15em]`, so the icon follows the text. Leave standalone icon buttons (header actions, carousel arrows) at their fixed sizes; Task 3 handles tap targets.

- [ ] **Step 3: Confirm nothing is left.**

Run:
```bash
grep -rn "text-\[[0-9]\+px\]" apps/web/src --include=*.tsx | grep -v "(admin)" | grep -v components/admin
```
Expected: no output. If a case genuinely needs a fixed size, leave it, and list it with the reason in your report.

- [ ] **Step 4: Verify.**

Run the four verification commands. Then screenshot `/`, `/products` and one product page at 390 and 1440 into the screenshots directory as `t2-*.png`, and compare them against the Task 1 shots: text should look the same or slightly larger, with no clipped labels or wrapped badges.

- [ ] **Step 5: Commit.** `feat(web): move storefront type onto the fluid scale`

---

### Task 3: Adaptive layout — grids, container queries, heights, safe areas

**Files:**
- Modify: `apps/web/src/components/shop/product-grid.tsx` (`DEFAULT_GRID`, line 7)
- Modify: `apps/web/src/components/home/hero-stage.tsx`, `spotlight.tsx`, `category-tiles.tsx`, `trust-strip.tsx`
- Modify: `apps/web/src/components/layout/navbar.tsx` (short-viewport padding, safe area), `footer.tsx` (safe area)
- Modify: `apps/web/src/styles/globals.css` (the `.grid-auto-products` utility and the short-viewport rule)
- Modify: any other storefront grid with fixed column counts, found with:
  `grep -rn "grid-cols-" apps/web/src --include=*.tsx | grep -v "(admin)" | grep -v components/admin`

**Interfaces:**
- Consumes: Task 1 tokens.
- Produces:
  - `.grid-auto-products`: the auto-fitting product grid class
  - sections that switch layout on their own width, not the viewport

- [ ] **Step 1: Add the auto-fitting grid utility.**

In `globals.css`, inside `@layer components`:
```css
  /* Product grids: the column floor is itself fluid, so the column count
     follows the available width — 2 up on a phone, 5 on a laptop, 7 at 1920+
     — and adapts inside narrower containers without extra classes. */
  .grid-auto-products {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(clamp(9.5rem, 22vw, 15rem), 1fr));
    gap: clamp(0.75rem, 0.6rem + 0.5vw, 1.5rem);
  }
```
Then set `product-grid.tsx`'s `DEFAULT_GRID` to `'grid-auto-products'`, and replace fixed `grid-cols-*` chains in the other storefront grids you found with `grid-auto-products` where they hold product cards. Leave non-product grids (footer columns, filter panels) alone.

- [ ] **Step 2: Switch the homepage sections to container queries.**

For `hero-stage.tsx`, `spotlight.tsx`, `category-tiles.tsx` and `trust-strip.tsx`:
- add `@container` to the section wrapper (Tailwind v4 emits `container-type: inline-size` for it)
- replace viewport breakpoint prefixes that control that section's internal columns with container variants:
  - `lg:grid-cols-2` → `@[48rem]:grid-cols-2`
  - `sm:grid-cols-3` → `@[34rem]:grid-cols-2 @[52rem]:grid-cols-3`
  - `lg:grid-cols-4` (trust strip) → `@[30rem]:grid-cols-2 @[60rem]:grid-cols-4`
- keep the divider rules working: where `lg:divide-x` and the `nth-child` border rules were viewport-based, move them to the same container variants.

- [ ] **Step 3: Make the showcase slots aspect-based.**

In `hero-stage.tsx` the showcase currently uses `className="h-[280px] sm:h-[380px] lg:h-[460px]"`, and `spotlight.tsx` uses `h-[320px] sm:h-[380px] lg:h-[440px]`. Replace both with:
```
className="aspect-[4/3] min-h-[16rem] max-h-[70dvh] w-full"
```
`dvh` keeps the slot inside the visible viewport on a landscape phone, where the browser bars eat height.

- [ ] **Step 4: Short viewports and safe areas.**

In `globals.css`, inside `@layer components`:
```css
  /* Landscape phones: the floating header must not eat the viewport. */
  @media (max-height: 500px) {
    .site-header { padding-block: 0.25rem; }
    .site-header .site-header-bar { height: 3rem; }
  }
```
Add `site-header` to the header element's class list and `site-header-bar` to the inner pill in `navbar.tsx`. In the same file, change the header's `top-3` to `top-[max(0.75rem,env(safe-area-inset-top))]`. In `footer.tsx`, add `pb-[max(2rem,env(safe-area-inset-bottom))]` to the outer element, replacing its current bottom padding.

- [ ] **Step 5: Verify.**

Run the four verification commands. Then, with the API and web running, screenshot `/` and `/products` at 320, 390, 844×390 (landscape), 768, 1440, 2560 and 3840 into the screenshots directory as `t3-*.png`. Look at every one and check:
- no sideways scrolling anywhere, including 320
- product columns: 2 at 390, 4 at 768, 5 at 1440, 7 at 1920+
- the hero and spotlight fit on the landscape phone
- the header is compact in landscape

Fix what you find before committing.

- [ ] **Step 6: Commit.** `feat(web): auto-fitting grids, container-query sections, viewport-safe heights`

---

### Task 4: Aspect-aware 3D scenes

**Files:**
- Modify: `apps/web/src/components/three/showcase-scene.tsx`
- Modify: `apps/web/src/components/three/product-viewer-3d.tsx`
- Modify: `apps/web/src/components/three/showcase-loader.tsx` (fallback parity)

**Interfaces:**
- Consumes: `SceneCanvas`, `Stand`, `Turntable` (already exported from `showcase-scene.tsx`).
- Produces: `FitCamera`, an inner component exported from `showcase-scene.tsx`:
  `function FitCamera({ radius }: { radius: number }): null` — it reads the R3F viewport each frame and sets the camera distance so a sphere of that radius stays fully in frame with a 12% margin, in any container shape.

- [ ] **Step 1: Implement `FitCamera` in `showcase-scene.tsx`.**

```tsx
/**
 * Keeps the subject fully framed in any container shape. A portrait or narrow
 * box needs the camera further back than a wide one, because the horizontal
 * field of view shrinks with the aspect ratio.
 */
export function FitCamera({ radius }: { radius: number }) {
  const camera = useThree((s) => s.camera) as PerspectiveCamera;
  const size = useThree((s) => s.size);
  useEffect(() => {
    const aspect = size.width / Math.max(size.height, 1);
    const vFov = (camera.fov * Math.PI) / 180;
    const fitH = radius / Math.sin(vFov / 2);
    const hFov = 2 * Math.atan(Math.tan(vFov / 2) * aspect);
    const fitW = radius / Math.sin(hFov / 2);
    camera.position.setZ(Math.max(fitH, fitW) * 1.12);
    camera.updateProjectionMatrix();
  }, [camera, radius, size.width, size.height]);
  return null;
}
```
Import `useThree` from `@react-three/fiber`, `useEffect` from React and `type PerspectiveCamera` from `three`.

- [ ] **Step 2: Use it.**

In `ShowcaseScene`, render `<FitCamera radius={1.35} />` as the first child inside `SceneCanvas`. Keep the existing `camera` prop for the initial frame. In `product-viewer-3d.tsx`, render `<FitCamera radius={1.6} />` in photo-plinth mode only; the model path already uses drei `Bounds`, which fits the model itself — leave it alone.

- [ ] **Step 3: Fallback parity.**

In `showcase-loader.tsx`, the 2D fallback sits inside the same box the scene uses, so it needs no aspect logic of its own. Confirm this by eye in Step 4: switching between fallback and scene must not change the layout.

- [ ] **Step 4: Verify.**

Run the four verification commands. Then, with the API and web and swiftshader Chromium, screenshot the homepage hero and a product page viewer at 320, 844×390, 768×1024 (portrait tablet), 1440 and 3840, as `t4-*.png`. In every shot the product must be fully visible with a margin, never cropped, and never tiny. Also load one page with `--disable-webgl` and confirm the fallback occupies the same box.

- [ ] **Step 5: Commit.** `feat(web): fit 3D subjects to any container shape`

---

### Task 5: The size matrix, and fixing what it finds

**Files:**
- Create: `apps/web/e2e/responsive.spec.ts`
- Modify: whatever pages the matrix proves broken

**Interfaces:**
- Consumes: everything above.
- Produces: a spec that fails on horizontal scrolling, text overflow, small tap targets, text under 12px, or a missing header or `h1`.

- [ ] **Step 1: Write the spec.**

```ts
import { test, expect, chromium, type Page, type Browser } from '@playwright/test';

const PORT = Number(process.env.E2E_PORT ?? 3100);
const BASE_URL = process.env.E2E_BASE_URL ?? `http://localhost:${PORT}`;
const EXECUTABLE_PATH = process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH;
const ARGS = ['--use-angle=swiftshader', '--enable-unsafe-swiftshader'];

const SIZES = [
  { name: 'small-phone', width: 320, height: 568 },
  { name: 'phone', width: 360, height: 800 },
  { name: 'phone-large', width: 390, height: 844 },
  { name: 'phone-landscape', width: 844, height: 390 },
  { name: 'tablet-portrait', width: 768, height: 1024 },
  { name: 'tablet-landscape', width: 1024, height: 768 },
  { name: 'laptop', width: 1280, height: 800 },
  { name: 'desktop', width: 1440, height: 900 },
  { name: 'portrait-monitor', width: 1080, height: 1920 },
  { name: 'full-hd', width: 1920, height: 1080 },
  { name: 'ultrawide', width: 2560, height: 1080 },
  { name: '4k', width: 3840, height: 2160 },
] as const;

/** Pages that render without a signed-in user or a seeded API. */
const PAGES = ['/', '/products', '/cart', '/login'] as const;

/**
 * The product page and checkout need data or a session, so they are covered by
 * a second pass: the product page only when the catalogue has one, and checkout
 * behind a faked /auth/me. Both skip cleanly in a no-API environment (CI).
 */
async function firstProductHref(page: Page): Promise<string | null> {
  await page.goto('/products');
  const link = page.locator('article a[href^="/products/"]').first();
  try {
    await link.waitFor({ state: 'visible', timeout: 5_000 });
  } catch {
    return null;
  }
  return link.getAttribute('href');
}

type Violation = { kind: string; detail: string };

/**
 * Runs in the page. Returns every responsive invariant this viewport breaks,
 * so one failure message lists them all instead of stopping at the first.
 */
async function findViolations(page: Page, isMobile: boolean): Promise<Violation[]> {
  return page.evaluate((mobile) => {
    const out: { kind: string; detail: string }[] = [];
    const doc = document.documentElement;

    if (doc.scrollWidth > window.innerWidth + 1) {
      out.push({ kind: 'horizontal-scroll', detail: `${doc.scrollWidth}px content in ${window.innerWidth}px viewport` });
    }

    const label = (el: Element) => {
      const t = (el.textContent ?? '').trim().slice(0, 40);
      return `${el.tagName.toLowerCase()}${el.className && typeof el.className === 'string' ? '.' + el.className.split(' ')[0] : ''}${t ? ` "${t}"` : ''}`;
    };

    for (const el of Array.from(document.querySelectorAll<HTMLElement>('body *'))) {
      const style = getComputedStyle(el);
      if (style.display === 'none' || style.visibility === 'hidden' || el.offsetParent === null) continue;
      const hasOwnText = Array.from(el.childNodes).some((n) => n.nodeType === Node.TEXT_NODE && (n.textContent ?? '').trim().length > 0);
      if (!hasOwnText) continue;

      const scrolls = style.overflowX === 'auto' || style.overflowX === 'scroll';
      if (!scrolls && el.scrollWidth > el.clientWidth + 1 && style.textOverflow !== 'ellipsis') {
        out.push({ kind: 'text-overflow', detail: `${label(el)} ${el.scrollWidth}>${el.clientWidth}` });
      }

      const size = parseFloat(style.fontSize);
      if (size && size < 12) out.push({ kind: 'tiny-text', detail: `${label(el)} ${size}px` });
    }

    if (mobile) {
      for (const el of Array.from(document.querySelectorAll<HTMLElement>('a, button, [role="button"]'))) {
        const style = getComputedStyle(el);
        if (style.display === 'none' || el.offsetParent === null) continue;
        if (style.display === 'inline' || el.closest('p')) continue; // inline links in prose
        const r = el.getBoundingClientRect();
        if (r.width > 0 && (r.width < 44 || r.height < 44)) {
          out.push({ kind: 'small-tap-target', detail: `${label(el)} ${Math.round(r.width)}x${Math.round(r.height)}` });
        }
      }
    }
    return out;
  }, isMobile);
}

async function withPage<T>(width: number, height: number, run: (page: Page) => Promise<T>): Promise<T> {
  const browser: Browser = await chromium.launch({ args: ARGS, executablePath: EXECUTABLE_PATH });
  const page = await browser.newPage({ baseURL: BASE_URL, viewport: { width, height } });
  try {
    return await run(page);
  } finally {
    await browser.close();
  }
}

test.describe('responsive size matrix', () => {
  for (const size of SIZES) {
    for (const path of PAGES) {
      test(`${path} at ${size.name} (${size.width}x${size.height})`, async () => {
        await withPage(size.width, size.height, async (page) => {
          await page.goto(path);
          await page.waitForLoadState('networkidle');
          await expect(page.locator('header').first()).toBeVisible();
          await expect(page.locator('h1').first()).toBeVisible();

          const violations = await findViolations(page, size.width < 768);
          await page.screenshot({
            path: `test-results/responsive/${size.name}${path.replace(/\//g, '_') || '_home'}.png`,
            fullPage: true,
          });
          expect(violations, violations.map((v) => `${v.kind}: ${v.detail}`).join('\n')).toEqual([]);
        });
      });
    }
  }
});
```

Add a second block after the main one, covering the two data-dependent pages at the same sizes:
```ts
test.describe('responsive size matrix (data pages)', () => {
  for (const size of SIZES) {
    test(`product + checkout at ${size.name}`, async () => {
      await withPage(size.width, size.height, async (page) => {
        const href = await firstProductHref(page);
        test.skip(!href, 'no products in this environment');
        for (const path of [href!, '/checkout']) {
          if (path === '/checkout') {
            await page.route('**/api/v1/auth/me', (route) =>
              route.fulfill({
                status: 200,
                contentType: 'application/json',
                body: JSON.stringify({ success: true, data: { id: 'e2e', email: 'e2e@example.com', name: 'E2E', role: 'CUSTOMER' } }),
              }),
            );
          }
          await page.goto(path);
          await page.waitForLoadState('networkidle');
          const violations = await findViolations(page, size.width < 768);
          await page.screenshot({ path: `test-results/responsive/${size.name}${path.replace(/\//g, '_')}.png`, fullPage: true });
          expect(violations, violations.map((v) => `${path} ${v.kind}: ${v.detail}`).join('\n')).toEqual([]);
        }
      });
    });
  }
});
```
Check the real `/api/v1/auth/me` response shape with `curl -s localhost:4000/api/v1/auth/me` before relying on the body above, and match it.

- [ ] **Step 2: Run it and read every failure.**

With the API and web running:
```bash
cd apps/web && PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH=/home/dextro/.cache/ms-playwright/chromium-1234/chrome-linux64/chrome pnpm exec playwright test e2e/responsive.spec.ts --workers=2
```
Expect failures on the first run. Each names the element and the measurement.

- [ ] **Step 3: Fix the product code, not the test.**

Work through the failures by kind:
- horizontal scrolling → find the offending fixed width or negative margin and make it fluid
- text overflow → allow wrapping, or add `truncate` where a single line is intended
- small tap targets → raise the control to a 44px minimum box on mobile, usually with `min-h-11 min-w-11` plus centring
- tiny text → the element still sets a pixel size or a Tailwind class below the floor; move it to `text-2xs`

Never weaken an assertion. If a violation is genuinely acceptable (for example a decorative element), add a narrow, commented exclusion in the collector and justify it in your report.

- [ ] **Step 4: Re-run until green, then run the whole suite.**

```bash
cd apps/web && PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH=… pnpm exec playwright test
```
All specs pass, except the storefront "unknown routes" test only if it is still unfixed on this branch (check `git log --oneline -5 -- e2e/storefront.spec.ts`; PR #8 fixed it, so on an up-to-date `main` it should pass).

- [ ] **Step 5: Confirm CI parity.**

Stop the API, clear `apps/web/.next/cache/fetch-cache`, restart web, and run the matrix again. It must pass with no API, since CI has none. Product-dependent expectations must tolerate empty states.

- [ ] **Step 6: Final verification and budget.**

Run the four verification commands. Record `/products` and `/checkout` First Load JS from the build and compare with `main` (225 kB and 174 kB). They must not grow.

- [ ] **Step 7: Commit.** `test(web): responsive size matrix across 12 viewports`
