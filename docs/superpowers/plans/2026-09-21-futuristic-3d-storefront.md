# Futuristic 3D Storefront Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Restyle the storefront as a dark neon-cyber interface with real WebGL 3D (a space backdrop, a hero scene, a product viewer and a cart orb). Admin keeps its current look. Add an optional `.glb` model URL per product.

**Architecture:**
- Colours change through `@theme` token values, plus a sweep of hard-coded light classes. Admin gets a `.theme-classic` scope that re-declares the old tokens.
- 3D lives in `apps/web/src/components/three/`. Every scene is a `"use client"` component loaded through `next/dynamic({ ssr: false })` from a small client "loader" that first checks a device tier (`none`/`low`/`high`).
- Every scene has a 2D fallback, reached on no WebGL, on a scene error or on WebGL context loss.

**Tech Stack:**
- Web: Next.js 15.5 App Router, React 19.2, Tailwind v4, Motion 11 (`motion/react`), `three` 0.18x, `@react-three/fiber` 9, `@react-three/drei` 10, `@react-three/postprocessing` 3
- API: NestJS 11 + Prisma 5.22 + zod (nestjs-zod)
- Tests: Vitest (web unit), Jest (API), Playwright (e2e)

**Spec:** `docs/superpowers/specs/2026-09-21-futuristic-3d-storefront-design.md`

## Global Constraints

- **Branch:** `futuristic-3d-storefront`. Commit at the end of every task. Commit messages end with `Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>`.
- **Package manager:** pnpm only (`pnpm --filter @drikon/web add …`). Never npm or yarn.
- **Scope:** storefront only. Admin UI changes are limited to (a) the `.theme-classic` wrapper and (b) the "3D model URL" field.
- **Client code:** every file using `motion`, hooks or R3F starts with `'use client'`. Import Motion from `motion/react`, never `framer-motion`.
- **Animation:** only `transform` and `opacity`. Springs use `{ type: 'spring', stiffness: 300, damping: 30 }`.
- **Reduced motion:** `useReducedMotion()` true means no tilt, no auto-rotate, no camera drift, and scenes render still frames.
- **Colour tokens:**
  - background `#05060d`, surface `rgba(20,24,48,0.55)` with `blur(14px)`
  - border `rgba(120,140,255,0.16)`, hover glow `rgba(34,229,255,0.45)`
  - accent `#22e5ff`, accent-2 `#8b5cf6`, sale `#ff2e88`, star `#ffc940`
  - fg `#e6ecff`, fg-muted `#8a93b8`
- **Fonts:** Space Grotesk for display and headings; Plus Jakarta Sans (body), JetBrains Mono and Hind Siliguri are unchanged.
- **3D performance:**
  - DPR `[1, 1.75]`, or `1` on the low tier.
  - Starfield has 2000 points on high and 600 on low.
  - Bloom runs only on the high tier.
- **Budget:** `/products` and `/checkout` first-load JS grows by no more than 5 kB versus `main`.
- **Accessibility:** canvases are `aria-hidden`; nothing interactive exists only in WebGL.
- **`modelUrl`:** optional, `https:` only, pathname ends in `.glb` or `.gltf`, at most 2048 characters. An empty string clears it.
- **Test markers:**
  - Scene wrapper: `data-scene="<name>"`.
  - 2D fallback wrapper: `data-scene-fallback="<name>"`.
  - Names: `backdrop`, `hero`, `product`, `cart`.
- **Tests:** existing tests must stay green. Run from the repo root:
  - `pnpm --filter @drikon/api test`
  - `pnpm --filter @drikon/web test`
  - `pnpm --filter @drikon/web typecheck`
  - `pnpm lint`

**Deviation from the spec (intentional):** the spec says to add `modelUrl` to the `@drikon/shared-types` `Product` type. That package has no `Product` type, only `ProductSummary`, and the product page declares its own `ProductDetail` interface. `modelUrl` goes on `ProductDetail` in `app/(shop)/products/[slug]/page.tsx` and on the admin edit page's local type.

---

## File map

**API**
- Modify `apps/api/prisma/schema.prisma`: add `modelUrl String?` to `Product`.
- Create `apps/api/prisma/migrations/20260921120000_product_model_url/migration.sql`
- Create `apps/api/src/common/utils/model-url.ts` (+ `model-url.spec.ts`): the zod schema for `modelUrl`.
- Modify `apps/api/src/modules/products/dto/product.dto.ts`: add the field.
- Modify `apps/api/src/modules/products/products.service.ts`: persist on create and update.

**Web: theme**
- Modify `apps/web/src/styles/globals.css`: tokens, aliases, `.theme-classic`, component classes, fallback backdrop.
- Modify `apps/web/src/app/layout.tsx`: Space Grotesk font, `themeColor`.
- Modify `apps/web/src/app/(admin)/admin/layout.tsx`: add the `theme-classic` wrapper class.
- Modify about 25 storefront components in the colour sweep (Task 4 lists them).

**Web: tilt**
- Create `apps/web/src/lib/tilt.ts` (+ `tilt.test.ts`): pure pointer-to-tilt maths.
- Create `apps/web/src/components/ui/tilt-card.tsx`
- Modify `apps/web/src/components/shop/product-card.tsx`

**Web: 3D**
- Create `apps/web/src/lib/three/device-tier.ts` (+ `device-tier.test.ts`): pure classifier plus WebGL probe.
- Create `apps/web/src/lib/three/use-device-tier.ts`
- Create `apps/web/src/components/three/scene-canvas.tsx`: Canvas wrapper, error boundary, visibility, context loss.
- Create `apps/web/src/components/three/space-backdrop.tsx` and `backdrop-loader.tsx`
- Create `apps/web/src/components/three/hero-scene.tsx`, `hero-scene-loader.tsx`, and `apps/web/src/components/home/hero-stage.tsx`
- Create `apps/web/src/components/three/product-viewer-3d.tsx` and `apps/web/src/components/shop/product-media.tsx`
- Create `apps/web/src/components/three/cart-orb.tsx` and `cart-orb-loader.tsx`
- Modify:
  - `components/layout/site-chrome.tsx`
  - `app/page.tsx`
  - `app/(shop)/products/[slug]/page.tsx`
  - `app/(shop)/cart/page.tsx`
  - `src/messages/en.json` and `bn.json`

**Web: admin field**
- Modify `apps/web/src/components/admin/product-form.tsx`
- Modify `apps/web/src/app/(admin)/admin/products/[id]/edit/page.tsx`

**E2E**
- Create `apps/web/e2e/three-d.spec.ts`

---

### Task 1: `Product.modelUrl` in the API

**Files:**
- Create: `apps/api/src/common/utils/model-url.ts`
- Test: `apps/api/src/common/utils/model-url.spec.ts`
- Modify: `apps/api/prisma/schema.prisma` (in `model Product`, after `videoUrl String?`)
- Create: `apps/api/prisma/migrations/20260921120000_product_model_url/migration.sql`
- Modify: `apps/api/src/modules/products/dto/product.dto.ts:24`
- Modify: `apps/api/src/modules/products/products.service.ts` (create data around line 207; update destructure around lines 228-234)

**Interfaces:**
- Produces:
  - `export const modelUrlSchema: z.ZodType<string | undefined>`, which accepts `undefined`, `''` or a valid model URL
  - the API field `modelUrl: string | null` on every product JSON (`findBySlug` returns all scalars)

- [ ] **Step 1: Write the failing test**

`apps/api/src/common/utils/model-url.spec.ts`:
```ts
import { modelUrlSchema } from './model-url';

describe('modelUrlSchema', () => {
  it.each([
    'https://res.cloudinary.com/demo/raw/upload/v1/shoe.glb',
    'https://example.com/models/robot.gltf',
    'https://example.com/models/ROBOT.GLB?v=2',
  ])('accepts %s', (url) => {
    expect(modelUrlSchema.parse(url)).toBe(url);
  });

  it('accepts an empty string (clears the field) and undefined', () => {
    expect(modelUrlSchema.parse('')).toBe('');
    expect(modelUrlSchema.parse(undefined)).toBeUndefined();
  });

  it.each([
    'http://example.com/model.glb',
    'https://example.com/model.obj',
    'https://example.com/model.glb.png',
    'javascript:alert(1)//x.glb',
    'not a url',
    `https://example.com/${'a'.repeat(2050)}.glb`,
  ])('rejects %s', (url) => {
    expect(modelUrlSchema.safeParse(url).success).toBe(false);
  });
});
```

- [ ] **Step 2: Run it and confirm it fails**

Run: `pnpm --filter @drikon/api exec jest src/common/utils/model-url.spec.ts`
Expected: FAIL with `Cannot find module './model-url'`

- [ ] **Step 3: Implement**

`apps/api/src/common/utils/model-url.ts`:
```ts
import { z } from 'zod';

/**
 * Optional 3D model link for a product, rendered by the storefront's WebGL
 * viewer. Models are hosted elsewhere (like product videos), so this only
 * checks the link is https and points at a glTF file. '' clears it.
 */
export const modelUrlSchema = z
  .string()
  .max(2048)
  .url()
  .refine((value) => {
    const url = new URL(value);
    return url.protocol === 'https:' && /\.(glb|gltf)$/i.test(url.pathname);
  }, 'Must be an https link to a .glb or .gltf file')
  .optional()
  .or(z.literal(''));
```

- [ ] **Step 4: Run it and confirm it passes**

Run: `pnpm --filter @drikon/api exec jest src/common/utils/model-url.spec.ts`
Expected: PASS (10 tests)

- [ ] **Step 5: Add the column, the migration, the DTO field and persistence**

In `schema.prisma`, directly under `videoUrl String?` in `model Product`:
```prisma
  // Optional 3D model (.glb/.gltf, https) for the storefront's WebGL viewer
  modelUrl           String?
```

`migrations/20260921120000_product_model_url/migration.sql`:
```sql
-- AlterTable
ALTER TABLE "Product" ADD COLUMN "modelUrl" TEXT;
```

In `product.dto.ts`, add the import `import { modelUrlSchema } from '../../../common/utils/model-url';`, and under the `videoUrl` line:
```ts
  modelUrl: modelUrlSchema,
```

In `products.service.ts` `create()`, under `videoUrl: dto.videoUrl || null,`:
```ts
          modelUrl: dto.modelUrl || null,
```

In `update()`, change the destructure and the spread to:
```ts
    const { images, price, compareAtPrice, videoUrl, modelUrl, ...rest } = dto;
```
```ts
        ...(videoUrl !== undefined && { videoUrl: videoUrl || null }),
        ...(modelUrl !== undefined && { modelUrl: modelUrl || null }),
```

- [ ] **Step 6: Apply the migration locally and run the whole API suite**

Run:
```bash
docker start drikon-postgres
cd apps/api && pnpm exec prisma migrate deploy && pnpm exec prisma generate && cd ../..
pnpm --filter @drikon/api test && pnpm --filter @drikon/api typecheck
```
Expected: the migration is applied, and all API tests pass (previously 192, now 202).

- [ ] **Step 7: Commit**

```bash
git add apps/api
git commit -m "feat(api): optional Product.modelUrl for the 3D viewer

Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>"
```

---

### Task 2: "3D model URL" field in admin

**Files:**
- Modify: `apps/web/src/components/admin/product-form.tsx`
  - `ProductFormState` (line ~35)
  - `initial` props (~62)
  - `emptyState` (~86)
  - payload (~146)
  - the field markup after the video field (~397)
- Modify: `apps/web/src/app/(admin)/admin/products/[id]/edit/page.tsx`: the local type (~31) and `initial` (~98)

**Interfaces:**
- Consumes: the API `modelUrl` from Task 1
- Produces: admin can save and clear `modelUrl`

- [ ] **Step 1: Add the state and the payload**

`product-form.tsx`:
- In `interface ProductFormState`, add `modelUrl: string;` after `videoUrl: string;`.
- In the props `initial` type, add `modelUrl?: string;` after `videoUrl?: string;`.
- In `emptyState`, add `modelUrl: '',` after `videoUrl: '',`.
- After `payload.videoUrl = state.videoUrl.trim();`, add:
```ts
      payload.modelUrl = state.modelUrl.trim();
```

- [ ] **Step 2: Add the field below the video URL field**

Directly after the closing `</Field>` of "Product video URL (optional)":
```tsx
      <Field label="3D model URL (optional)">
        <input
          type="url"
          value={state.modelUrl}
          onChange={(e) => update('modelUrl', e.target.value)}
          placeholder="https://…/product.glb — shown in the storefront's 3D viewer"
          pattern="https://.+\.(glb|gltf)(\?.*)?"
          className="input"
        />
      </Field>
```

- [ ] **Step 3: Load the value on the edit page**

In `edit/page.tsx`, add `modelUrl?: string | null;` under `videoUrl?: string | null;`, and in `initial` add `modelUrl: product.modelUrl ?? '',` under the `videoUrl` line.

- [ ] **Step 4: Verify**

Run: `pnpm --filter @drikon/web typecheck && pnpm --filter @drikon/web lint`
Expected: no errors.

Manual check:
- API on :4000, web on :3100.
- Edit a product, paste `https://modelviewer.dev/shared-assets/models/Astronaut.glb` and save.
- `curl -s localhost:4000/api/v1/products/slug/<slug> | grep -o '"modelUrl":"[^"]*"'` shows the URL.
- Clear the field, save, and the value is `null`.

- [ ] **Step 5: Commit**

```bash
git add apps/web/src/components/admin/product-form.tsx "apps/web/src/app/(admin)/admin/products/[id]/edit/page.tsx"
git commit -m "feat(admin): 3D model URL field on the product form

Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>"
```

---

### Task 3: Dark neon tokens, Space Grotesk, and admin `.theme-classic`

**Files:**
- Modify: `apps/web/src/styles/globals.css` (the `@theme` block, the `:root` aliases, `::selection`, the scrollbar, `@layer components`)
- Modify: `apps/web/src/app/layout.tsx`
- Modify: `apps/web/src/app/(admin)/admin/layout.tsx` (both `return (` roots, lines ~33 and ~42)

**Interfaces:**
- Produces these CSS variables for every later task:
  - `--surface`: glass panel fill
  - `--surface-solid`: an opaque version for menus and popovers
  - `--image-well`: the light well behind product photos
  - `--accent-fg`: text colour on accent fills
  - `--border-strong`, `--glow-edge`
- Produces these classes:
  - `.glass`, `.neon-edge`, `.grid-texture`, `.font-display`
  - `.space-fallback`: the CSS backdrop
  - `.theme-classic`: the admin scope
- Produces the Tailwind font token `--font-display`.

- [ ] **Step 1: Replace the `@theme` colour block**

In `globals.css`, replace everything from `--color-bg:` through `--color-star:` with the block below. Also replace the header comment above `@theme` (the "accent MUST stay dark enough to carry white text" rule no longer holds; `--accent-fg` replaces it).
```css
  /* Dark neon cyber. Text on accent fills uses --color-accent-fg (dark), not
     white — the accent is a bright cyan. */
  --color-bg:        #05060d;
  --color-bg-soft:   #0b0e1c;
  --color-fg:        #e6ecff;
  --color-fg-muted:  #8a93b8;
  --color-border:    rgba(120, 140, 255, 0.16);
  --color-accent:    #22e5ff;
  --color-accent-2:  #8b5cf6;
  --color-accent-fg: #03121a;
  --color-ring:      #22e5ff;

  --color-ink:       #070914;
  --color-ink-soft:  #0e1224;
  --color-sale:      #ff2e88;
  --color-success:   #2ee59d;
  --color-star:      #ffc940;
```
In the same block, change the font lines to:
```css
  --font-sans: var(--font-jakarta), var(--font-bangla), ui-sans-serif, system-ui, sans-serif;
  --font-display: var(--font-grotesk), var(--font-bangla), ui-sans-serif, system-ui, sans-serif;
  --font-mono: var(--font-jetbrains-mono), ui-monospace, SFMono-Regular, monospace;
```
and set `--radius-card: 14px;` and `--radius-ctl: 10px;`.

- [ ] **Step 2: Replace the `:root` alias block**

Custom properties resolve where they're declared. `.theme-classic` must therefore re-declare the aliases as well as the `--color-*` tokens, or admin would inherit the dark values already resolved on `:root`. Replace the whole `:root { … }` block with:
```css
:root,
.theme-classic {
  --bg:        var(--color-bg);
  --bg-soft:   var(--color-bg-soft);
  --fg:        var(--color-fg);
  --fg-muted:  var(--color-fg-muted);
  --border:    var(--color-border);
  --accent:    var(--color-accent);
  --accent-2:  var(--color-accent-2);
  --accent-fg: var(--color-accent-fg);
  --ring:      var(--color-ring);
  --glow:      color-mix(in srgb, var(--color-accent) 22%, transparent);
}

:root {
  --surface:       rgba(20, 24, 48, 0.55);
  --surface-solid: #0d1122;
  --image-well:    radial-gradient(120% 120% at 50% 30%, #f4f7ff 0%, #dfe6f7 100%);
  --border-strong: rgba(140, 160, 255, 0.32);
  --glow-edge:     rgba(34, 229, 255, 0.45);
  --glass:         var(--surface);
  --grid-line:     rgba(120, 140, 255, 0.07);
  --shadow:        rgba(0, 0, 0, 0.45);
  color-scheme: dark;
}

/* Admin keeps the previous light megastore look (spec §1). */
.theme-classic {
  --color-bg:        #ffffff;
  --color-bg-soft:   #f3f5f8;
  --color-fg:        #111827;
  --color-fg-muted:  #667085;
  --color-border:    #e4e7ec;
  --color-accent:    #0b57d0;
  --color-accent-2:  #ff7a00;
  --color-accent-fg: #ffffff;
  --color-ring:      #0b57d0;
  --color-ink:       #0b1424;
  --color-ink-soft:  #16223a;
  --color-sale:      #e0302f;
  --color-success:   #12a150;
  --color-star:      #ffb400;
  --surface:       #ffffff;
  --surface-solid: #ffffff;
  --image-well:    #ffffff;
  --border-strong: #d0d5dd;
  --glass:         rgba(255, 255, 255, 0.92);
  --grid-line:     rgba(17, 24, 39, 0.05);
  --shadow:        rgba(16, 24, 40, 0.08);
  color-scheme: light;
  background: var(--bg);
  color: var(--fg);
}
```
Change `::selection` to `::selection { background: var(--accent); color: var(--accent-fg); }` and the scrollbar thumb to `background: var(--border-strong);`.

- [ ] **Step 3: Update component classes in `@layer components`**

- In `.btn-primary`, set `color: var(--accent-fg);` and `box-shadow: 0 0 0 1px var(--accent), 0 8px 24px -10px var(--glow-edge);`.
- In `.btn-primary:hover`, set `background: color-mix(in srgb, var(--accent) 88%, #fff); box-shadow: 0 0 0 1px var(--accent), 0 10px 32px -8px var(--glow-edge);`.
- In `.btn-ghost`, change `background: var(--bg);` to `background: var(--surface);`.
- In `.btn-dark:hover`, add `color: var(--accent-fg);`.
- In `.card`, set `background: var(--surface); backdrop-filter: blur(14px); -webkit-backdrop-filter: blur(14px); box-shadow: 0 1px 0 rgba(255,255,255,0.04) inset, 0 10px 30px -18px var(--shadow);`.
- In `.card-hover:hover`, set `border-color: var(--glow-edge); box-shadow: 0 0 0 1px var(--glow-edge), 0 18px 40px -18px var(--glow);`.
- In `.glass`, change `blur(12px)` to `blur(14px)` (both lines) and replace the comment with `/* Frosted neon glass panel. */`.
- In `.input`, set the background to `var(--surface-solid)` (the existing rule uses a white or `--bg` background).

Then add these classes at the end of `@layer components`:
```css
  .font-display { font-family: var(--font-display); letter-spacing: -0.02em; }
  .neon-edge { transition: box-shadow 0.2s ease, border-color 0.2s ease; }
  .neon-edge:hover { border-color: var(--glow-edge); box-shadow: 0 0 0 1px var(--glow-edge), 0 0 28px -6px var(--glow); }
  .grid-texture {
    background-image:
      linear-gradient(var(--grid-line) 1px, transparent 1px),
      linear-gradient(90deg, var(--grid-line) 1px, transparent 1px);
    background-size: 44px 44px;
  }
  /* Static stand-in for the WebGL backdrop — always painted, the canvas sits above it. */
  .space-fallback {
    background:
      radial-gradient(60% 50% at 20% 0%, rgba(139, 92, 246, 0.22), transparent 70%),
      radial-gradient(50% 40% at 90% 10%, rgba(34, 229, 255, 0.16), transparent 70%),
      linear-gradient(var(--grid-line) 1px, transparent 1px) 0 0 / 56px 56px,
      linear-gradient(90deg, var(--grid-line) 1px, transparent 1px) 0 0 / 56px 56px,
      var(--bg);
  }
```
Delete the existing `.font-display { font-family: var(--font-sans); }` line (about line 130), because the new rule replaces it. Change `.section-title` and `.display` to use `font-family: var(--font-display);`.

- [ ] **Step 4: Fonts and theme colour in `app/layout.tsx`**

- Change the import to `import { Plus_Jakarta_Sans, Hind_Siliguri, JetBrains_Mono, Space_Grotesk } from 'next/font/google';`.
- After `jetbrainsMono`, add:
```ts
// Display face for the neon-cyber headings; body copy stays Plus Jakarta.
const grotesk = Space_Grotesk({
  subsets: ['latin'],
  weight: ['500', '600', '700'],
  variable: '--font-grotesk',
  display: 'swap',
});
```
- Set `themeColor: '#05060d'` and change its comment to `// Matches the dark storefront background.`.
- Change the `<html>` className to `` `${jakarta.variable} ${bangla.variable} ${jetbrainsMono.variable} ${grotesk.variable}` ``.
- In the skip link, replace `focus:text-white` with `focus:text-[color:var(--accent-fg)]`.
- Leave the accent override (`accentCss`) as it is. Settings `accentColor` is null in production, and an admin who sets one takes responsibility for its contrast.

- [ ] **Step 5: Admin scope**

In `app/(admin)/admin/layout.tsx`:
- The loading root becomes `className="theme-classic min-h-screen grid place-items-center bg-[color:var(--bg-soft)]"`.
- The main root becomes `className="theme-classic min-h-screen flex bg-[color:var(--bg-soft)]"`.

- [ ] **Step 6: Verify**

Run: `pnpm --filter @drikon/web typecheck && pnpm --filter @drikon/web build`
Expected: the build succeeds.

Start the web app (`pnpm --filter @drikon/web exec next start -p 3100`, with the API on :4000). Then:
- `/` has a near-black background, cyan buttons with dark text, and glass cards.
- `/admin` (signed in as admin) looks exactly as before.

- [ ] **Step 7: Commit**

```bash
git add apps/web/src/styles/globals.css apps/web/src/app/layout.tsx "apps/web/src/app/(admin)/admin/layout.tsx"
git commit -m "feat(web): dark neon-cyber tokens, Space Grotesk, admin keeps classic theme

Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>"
```

---

### Task 4: Colour sweep, removing hard-coded light colours from the storefront

**Files (modify):** each file and line below. The line numbers are from `main` at `50243ba`; find the class string, not the line number.

**Interfaces:**
- Consumes: `--surface`, `--surface-solid`, `--image-well`, `--accent-fg`, `--border-strong` from Task 3

- [ ] **Step 1: Change solid `bg-white` panels to surfaces**

Replace the exact class `bg-white` (not `bg-white/NN` and not `hover:bg-white`):

| File (line) | Replace with |
|---|---|
| `components/layout/navbar.tsx` (57, `<header>`) | `bg-[color:var(--surface-solid)]/90 backdrop-blur-md` |
| `components/layout/mega-menu.tsx` (67, 75) | `bg-[color:var(--surface-solid)]` |
| `components/layout/mega-menu.tsx` (91, active item) | `bg-[color:var(--bg-soft)]` |
| `components/layout/header-search.tsx` (94, 141) | `bg-[color:var(--surface-solid)]` |
| `components/home/category-sidebar.tsx` (35) | `bg-[color:var(--surface)] backdrop-blur-md` |
| `components/home/promo-tiles.tsx` (51) | `bg-[color:var(--surface)] neon-edge` |
| `components/home/service-strip.tsx` (34) | `bg-[color:var(--surface)]` |
| `components/home/category-grid.tsx` (32) | `bg-[color:var(--surface)] neon-edge` |
| `components/shop/flash-sale-section.tsx` (71) | `bg-[color:var(--surface)]` |
| `components/shop/product-carousel.tsx` (104, arrow button) | `bg-[color:var(--surface-solid)]` |
| `components/shop/payment-method-field.tsx` (111, 116, 188) | `bg-[color:var(--surface-solid)]` |
| `components/auth/auth-shell.tsx` (29) | `bg-[color:var(--surface)] backdrop-blur-md` |
| `app/(account)/security/page.tsx` (114) | `bg-[color:var(--surface-solid)]` |
| `app/(shop)/cart/page.tsx` (169, progress track) | `bg-[color:var(--bg-soft)]` |

- [ ] **Step 2: Change product and brand image wells**

Product photos mostly have white backgrounds, so they sit in a light well instead of on the dark surface. Replace `bg-white` with `[background:var(--image-well)]` in:
- `components/shop/product-card.tsx` (52)
- `components/shop/product-gallery.tsx` (41, 52)
- `components/shop/brand-strip.tsx` (25)
- `app/(shop)/cart/page.tsx` (82)
- `app/(shop)/checkout/page.tsx` (171)

- [ ] **Step 3: Product card button, and text on accent fills**

- In `product-card.tsx` (line ~111), replace `bg-white` with `bg-transparent`, and replace both `enabled:hover:text-white` and `enabled:group-hover:text-white` with `enabled:hover:text-[color:var(--accent-fg)]` and `enabled:group-hover:text-[color:var(--accent-fg)]`.
- Replace `text-white` / `hover:text-white` with `text-[color:var(--accent-fg)]` / `hover:text-[color:var(--accent-fg)]` only where the same element has an accent background (`bg-[color:var(--accent)]` or `hover:bg-[color:var(--accent)]`):
  - `components/layout/navbar.tsx:122`
  - `app/(shop)/checkout/page.tsx:245`
  - `app/(account)/dashboard/page.tsx:64`
  - `components/layout/header-search.tsx:129`
  - `components/shop/payment-method-field.tsx:194`
  - `components/ui/pagination.tsx:57`
  - `components/shop/active-filters.tsx:42`
  - `components/shop/product-carousel.tsx:105`
  - `components/shop/hero-slider.tsx:83`
  - `components/shop/mobile-filters.tsx:24`
  - `components/layout/footer.tsx:127`
- Leave `footer.tsx:36` as it is; it isn't on an accent fill.

- [ ] **Step 4: Remaining light hex colours**

- Replace `border-[#d0d5dd]` with `border-[color:var(--border-strong)]` in:
  - `components/shop/add-to-cart.tsx:89`
  - `components/shop/payment-method-field.tsx:185`
  - `components/auth/password-rules.tsx:25`
  - `app/(shop)/cart/page.tsx:99`
- In `components/shop/star-rating.tsx:25`, replace `text-[#d0d5dd]` with `text-[color:var(--border-strong)]`.
- Leave these as they are, because they already sit on dark or brand-coloured backgrounds:
  - `showcase/*` and `premium-product-page.tsx`
  - `hero-slider.tsx` and `static-hero.tsx` overlays
  - the `footer.tsx` payment chips and bKash `#e2136e`
  - `about/page.tsx:76`
  - `order-status-badge.tsx`

- [ ] **Step 5: Confirm that nothing light is left**

Run from `apps/web/src`:
```bash
grep -rnE '(^|[" ])bg-white([" ]|$)' --include=*.tsx . | grep -v -e admin -e showcase -e about/page -e checkbox.tsx -e footer.tsx
grep -rn 'border-\[#d0d5dd\]\|text-\[#d0d5dd\]' --include=*.tsx . | grep -v admin
```
Expected: no output from either command.

Then run `pnpm --filter @drikon/web typecheck && pnpm --filter @drikon/web lint && pnpm --filter @drikon/web test`. Expected: all pass (38 tests).

- [ ] **Step 6: Visual check**

Build, then run `next start -p 3100`. Use the Playwright Chromium at `/home/dextro/.cache/ms-playwright/chromium-1234/chrome-linux64/chrome` to screenshot `/`, `/products`, a product page, `/cart` (with 1 item), `/checkout` and `/login`, at 390 px and 1440 px width, into the session scratchpad. Look at each one: no white panels on dark (other than the photo wells), and all text readable.

- [ ] **Step 7: Commit**

```bash
git add apps/web/src
git commit -m "feat(web): move storefront off hard-coded light colours onto surface tokens

Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>"
```

---

### Task 5: CSS 3D tilt on product cards

**Files:**
- Create: `apps/web/src/lib/tilt.ts`
- Test: `apps/web/src/lib/tilt.test.ts`
- Create: `apps/web/src/components/ui/tilt-card.tsx`
- Modify: `apps/web/src/components/shop/product-card.tsx`: wrap the `<article>`

**Interfaces:**
- Produces:
  - `tiltFromPointer(px: number, py: number, rect: { left: number; top: number; width: number; height: number }, max?: number): { rotateX: number; rotateY: number; glareX: number; glareY: number }`
  - `<TiltCard className?: string>{children}</TiltCard>`. Its root carries `data-tilt`, and it sets an inline `transform` style only while tilt is enabled.

- [ ] **Step 1: Write the failing test**

`apps/web/src/lib/tilt.test.ts`:
```ts
import { describe, expect, it } from 'vitest';
import { tiltFromPointer } from './tilt';

const rect = { left: 100, top: 200, width: 200, height: 100 };

describe('tiltFromPointer', () => {
  it('is flat at the centre', () => {
    const t = tiltFromPointer(200, 250, rect);
    expect(t.rotateX).toBeCloseTo(0);
    expect(t.rotateY).toBeCloseTo(0);
    expect(t).toMatchObject({ glareX: 50, glareY: 50 });
  });

  it('tilts toward the pointer, up to max degrees', () => {
    // top-right corner: top edge lifts toward viewer (+X), right side away (+Y)
    expect(tiltFromPointer(300, 200, rect, 8)).toEqual({ rotateX: 8, rotateY: 8, glareX: 100, glareY: 0 });
    expect(tiltFromPointer(100, 300, rect, 8)).toEqual({ rotateX: -8, rotateY: -8, glareX: 0, glareY: 100 });
  });

  it('clamps pointers outside the card', () => {
    expect(tiltFromPointer(-500, 9999, rect, 8)).toEqual({ rotateX: -8, rotateY: -8, glareX: 0, glareY: 100 });
  });

  it('returns flat for a zero-size rect instead of NaN', () => {
    expect(tiltFromPointer(0, 0, { left: 0, top: 0, width: 0, height: 0 })).toEqual({ rotateX: 0, rotateY: 0, glareX: 50, glareY: 50 });
  });
});
```

- [ ] **Step 2: Run it and confirm it fails**

Run: `pnpm --filter @drikon/web exec vitest run src/lib/tilt.test.ts`
Expected: FAIL (cannot resolve `./tilt`)

- [ ] **Step 3: Implement `tilt.ts`**

```ts
export type Rect = { left: number; top: number; width: number; height: number };
export type Tilt = { rotateX: number; rotateY: number; glareX: number; glareY: number };

const clamp01 = (n: number) => Math.min(1, Math.max(0, n));

/**
 * Pointer position → card tilt. The edge nearest the pointer lifts toward the
 * viewer; glare coordinates are percentages for a radial-gradient highlight.
 */
export function tiltFromPointer(px: number, py: number, rect: Rect, max = 8): Tilt {
  if (rect.width <= 0 || rect.height <= 0) return { rotateX: 0, rotateY: 0, glareX: 50, glareY: 50 };
  const x = clamp01((px - rect.left) / rect.width);
  const y = clamp01((py - rect.top) / rect.height);
  return {
    rotateX: (0.5 - y) * 2 * max,
    rotateY: (x - 0.5) * 2 * max,
    glareX: Math.round(x * 100),
    glareY: Math.round(y * 100),
  };
}
```

- [ ] **Step 4: Run it and confirm it passes**

Run: `pnpm --filter @drikon/web exec vitest run src/lib/tilt.test.ts`
Expected: PASS (4 tests)

- [ ] **Step 5: Implement `TiltCard`**

`apps/web/src/components/ui/tilt-card.tsx`:
```tsx
'use client';

import { useEffect, useRef, useState } from 'react';
import { motion, useMotionValue, useReducedMotion, useSpring } from 'motion/react';
import { tiltFromPointer } from '@/lib/tilt';
import { cn } from '@/lib/utils';

const spring = { stiffness: 300, damping: 30 };

/**
 * CSS 3D tilt with a cursor-following glare. Off on touch/coarse pointers and
 * under reduced motion — then it renders a plain wrapper with no transform.
 */
export function TiltCard({ className, children }: { className?: string; children: React.ReactNode }) {
  const reduced = useReducedMotion();
  const [canHover, setCanHover] = useState(false);
  const glare = useRef<HTMLDivElement>(null);
  const rx = useMotionValue(0);
  const ry = useMotionValue(0);
  const rotateX = useSpring(rx, spring);
  const rotateY = useSpring(ry, spring);

  useEffect(() => {
    const mq = window.matchMedia('(hover: hover) and (pointer: fine)');
    const sync = () => setCanHover(mq.matches);
    sync();
    mq.addEventListener('change', sync);
    return () => mq.removeEventListener('change', sync);
  }, []);

  if (reduced || !canHover) {
    return <div data-tilt="off" className={className}>{children}</div>;
  }

  return (
    <motion.div
      data-tilt="on"
      className={cn('relative [transform-style:preserve-3d]', className)}
      style={{ rotateX, rotateY, transformPerspective: 900 }}
      onPointerMove={(e) => {
        const t = tiltFromPointer(e.clientX, e.clientY, e.currentTarget.getBoundingClientRect());
        rx.set(t.rotateX);
        ry.set(t.rotateY);
        glare.current?.style.setProperty('--gx', `${t.glareX}%`);
        glare.current?.style.setProperty('--gy', `${t.glareY}%`);
      }}
      onPointerLeave={() => {
        rx.set(0);
        ry.set(0);
      }}
    >
      {children}
      <div
        ref={glare}
        aria-hidden
        className="pointer-events-none absolute inset-0 rounded-[var(--radius-card)] opacity-0 transition-opacity duration-300 [.group:hover_&]:opacity-100 [background:radial-gradient(circle_at_var(--gx,50%)_var(--gy,50%),rgba(34,229,255,0.18),transparent_55%)]"
      />
    </motion.div>
  );
}
```

- [ ] **Step 6: Use it in `ProductCard`**

In `product-card.tsx`:
- Add `import { TiltCard } from '@/components/ui/tilt-card';`.
- Wrap the returned `<article …>…</article>` in `<TiltCard className="group h-full">…</TiltCard>`, and remove `group` from the article's className. The glare selector reads `.group:hover`, and the article's hover styles now inherit through the wrapper's `group`.
- Update the doc comment's first line to `Neon glass product tile with CSS 3D tilt: …`.

- [ ] **Step 7: Verify**

Run: `pnpm --filter @drikon/web test && pnpm --filter @drikon/web typecheck && pnpm --filter @drikon/web lint`
Expected: PASS (42 tests).

- [ ] **Step 8: Commit**

```bash
git add apps/web/src/lib/tilt.ts apps/web/src/lib/tilt.test.ts apps/web/src/components/ui/tilt-card.tsx apps/web/src/components/shop/product-card.tsx
git commit -m "feat(web): CSS 3D tilt and glare on product cards

Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>"
```

---

### Task 6: 3D foundation (dependencies, device tier, `SceneCanvas`)

**Files:**
- Modify: `apps/web/package.json` (through pnpm)
- Create: `apps/web/src/lib/three/device-tier.ts`
- Test: `apps/web/src/lib/three/device-tier.test.ts`
- Create: `apps/web/src/lib/three/use-device-tier.ts`
- Create: `apps/web/src/components/three/scene-canvas.tsx`

**Interfaces:**
- Produces:
  - `type DeviceTier = 'none' | 'low' | 'high'`
  - `type TierInputs = { webgl: boolean; coarsePointer: boolean; viewportWidth: number; saveData?: boolean; deviceMemory?: number; cores?: number }`
  - `classifyDevice(i: TierInputs): DeviceTier`
  - `hasWebGL(): boolean`
  - `useDeviceTier(): DeviceTier | null`. It returns `null` until mounted; treat `null` as "not yet, show the fallback".
  - `SceneBoundary`: a class component with props `{ fallback: ReactNode; children: ReactNode }`
  - `SceneCanvas` with props `{ name: 'backdrop' | 'hero' | 'product' | 'cart'; tier: 'low' | 'high'; fallback: ReactNode; className?: string; camera?: { position: [number, number, number]; fov?: number }; children: ReactNode }`. It renders `<div data-scene={name} aria-hidden>`, and the fallback renders inside `<div data-scene-fallback={name}>`.

- [ ] **Step 1: Install the dependencies**

Run from the repo root:
```bash
pnpm --filter @drikon/web add three@^0.186.0 @react-three/fiber@^9.7.0 @react-three/drei@^10.7.8 @react-three/postprocessing@^3.0.4
pnpm --filter @drikon/web add -D @types/three@^0.186.0
```
Expected: installs cleanly. React is 19.2.6, which fiber 9 supports (`>=19 <19.3`).

- [ ] **Step 2: Write the failing test**

`apps/web/src/lib/three/device-tier.test.ts`:
```ts
import { describe, expect, it } from 'vitest';
import { classifyDevice, type TierInputs } from './device-tier';

const desktop: TierInputs = { webgl: true, coarsePointer: false, viewportWidth: 1440, deviceMemory: 8, cores: 8 };

describe('classifyDevice', () => {
  it('is none without WebGL, whatever else is true', () => {
    expect(classifyDevice({ ...desktop, webgl: false })).toBe('none');
  });
  it('is high on a capable desktop', () => {
    expect(classifyDevice(desktop)).toBe('high');
  });
  it('is high when the browser hides memory/cores', () => {
    expect(classifyDevice({ webgl: true, coarsePointer: false, viewportWidth: 1440 })).toBe('high');
  });
  it.each<[string, Partial<TierInputs>]>([
    ['data saver', { saveData: true }],
    ['4 GB memory', { deviceMemory: 4 }],
    ['4 cores', { cores: 4 }],
    ['phone (coarse pointer, narrow)', { coarsePointer: true, viewportWidth: 390 }],
  ])('is low for %s', (_label, patch) => {
    expect(classifyDevice({ ...desktop, ...patch })).toBe('low');
  });
  it('keeps a large touch screen (tablet landscape) high', () => {
    expect(classifyDevice({ ...desktop, coarsePointer: true, viewportWidth: 1280 })).toBe('high');
  });
});
```

- [ ] **Step 3: Run it and confirm it fails**

Run: `pnpm --filter @drikon/web exec vitest run src/lib/three/device-tier.test.ts`
Expected: FAIL (module not found)

- [ ] **Step 4: Implement `device-tier.ts`**

```ts
export type DeviceTier = 'none' | 'low' | 'high';

export type TierInputs = {
  webgl: boolean;
  coarsePointer: boolean;
  viewportWidth: number;
  saveData?: boolean;
  deviceMemory?: number;
  cores?: number;
};

/**
 * How much 3D this device should get. `none` → 2D fallbacks only; `low` →
 * fewer particles, DPR 1, no bloom; `high` → everything. Unknown memory/cores
 * (Safari, Firefox hide them) don't count against the device.
 */
export function classifyDevice(i: TierInputs): DeviceTier {
  if (!i.webgl) return 'none';
  if (i.saveData) return 'low';
  if (i.deviceMemory !== undefined && i.deviceMemory <= 4) return 'low';
  if (i.cores !== undefined && i.cores <= 4) return 'low';
  if (i.coarsePointer && i.viewportWidth < 768) return 'low';
  return 'high';
}

export function hasWebGL(): boolean {
  try {
    const canvas = document.createElement('canvas');
    return !!(canvas.getContext('webgl2') ?? canvas.getContext('webgl'));
  } catch {
    return false;
  }
}
```

- [ ] **Step 5: Run it and confirm it passes**

Run: `pnpm --filter @drikon/web exec vitest run src/lib/three/device-tier.test.ts`
Expected: PASS (8 tests)

- [ ] **Step 6: Implement `use-device-tier.ts`**

```ts
'use client';

import { useEffect, useState } from 'react';
import { classifyDevice, hasWebGL, type DeviceTier } from './device-tier';

type NavigatorHints = Navigator & { deviceMemory?: number; connection?: { saveData?: boolean } };

/** Device tier, or null until mounted (SSR and first paint show 2D fallbacks). */
export function useDeviceTier(): DeviceTier | null {
  const [tier, setTier] = useState<DeviceTier | null>(null);
  useEffect(() => {
    const nav = navigator as NavigatorHints;
    setTier(
      classifyDevice({
        webgl: hasWebGL(),
        coarsePointer: window.matchMedia('(pointer: coarse)').matches,
        viewportWidth: window.innerWidth,
        saveData: nav.connection?.saveData,
        deviceMemory: nav.deviceMemory,
        cores: nav.hardwareConcurrency || undefined,
      }),
    );
  }, []);
  return tier;
}
```

- [ ] **Step 7: Implement `scene-canvas.tsx`**

```tsx
'use client';

import { Component, useEffect, useRef, useState, type ReactNode } from 'react';
import { Canvas } from '@react-three/fiber';
import { useReducedMotion } from 'motion/react';
import { cn } from '@/lib/utils';

export type SceneName = 'backdrop' | 'hero' | 'product' | 'cart';

/** Any throw inside a scene (bad texture, bad model, shader error) → 2D fallback. */
export class SceneBoundary extends Component<{ fallback: ReactNode; children: ReactNode }, { failed: boolean }> {
  state = { failed: false };
  static getDerivedStateFromError() {
    return { failed: true };
  }
  componentDidCatch(error: unknown) {
    console.warn('[3d] scene failed, showing 2D fallback:', error);
  }
  render() {
    return this.state.failed ? this.props.fallback : this.props.children;
  }
}

/**
 * The one way to put WebGL on the page. Caps DPR by tier, stops rendering when
 * scrolled off-screen, renders on demand under reduced motion, and swaps to the
 * fallback on a scene error or a lost WebGL context. rAF already pauses in
 * hidden tabs, so no extra visibility handling is needed.
 */
export function SceneCanvas({
  name,
  tier,
  fallback,
  className,
  camera = { position: [0, 0, 6], fov: 45 },
  children,
}: {
  name: SceneName;
  tier: 'low' | 'high';
  fallback: ReactNode;
  className?: string;
  camera?: { position: [number, number, number]; fov?: number };
  children: ReactNode;
}) {
  const reduced = useReducedMotion();
  const box = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(true);
  const [lost, setLost] = useState(false);

  useEffect(() => {
    const el = box.current;
    if (!el) return;
    const io = new IntersectionObserver(([entry]) => setVisible(entry.isIntersecting), { rootMargin: '100px' });
    io.observe(el);
    return () => io.disconnect();
  }, []);

  const wrapped = <div data-scene-fallback={name} className="h-full w-full">{fallback}</div>;
  if (lost) return wrapped;

  return (
    <div ref={box} data-scene={name} aria-hidden className={cn('relative', className)}>
      <SceneBoundary fallback={wrapped}>
        <Canvas
          dpr={tier === 'low' ? 1 : [1, 1.75]}
          camera={camera}
          frameloop={!visible ? 'never' : reduced ? 'demand' : 'always'}
          gl={{ antialias: tier === 'high', alpha: true, powerPreference: 'high-performance' }}
          onCreated={({ gl }) => {
            gl.domElement.addEventListener('webglcontextlost', (e) => {
              e.preventDefault();
              setLost(true);
            });
          }}
        >
          {children}
        </Canvas>
      </SceneBoundary>
    </div>
  );
}
```

- [ ] **Step 8: Verify**

Run: `pnpm --filter @drikon/web test && pnpm --filter @drikon/web typecheck && pnpm --filter @drikon/web lint`
Expected: PASS (50 tests).

- [ ] **Step 9: Commit**

```bash
git add apps/web/package.json pnpm-lock.yaml apps/web/src/lib/three apps/web/src/components/three/scene-canvas.tsx
git commit -m "feat(web): 3D foundation — R3F deps, device tier, SceneCanvas with 2D fallback

Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>"
```

---

### Task 7: The `SpaceBackdrop` behind every storefront page

**Files:**
- Create: `apps/web/src/components/three/space-backdrop.tsx`
- Create: `apps/web/src/components/three/backdrop-loader.tsx`
- Modify: `apps/web/src/components/layout/site-chrome.tsx`

**Interfaces:**
- Consumes: `SceneCanvas`, `useDeviceTier`
- Produces: `<BackdropLoader />`, rendered by `SiteChrome` on non-admin routes

- [ ] **Step 1: Implement `space-backdrop.tsx`**

```tsx
'use client';

import { useEffect, useRef } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import { Grid, Stars } from '@react-three/drei';
import { useReducedMotion } from 'motion/react';
import { SceneCanvas } from './scene-canvas';

/** Mouse + scroll position, read from window — the canvas itself ignores the pointer. */
function useViewportPointer() {
  const p = useRef({ x: 0, y: 0, scroll: 0 });
  useEffect(() => {
    const move = (e: PointerEvent) => {
      p.current.x = (e.clientX / window.innerWidth) * 2 - 1;
      p.current.y = (e.clientY / window.innerHeight) * 2 - 1;
    };
    const scroll = () => {
      p.current.scroll = window.scrollY;
    };
    window.addEventListener('pointermove', move, { passive: true });
    window.addEventListener('scroll', scroll, { passive: true });
    return () => {
      window.removeEventListener('pointermove', move);
      window.removeEventListener('scroll', scroll);
    };
  }, []);
  return p;
}

function Drift({ enabled }: { enabled: boolean }) {
  const pointer = useViewportPointer();
  const { camera } = useThree();
  useFrame((_, delta) => {
    if (!enabled) return;
    const k = Math.min(1, delta * 2);
    camera.position.x += (pointer.current.x * 0.6 - camera.position.x) * k;
    camera.position.y += (1.6 - pointer.current.y * 0.3 - Math.min(pointer.current.scroll / 1500, 0.8) - camera.position.y) * k;
    camera.lookAt(0, 0, -6);
  });
  return null;
}

export default function SpaceBackdrop({ tier }: { tier: 'low' | 'high' }) {
  const reduced = !!useReducedMotion();
  return (
    <SceneCanvas name="backdrop" tier={tier} fallback={null} className="h-full w-full" camera={{ position: [0, 1.6, 6], fov: 55 }}>
      <fog attach="fog" args={['#05060d', 6, 26]} />
      <Stars radius={60} depth={40} count={tier === 'high' ? 2000 : 600} factor={3} fade speed={reduced ? 0 : 0.6} />
      <Grid
        position={[0, -1.2, 0]}
        infiniteGrid
        cellSize={0.6}
        cellThickness={0.6}
        cellColor="#1b2a55"
        sectionSize={3}
        sectionThickness={1.1}
        sectionColor="#22e5ff"
        fadeDistance={24}
        fadeStrength={1.4}
      />
      <Drift enabled={!reduced} />
    </SceneCanvas>
  );
}
```

- [ ] **Step 2: Implement `backdrop-loader.tsx`**

The CSS fallback is always painted, and the canvas fades in over it once the browser is idle.
```tsx
'use client';

import dynamic from 'next/dynamic';
import { useEffect, useState } from 'react';
import { useDeviceTier } from '@/lib/three/use-device-tier';

const SpaceBackdrop = dynamic(() => import('./space-backdrop'), { ssr: false, loading: () => null });

/** Fixed layer behind the storefront: CSS space gradient always, WebGL on top once idle. */
export function BackdropLoader() {
  const tier = useDeviceTier();
  const [idle, setIdle] = useState(false);

  useEffect(() => {
    const ric = window.requestIdleCallback ?? ((cb: () => void) => window.setTimeout(cb, 400));
    const cancel = window.cancelIdleCallback ?? window.clearTimeout;
    const id = ric(() => setIdle(true));
    return () => cancel(id);
  }, []);

  return (
    <div aria-hidden data-scene-fallback="backdrop" className="space-fallback fixed inset-0 -z-10 pointer-events-none">
      {idle && tier && tier !== 'none' && (
        <div className="absolute inset-0 animate-dk-fade-in">
          <SpaceBackdrop tier={tier} />
        </div>
      )}
    </div>
  );
}
```

- [ ] **Step 3: Mount it in `SiteChrome`**

In `site-chrome.tsx`, add `import { BackdropLoader } from '@/components/three/backdrop-loader';`. In the non-admin branch, render `<BackdropLoader />` as the first child of the fragment. Change the doc comment's first sentence to: "Shows the storefront's space backdrop, header and footer everywhere except the admin panel, …".

- [ ] **Step 4: Make the body transparent so the fixed layer shows through**

`html, body { background: var(--bg) }` already paints below the `-z-10` layer, because the layer sits inside the `relative z-10` wrapper's stacking context. No change is needed. Confirm visually in Step 5.

- [ ] **Step 5: Verify**

Run: `pnpm --filter @drikon/web typecheck && pnpm --filter @drikon/web lint && pnpm --filter @drikon/web build`

In the build output, `/products` First Load JS must be within 5 kB of `main`. Record `main`'s number first by running `git stash; pnpm --filter @drikon/web build` on the pre-task tree, or by building a `main` worktree once at the start of Task 7.

Then `next start -p 3100` and screenshot `/` at 1440 px:
- A cyan grid floor and stars are visible behind the content.
- Moving the mouse shifts them slightly.
- `/admin` shows no backdrop.

- [ ] **Step 6: Commit**

```bash
git add apps/web/src/components/three/space-backdrop.tsx apps/web/src/components/three/backdrop-loader.tsx apps/web/src/components/layout/site-chrome.tsx
git commit -m "feat(web): WebGL space backdrop behind the storefront with CSS fallback

Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>"
```

---

### Task 8: Homepage `HeroScene`

**Files:**
- Create: `apps/web/src/components/three/hero-scene.tsx`
- Create: `apps/web/src/components/three/hero-scene-loader.tsx`
- Create: `apps/web/src/components/home/hero-stage.tsx`
- Modify: `apps/web/src/app/page.tsx`
- Modify: `apps/web/src/messages/en.json` and `bn.json` (namespace `home`)

**Interfaces:**
- Consumes: `SceneCanvas`, `SceneBoundary`, `useDeviceTier`
- Produces:
  - `type HeroProduct = { slug: string; name: string; image: string }`
  - `<HeroSceneLoader products={HeroProduct[]} />`
  - `<HeroStage products={ProductSummary[]} />`, a server component

- [ ] **Step 1: Add the messages**

In `en.json` → `home`, add:
```json
"heroKicker": "Next-gen tech store",
"heroTitle": "Gear from the future, delivered today",
"heroSubtitle": "Phones, wearables, audio and robotics — authentic, warrantied and at your door in 24 hours.",
"heroCta": "Shop now",
"heroSecondary": "Today's deals"
```
In `bn.json` → `home`, add:
```json
"heroKicker": "নেক্সট-জেন টেক স্টোর",
"heroTitle": "ভবিষ্যতের গ্যাজেট, আজই আপনার হাতে",
"heroSubtitle": "ফোন, ওয়্যারেবল, অডিও ও রোবোটিক্স — আসল, ওয়ারেন্টিসহ, ২৪ ঘণ্টায় ডেলিভারি।",
"heroCta": "এখনই কিনুন",
"heroSecondary": "আজকের অফার"
```

- [ ] **Step 2: Implement `hero-scene.tsx`**

```tsx
'use client';

import { Suspense, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useFrame } from '@react-three/fiber';
import { Float, Image as DreiImage } from '@react-three/drei';
import { EffectComposer, Bloom } from '@react-three/postprocessing';
import { useReducedMotion } from 'motion/react';
import type { Group, Mesh } from 'three';
import { SceneBoundary, SceneCanvas } from './scene-canvas';

export type HeroProduct = { slug: string; name: string; image: string };

const RADIUS = 2.6;

function Core({ spin }: { spin: boolean }) {
  const shell = useRef<Mesh>(null);
  useFrame((_, d) => {
    if (spin && shell.current) {
      shell.current.rotation.y += d * 0.25;
      shell.current.rotation.x += d * 0.1;
    }
  });
  return (
    <group>
      <mesh ref={shell}>
        <icosahedronGeometry args={[1, 1]} />
        <meshStandardMaterial color="#22e5ff" emissive="#22e5ff" emissiveIntensity={1.4} wireframe />
      </mesh>
      <mesh>
        <sphereGeometry args={[0.55, 48, 48]} />
        <meshStandardMaterial color="#8b5cf6" emissive="#8b5cf6" emissiveIntensity={2} roughness={0.2} />
      </mesh>
    </group>
  );
}

/** A glass plate with no photo — shown when a product image can't load as a texture (e.g. no CORS). */
function BlankPanel() {
  return (
    <mesh>
      <planeGeometry args={[1.25, 1.25]} />
      <meshStandardMaterial color="#12183a" emissive="#22e5ff" emissiveIntensity={0.08} transparent opacity={0.7} />
    </mesh>
  );
}

function Panel({ product, angle }: { product: HeroProduct; angle: number }) {
  const router = useRouter();
  const ref = useRef<Group>(null);
  const [hovered, setHovered] = useState(false);
  useFrame((_, d) => {
    const g = ref.current;
    if (!g) return;
    const target = hovered ? 1.18 : 1;
    g.scale.setScalar(g.scale.x + (target - g.scale.x) * Math.min(1, d * 10));
  });
  return (
    <group
      ref={ref}
      position={[Math.cos(angle) * RADIUS, Math.sin(angle * 2) * 0.35, Math.sin(angle) * RADIUS]}
      onPointerOver={(e) => {
        e.stopPropagation();
        setHovered(true);
        document.body.style.cursor = 'pointer';
      }}
      onPointerOut={() => {
        setHovered(false);
        document.body.style.cursor = '';
      }}
      onClick={() => router.push(`/products/${product.slug}`)}
    >
      <SceneBoundary fallback={<BlankPanel />}>
        <Suspense fallback={<BlankPanel />}>
          <DreiImage url={product.image} scale={[1.25, 1.25]} radius={0.12} transparent />
        </Suspense>
      </SceneBoundary>
    </group>
  );
}

function Orbit({ products, spin }: { products: HeroProduct[]; spin: boolean }) {
  const ring = useRef<Group>(null);
  useFrame(({ camera }, d) => {
    if (spin && ring.current) ring.current.rotation.y += d * 0.15;
    // Panels always face the camera so the photos stay readable.
    ring.current?.children.forEach((c) => c.lookAt(camera.position));
  });
  return (
    <group ref={ring}>
      {products.map((p, i) => (
        <Panel key={p.slug} product={p} angle={(i / products.length) * Math.PI * 2} />
      ))}
    </group>
  );
}

export default function HeroScene({ products, tier }: { products: HeroProduct[]; tier: 'low' | 'high' }) {
  const spin = !useReducedMotion();
  return (
    <SceneCanvas name="hero" tier={tier} fallback={null} className="h-full w-full" camera={{ position: [0, 1.2, 7], fov: 42 }}>
      <ambientLight intensity={0.5} />
      <pointLight position={[4, 4, 4]} intensity={40} color="#22e5ff" />
      <pointLight position={[-4, -2, 2]} intensity={30} color="#8b5cf6" />
      <Float speed={spin ? 2 : 0} rotationIntensity={0.4} floatIntensity={0.6}>
        <Core spin={spin} />
      </Float>
      <Float speed={spin ? 1.4 : 0} floatIntensity={1.2} position={[-3.2, 1.4, -1.5]}>
        <mesh>
          <torusGeometry args={[0.45, 0.08, 16, 64]} />
          <meshStandardMaterial color="#ff2e88" emissive="#ff2e88" emissiveIntensity={1.6} />
        </mesh>
      </Float>
      <Float speed={spin ? 1.8 : 0} floatIntensity={1} position={[3.3, -1.1, -1]}>
        <mesh>
          <octahedronGeometry args={[0.4]} />
          <meshStandardMaterial color="#22e5ff" emissive="#22e5ff" emissiveIntensity={1.2} wireframe />
        </mesh>
      </Float>
      <Orbit products={products.slice(0, 6)} spin={spin} />
      {tier === 'high' && (
        <EffectComposer>
          <Bloom intensity={0.9} luminanceThreshold={0.25} mipmapBlur />
        </EffectComposer>
      )}
    </SceneCanvas>
  );
}
```

- [ ] **Step 3: Implement `hero-scene-loader.tsx`**

```tsx
'use client';

import dynamic from 'next/dynamic';
import { useDeviceTier } from '@/lib/three/use-device-tier';
import type { HeroProduct } from './hero-scene';

const HeroScene = dynamic(() => import('./hero-scene'), { ssr: false, loading: () => null });

/** Static neon composition first (SSR + no-WebGL), the 3D scene once the device qualifies. */
export function HeroSceneLoader({ products }: { products: HeroProduct[] }) {
  const tier = useDeviceTier();
  const fallback = (
    <div data-scene-fallback="hero" className="relative h-full w-full grid place-items-center">
      <div className="h-40 w-40 rounded-full bg-[radial-gradient(circle,#8b5cf6_0%,rgba(34,229,255,0.35)_45%,transparent_70%)] blur-[2px] animate-glow-pulse" />
    </div>
  );
  if (!tier || tier === 'none' || products.length === 0) return fallback;
  return <HeroScene products={products} tier={tier} />;
}
```

- [ ] **Step 4: Implement `hero-stage.tsx` (server component)**

```tsx
import Link from 'next/link';
import { getTranslations } from 'next-intl/server';
import type { ProductSummary } from '@drikon/shared-types';
import { HeroSceneLoader } from '@/components/three/hero-scene-loader';

/**
 * Full-width opening stage: HTML headline and calls to action (SEO, keyboard,
 * screen readers) beside the WebGL scene. Every product in the scene is also a
 * normal link further down the page, so nothing is reachable only in 3D.
 */
export async function HeroStage({ products }: { products: ProductSummary[] }) {
  const t = await getTranslations('home');
  const heroProducts = products
    .filter((p) => p.images?.[0]?.url)
    .slice(0, 6)
    .map((p) => ({ slug: p.slug, name: p.name, image: p.images[0].url }));

  return (
    <section className="shell pt-6 lg:pt-10">
      <div className="relative overflow-hidden rounded-[var(--radius-card)] border border-[color:var(--border)] bg-[color:var(--surface)] grid-texture grid lg:grid-cols-[minmax(0,1fr)_minmax(0,1.1fr)] items-center">
        <div className="relative z-10 p-6 sm:p-10 lg:p-14">
          <p className="font-mono text-xs uppercase tracking-[0.25em] text-[color:var(--accent)]">{t('heroKicker')}</p>
          <h1 className="font-display mt-3 text-3xl sm:text-5xl font-bold leading-[1.05]">
            <span className="neon-text">{t('heroTitle')}</span>
          </h1>
          <p className="mt-4 max-w-md text-[15px] text-[color:var(--fg-muted)]">{t('heroSubtitle')}</p>
          <div className="mt-7 flex flex-wrap gap-3">
            <Link href="/products" className="btn-primary">{t('heroCta')}</Link>
            <Link href="/products?featured=true" className="btn-ghost">{t('heroSecondary')}</Link>
          </div>
        </div>
        <div className="relative h-[300px] sm:h-[380px] lg:h-[460px]">
          <HeroSceneLoader products={heroProducts} />
        </div>
      </div>
    </section>
  );
}
```

- [ ] **Step 5: Use it on the homepage**

In `app/page.tsx`, add `import { HeroStage } from '@/components/home/hero-stage';`, and render `<HeroStage products={featured} />` as the first child of the returned fragment, above the "Opening row" section. The existing banner slider or static hero, category sidebar and promo tiles stay below it.

The page previously had no `<h1>` of its own apart from the banner. If `StaticHero` or `HeroSlider` renders an `<h1>`, change it to `<h2>` so the page has exactly one `<h1>`. Check with `grep -n "<h1" src/components/home/static-hero.tsx src/components/shop/hero-slider.tsx`.

- [ ] **Step 6: Verify**

Run: `pnpm --filter @drikon/web typecheck && pnpm --filter @drikon/web lint && pnpm --filter @drikon/web build`, then `next start -p 3100`.

Screenshot `/` at 1440 px and 390 px:
- The headline renders in Space Grotesk with a gradient.
- The core and orbiting product panels render.
- Clicking a panel opens that product.

Also run `curl -s localhost:3100/ | grep -c '<h1'`. Expected: `1`.

- [ ] **Step 7: Commit**

```bash
git add apps/web/src/components/three/hero-scene.tsx apps/web/src/components/three/hero-scene-loader.tsx apps/web/src/components/home/hero-stage.tsx apps/web/src/app/page.tsx apps/web/src/components/home/static-hero.tsx apps/web/src/components/shop/hero-slider.tsx apps/web/src/messages
git commit -m "feat(web): 3D hero stage with orbiting featured products

Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>"
```

---

### Task 9: `ProductViewer3D` and the 3D / Photos toggle

**Files:**
- Create: `apps/web/src/components/three/product-viewer-3d.tsx`
- Create: `apps/web/src/components/shop/product-media.tsx`
- Modify: `apps/web/src/app/(shop)/products/[slug]/page.tsx`: `ProductDetail` (line ~40) and the `<ProductGallery … />` call (~193)
- Modify: `apps/web/src/messages/en.json` and `bn.json` (namespace `pdp`)

**Interfaces:**
- Consumes: `SceneCanvas`, `SceneBoundary`, `useDeviceTier`, `ProductGallery` (props `{ images, name, badge }`), `ProductThumb` (props `{ src, alt?, sizes, priority? }`)
- Produces:
  - `ProductViewer3D` (default export) with props `{ tier: 'low' | 'high'; modelUrl: string | null; imageUrl: string | null; onFail: () => void; onReady: () => void }`
  - `<ProductMedia images name badge modelUrl labels={{ view3d: string; photos: string; hint: string }} />`

- [ ] **Step 1: Add the messages**

In `en.json` → `pdp`, add `"view3d": "3D view", "viewPhotos": "Photos", "viewerHint": "Drag to rotate"`.
In `bn.json` → `pdp`, add `"view3d": "থ্রিডি ভিউ", "viewPhotos": "ছবি", "viewerHint": "ঘোরাতে টেনে ধরুন"`.

- [ ] **Step 2: Implement `product-viewer-3d.tsx`**

```tsx
'use client';

import { Suspense, useEffect, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { Bounds, Center, ContactShadows, Image as DreiImage, OrbitControls, useGLTF } from '@react-three/drei';
import { useReducedMotion } from 'motion/react';
import type { Group } from 'three';
import { SceneBoundary, SceneCanvas } from './scene-canvas';

function Model({ url }: { url: string }) {
  const { scene } = useGLTF(url);
  return (
    <Bounds fit clip observe margin={1.25}>
      <Center>
        <primitive object={scene} />
      </Center>
    </Bounds>
  );
}

/** Photo on a glass panel above a lit plinth; sways instead of spinning so the back never shows. */
function PhotoPlinth({ url, sway }: { url: string; sway: boolean }) {
  const panel = useRef<Group>(null);
  useFrame(({ clock }) => {
    if (sway && panel.current) panel.current.rotation.y = Math.sin(clock.elapsedTime * 0.6) * 0.45;
  });
  return (
    <group position={[0, -0.2, 0]}>
      <group ref={panel} position={[0, 0.55, 0]}>
        <DreiImage url={url} scale={[2.3, 2.3]} radius={0.1} />
      </group>
      <mesh position={[0, -0.85, 0]}>
        <cylinderGeometry args={[1.25, 1.4, 0.22, 64]} />
        <meshStandardMaterial color="#0d1122" metalness={0.8} roughness={0.25} />
      </mesh>
      <mesh position={[0, -0.73, 0]} rotation={[Math.PI / 2, 0, 0]}>
        <torusGeometry args={[1.26, 0.02, 12, 96]} />
        <meshStandardMaterial color="#22e5ff" emissive="#22e5ff" emissiveIntensity={2.4} />
      </mesh>
    </group>
  );
}

/** Any scene failure bubbles here and switches the page back to the 2D gallery. */
function FailSignal({ onFail }: { onFail: () => void }) {
  useEffect(() => onFail(), [onFail]);
  return null;
}

/** Mounted inside <Canvas>, so it fires once the WebGL scene exists — hides the loading overlay. */
function ReadySignal({ onReady }: { onReady: () => void }) {
  useEffect(() => onReady(), [onReady]);
  return null;
}

export default function ProductViewer3D({
  tier,
  modelUrl,
  imageUrl,
  onFail,
  onReady,
}: {
  tier: 'low' | 'high';
  modelUrl: string | null;
  imageUrl: string | null;
  onFail: () => void;
  onReady: () => void;
}) {
  const reduced = !!useReducedMotion();
  return (
    <SceneCanvas name="product" tier={tier} fallback={<FailSignal onFail={onFail} />} className="h-full w-full" camera={{ position: [0, 0.4, 4.2], fov: 40 }}>
      <color attach="background" args={['#070914']} />
      <ReadySignal onReady={onReady} />
      <ambientLight intensity={0.6} />
      <directionalLight position={[3, 4, 2]} intensity={2.2} />
      <pointLight position={[-3, 1, -2]} intensity={25} color="#8b5cf6" />
      <pointLight position={[3, 0.5, -2]} intensity={25} color="#22e5ff" />
      <SceneBoundary fallback={<FailSignal onFail={onFail} />}>
        <Suspense fallback={null}>
          {modelUrl ? <Model url={modelUrl} /> : imageUrl ? <PhotoPlinth url={imageUrl} sway={!reduced} /> : null}
        </Suspense>
      </SceneBoundary>
      <ContactShadows position={[0, -1.1, 0]} opacity={0.55} scale={6} blur={2.4} far={2} color="#22e5ff" />
      <OrbitControls
        makeDefault
        enablePan={false}
        autoRotate={!!modelUrl && !reduced}
        autoRotateSpeed={1.2}
        minDistance={2.5}
        maxDistance={7}
        {...(modelUrl ? {} : { minAzimuthAngle: -Math.PI / 3, maxAzimuthAngle: Math.PI / 3 })}
      />
    </SceneCanvas>
  );
}
```

- [ ] **Step 3: Implement `product-media.tsx`**

```tsx
'use client';

import dynamic from 'next/dynamic';
import { useCallback, useEffect, useState } from 'react';
import { Box, Images, Loader2 } from 'lucide-react';
import { useDeviceTier } from '@/lib/three/use-device-tier';
import { ProductGallery } from './product-gallery';
import { ProductThumb } from './product-thumb';
import { cn } from '@/lib/utils';

type Img = { url: string; alt?: string | null };
type Mode = '3d' | 'photos';
const KEY = 'drikon:viewer-mode';

const ProductViewer3D = dynamic(() => import('@/components/three/product-viewer-3d'), { ssr: false, loading: () => null });

/**
 * Product media with a 3D / Photos switch. 3D shows the .glb model when the
 * product has one, otherwise its photo on a lit plinth. Falls back to the 2D
 * gallery on no WebGL or any 3D failure; the 2D gallery is always one click away.
 */
export function ProductMedia({
  images,
  name,
  badge,
  modelUrl,
  labels,
}: {
  images: Img[];
  name: string;
  badge?: React.ReactNode;
  modelUrl: string | null;
  labels: { view3d: string; photos: string; hint: string };
}) {
  const tier = useDeviceTier();
  const [mode, setMode] = useState<Mode>('3d');
  const [failed, setFailed] = useState(false);
  const [active, setActive] = useState(0);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    try {
      if (localStorage.getItem(KEY) === 'photos') setMode('photos');
    } catch {
      /* storage blocked — default to 3D */
    }
  }, []);

  const choose = (m: Mode) => {
    setMode(m);
    try {
      localStorage.setItem(KEY, m);
    } catch {
      /* ignore */
    }
  };
  const onFail = useCallback(() => setFailed(true), []);
  const onReady = useCallback(() => setReady(true), []);

  const can3d = !!tier && tier !== 'none' && !failed && (!!modelUrl || images.length > 0);
  if (!can3d) return <ProductGallery images={images} name={name} badge={badge} />;

  const current = images[active];
  // can3d already excludes null/'none'; TypeScript can't see through the boolean.
  const viewerTier = tier === 'high' ? 'high' : 'low';

  return (
    <div className="flex flex-col gap-3">
      <div role="group" aria-label={name} className="inline-flex self-start rounded-full border border-[color:var(--border)] bg-[color:var(--surface)] p-1">
        {(['3d', 'photos'] as const).map((m) => (
          <button
            key={m}
            type="button"
            aria-pressed={mode === m}
            onClick={() => choose(m)}
            className={cn(
              'inline-flex items-center gap-1.5 rounded-full px-3.5 py-1.5 text-xs font-bold transition-colors',
              mode === m ? 'bg-[color:var(--accent)] text-[color:var(--accent-fg)]' : 'text-[color:var(--fg-muted)] hover:text-[color:var(--fg)]',
            )}
          >
            {m === '3d' ? <Box aria-hidden className="h-3.5 w-3.5" /> : <Images aria-hidden className="h-3.5 w-3.5" />}
            {m === '3d' ? labels.view3d : labels.photos}
          </button>
        ))}
      </div>

      {mode === 'photos' ? (
        <ProductGallery images={images} name={name} badge={badge} />
      ) : (
        <>
          <div className="relative aspect-square overflow-hidden rounded-[var(--radius-card)] border border-[color:var(--border)] bg-[#070914]">
            {!ready && (
              <div className="absolute inset-0 grid place-items-center">
                <div className="absolute inset-0 opacity-40 [background:var(--image-well)]">
                  <ProductThumb src={current?.url} alt={current?.alt ?? name} sizes="(min-width: 1024px) 45vw, 100vw" priority />
                </div>
                <Loader2 aria-hidden className="relative h-8 w-8 animate-spin text-[color:var(--accent)]" />
              </div>
            )}
            <div className="absolute inset-0">
              <ProductViewer3D tier={viewerTier} modelUrl={modelUrl} imageUrl={current?.url ?? null} onFail={onFail} onReady={onReady} />
            </div>
            {badge && <div className="absolute top-3 left-3 flex flex-col items-start gap-1.5 pointer-events-none">{badge}</div>}
            <p className="pointer-events-none absolute bottom-3 inset-x-0 text-center font-mono text-[11px] uppercase tracking-[0.2em] text-[color:var(--fg-muted)]">
              {labels.hint}
            </p>
          </div>
          {!modelUrl && images.length > 1 && (
            <ul className="flex gap-2 overflow-x-auto scrollbar-none">
              {images.slice(0, 6).map((img, i) => (
                <li key={img.url} className="shrink-0">
                  <button
                    type="button"
                    onClick={() => setActive(i)}
                    aria-pressed={active === i}
                    aria-label={`${name} — ${i + 1} / ${images.length}`}
                    className={cn(
                      'relative block h-16 w-16 overflow-hidden rounded-[var(--radius-ctl)] border-2 [background:var(--image-well)]',
                      active === i ? 'border-[color:var(--accent)]' : 'border-[color:var(--border)]',
                    )}
                  >
                    <ProductThumb src={img.url} sizes="64px" />
                  </button>
                </li>
              ))}
            </ul>
          )}
        </>
      )}
    </div>
  );
}
```

The loading overlay (the dimmed photo plus a spinner) stays until `ReadySignal` mounts inside the Canvas, so it covers both the dynamic chunk download and WebGL start-up.

- [ ] **Step 4: Use it on the product page**

In `app/(shop)/products/[slug]/page.tsx`:
- Add `modelUrl?: string | null;` to `interface ProductDetail` under `videoUrl`.
- Replace the `ProductGallery` import with `import { ProductMedia } from '@/components/shop/product-media';`.
- Replace `<ProductGallery images={…} name={name} badge={…} />` with the call below, keeping the same `badge` JSX:
```tsx
          <ProductMedia
            images={product.images ?? []}
            name={name}
            modelUrl={product.modelUrl ?? null}
            labels={{ view3d: t('view3d'), photos: t('viewPhotos'), hint: t('viewerHint') }}
            badge={
              <>
                {onSale && <span className="badge-sale !text-xs">{t('offBadge', { discount })}</span>}
                {onFlashSale && <span className="badge-deal !text-xs">{t('flashSale')}</span>}
              </>
            }
          />
```
`PremiumProductPage` (the `template: 'premium'` products) is left unchanged.

- [ ] **Step 5: Verify**

Run: `pnpm --filter @drikon/web typecheck && pnpm --filter @drikon/web lint && pnpm --filter @drikon/web build`, then `next start -p 3100`.

Open a product without a model:
- The photo sits on the plinth with a cyan ring.
- Dragging rotates within ±60°.
- "Photos" switches to the 2D gallery, and a reload remembers it.

Set `modelUrl` on one product (Task 2 manual step, `Astronaut.glb`):
- The model auto-rotates, drags freely and zooms within its limits.

Open a product whose image host has no CORS (for example a `dlcdnwebimgs.asus.com` image):
- The page falls back to the 2D gallery, with no uncaught errors in the console.

- [ ] **Step 6: Commit**

```bash
git add apps/web/src/components/three/product-viewer-3d.tsx apps/web/src/components/shop/product-media.tsx "apps/web/src/app/(shop)/products/[slug]/page.tsx" apps/web/src/messages
git commit -m "feat(web): 3D product viewer — glTF models or photo on a lit plinth, with Photos toggle

Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>"
```

---

### Task 10: `CartOrb` on the cart page

**Files:**
- Create: `apps/web/src/components/three/cart-orb.tsx`
- Create: `apps/web/src/components/three/cart-orb-loader.tsx`
- Modify: `apps/web/src/app/(shop)/cart/page.tsx`: the `<h1>` at line ~57

**Interfaces:**
- Consumes: `SceneCanvas`, `useDeviceTier`
- Produces: `<CartOrbLoader count={number} />`, a decorative, `aria-hidden` 96 × 96 px element

- [ ] **Step 1: Implement `cart-orb.tsx`**

```tsx
'use client';

import { useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { useReducedMotion } from 'motion/react';
import type { Group } from 'three';
import { SceneCanvas } from './scene-canvas';

function Rings({ spin }: { spin: boolean }) {
  const g = useRef<Group>(null);
  useFrame((_, d) => {
    if (!spin || !g.current) return;
    g.current.rotation.y += d * 0.8;
    g.current.rotation.x += d * 0.3;
  });
  return (
    <group ref={g}>
      <mesh>
        <torusGeometry args={[1, 0.05, 16, 96]} />
        <meshStandardMaterial color="#22e5ff" emissive="#22e5ff" emissiveIntensity={2} />
      </mesh>
      <mesh rotation={[Math.PI / 2.4, 0, 0]}>
        <torusGeometry args={[1.2, 0.035, 16, 96]} />
        <meshStandardMaterial color="#8b5cf6" emissive="#8b5cf6" emissiveIntensity={2} />
      </mesh>
    </group>
  );
}

export default function CartOrb({ tier }: { tier: 'low' | 'high' }) {
  const spin = !useReducedMotion();
  return (
    <SceneCanvas name="cart" tier={tier} fallback={null} className="h-full w-full" camera={{ position: [0, 0, 3.6], fov: 45 }}>
      <ambientLight intensity={0.4} />
      <Rings spin={spin} />
    </SceneCanvas>
  );
}
```

- [ ] **Step 2: Implement `cart-orb-loader.tsx`**

```tsx
'use client';

import dynamic from 'next/dynamic';
import { useDeviceTier } from '@/lib/three/use-device-tier';

const CartOrb = dynamic(() => import('./cart-orb'), { ssr: false, loading: () => null });

/** Holographic ring around the item count. Decorative — the count is also in the <h1>. */
export function CartOrbLoader({ count }: { count: number }) {
  const tier = useDeviceTier();
  return (
    <div aria-hidden className="relative h-24 w-24 shrink-0">
      {tier && tier !== 'none' ? (
        <CartOrb tier={tier} />
      ) : (
        <div data-scene-fallback="cart" className="absolute inset-2 rounded-full border-2 border-[color:var(--accent)] shadow-[0_0_24px_var(--glow)]" />
      )}
      <span className="absolute inset-0 grid place-items-center font-display text-2xl font-bold text-[color:var(--accent)]">{count}</span>
    </div>
  );
}
```

- [ ] **Step 3: Use it on the cart page**

In `cart/page.tsx`, add `import { CartOrbLoader } from '@/components/three/cart-orb-loader';`. Replace the `<h1 …>…</h1>` with:
```tsx
      <div className="mt-4 mb-6 flex items-center gap-4">
        <CartOrbLoader count={itemCount} />
        <h1 className="font-display text-2xl md:text-3xl font-bold tracking-tight">
          {t('title')} <span className="text-[color:var(--fg-muted)] font-semibold text-lg">({t('itemCount', { count: itemCount })})</span>
        </h1>
      </div>
```

- [ ] **Step 4: Verify**

Run: `pnpm --filter @drikon/web typecheck && pnpm --filter @drikon/web lint`. Then check the cart visually with one item: the rings spin around the count.

- [ ] **Step 5: Commit**

```bash
git add apps/web/src/components/three/cart-orb.tsx apps/web/src/components/three/cart-orb-loader.tsx "apps/web/src/app/(shop)/cart/page.tsx"
git commit -m "feat(web): holographic cart orb

Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>"
```

---

### Task 11: End-to-end checks, bundle budget and screenshots

**Files:**
- Create: `apps/web/e2e/three-d.spec.ts`

**Interfaces:**
- Consumes: the `data-scene`, `data-scene-fallback` and `data-tilt` markers, and the 3D / Photos toggle buttons with `aria-pressed`

- [ ] **Step 1: Write the spec**

`apps/web/e2e/three-d.spec.ts`:
```ts
import { test, expect, type Page } from '@playwright/test';

/** Errors that aren't ours (browser extensions, favicon 404s in dev) never reach headless runs; anything else fails. */
function collectErrors(page: Page): string[] {
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(e.message));
  page.on('console', (m) => {
    if (m.type() === 'error') errors.push(m.text());
  });
  return errors;
}

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

test.describe('3D storefront (WebGL on)', () => {
  test.use({ launchOptions: { args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader'] } });

  test('home renders the backdrop and hero scenes without errors', async ({ page }) => {
    const errors = collectErrors(page);
    await page.goto('/');
    await expect(page.locator('h1')).toHaveCount(1);
    await expect(page.locator('[data-scene="backdrop"] canvas')).toBeVisible({ timeout: 15_000 });
    const hero = page.locator('[data-scene="hero"] canvas');
    if ((await page.locator('[data-scene-fallback="hero"]').count()) === 0) await expect(hero).toBeVisible({ timeout: 15_000 });
    expect(errors).toEqual([]);
  });

  test('product viewer switches between 3D and photos', async ({ page }) => {
    const href = await firstProductHref(page);
    test.skip(!href, 'no products in this environment');
    await page.goto(href!);
    const toggle3d = page.getByRole('button', { name: /3D/i });
    const photos = page.getByRole('button', { name: /photos/i });
    await expect(toggle3d).toHaveAttribute('aria-pressed', 'true');
    await expect(page.locator('[data-scene="product"] canvas')).toBeVisible({ timeout: 15_000 });
    await photos.click();
    await expect(page.locator('[data-scene="product"]')).toHaveCount(0);
    await expect(photos).toHaveAttribute('aria-pressed', 'true');
    await page.reload();
    await expect(page.getByRole('button', { name: /photos/i })).toHaveAttribute('aria-pressed', 'true');
    await page.getByRole('button', { name: /3D/i }).click();
    await expect(page.locator('[data-scene="product"] canvas')).toBeVisible({ timeout: 15_000 });
  });

  test('reduced motion disables card tilt', async ({ page }) => {
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await page.goto('/products');
    const card = page.locator('[data-tilt]').first();
    test.skip((await card.count()) === 0, 'no products in this environment');
    await expect(card).toHaveAttribute('data-tilt', 'off');
  });
});

test.describe('3D storefront (WebGL off)', () => {
  test.use({ launchOptions: { args: ['--disable-webgl', '--disable-3d-apis'] } });

  test('pages fall back to 2D and stay usable', async ({ page }) => {
    const errors = collectErrors(page);
    await page.goto('/');
    await expect(page.locator('[data-scene-fallback="backdrop"]')).toBeVisible();
    await expect(page.locator('[data-scene-fallback="hero"]')).toBeVisible();
    await expect(page.locator('canvas')).toHaveCount(0);
    const href = await firstProductHref(page);
    if (href) {
      await page.goto(href);
      await expect(page.getByRole('button', { name: /photos/i })).toHaveCount(0); // plain gallery, no toggle
      await expect(page.getByRole('button', { name: /add to cart/i }).first()).toBeVisible();
    }
    expect(errors).toEqual([]);
  });
});
```

- [ ] **Step 2: Run it**

With the API on :4000 (started with `WEB_ORIGIN=http://localhost:3000,http://localhost:3100`) and `next start -p 3100`:
```bash
cd apps/web && pnpm exec playwright test e2e/three-d.spec.ts e2e/storefront.spec.ts
```
Expected: all pass. If the WebGL-on tests get `data-scene-fallback` because headless Chromium has no GPU, check that the swiftshader flags were applied (`chrome://gpu` in a headed run). Don't weaken the assertions.

- [ ] **Step 3: Bundle budget**

Run `pnpm --filter @drikon/web build` on this branch and on `main`, using `git worktree add ../drikon-main main` for the second. Compare "First Load JS" for `/products` and `/checkout`.
Expected: an increase of at most 5 kB each. If it's over, check that nothing imports `three` or `@react-three/*` statically outside `components/three/*` files loaded through `dynamic()`: `grep -rn "from 'three'\|@react-three" apps/web/src | grep -v components/three`.

- [ ] **Step 4: Screenshots**

Save full-page screenshots of `/`, `/products`, one product, `/cart` (with 1 item) and `/login`, at 390 px and 1440 px width, into the session scratchpad. Review them for contrast and layout, then fix anything found in the task that owns it.

- [ ] **Step 5: Full verification**

Run:
```bash
pnpm --filter @drikon/api test && pnpm --filter @drikon/web test && pnpm --filter @drikon/web typecheck && pnpm lint && pnpm build
```
Expected: everything passes: API 202, web 50.

- [ ] **Step 6: Commit**

```bash
git add apps/web/e2e/three-d.spec.ts
git commit -m "test(web): e2e for 3D scenes, WebGL-off fallbacks and reduced motion

Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>"
```
