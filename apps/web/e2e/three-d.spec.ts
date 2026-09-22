import { test, expect, chromium, type Page, type Browser } from '@playwright/test';

// Mirrors playwright.config.ts's own BASE_URL computation. Tests in this file launch
// their own Chromium instances (see WEBGL_ON_ARGS / WEBGL_OFF_ARGS below) instead of
// using `test.use({ launchOptions })`, because that fixture is worker-scoped and
// Playwright 1.60 refuses to register worker-scoped fixtures inside a `test.describe`
// block ("forces a new worker... make it top-level in the test file or the config").
// Both WebGL-on and WebGL-off groups need different launch args in the same spec file,
// so we manage the Browser/Page lifecycle by hand instead of moving that restriction
// into playwright.config.ts.
const PORT = Number(process.env.E2E_PORT ?? 3100);
const BASE_URL = process.env.E2E_BASE_URL ?? `http://localhost:${PORT}`;

const WEBGL_ON_ARGS = ['--use-angle=swiftshader', '--enable-unsafe-swiftshader'];
const WEBGL_OFF_ARGS = ['--disable-webgl', '--disable-3d-apis'];
// See playwright.config.ts for why this may be set: a cached-browser/pinned-revision
// mismatch in this environment. A manual chromium.launch() (below) doesn't inherit
// the config's `use.launchOptions`, so it must be applied here too.
const EXECUTABLE_PATH = process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH;

async function withPage<T>(args: string[], run: (page: Page) => Promise<T>): Promise<T> {
  const browser: Browser = await chromium.launch({ args, executablePath: EXECUTABLE_PATH });
  const page = await browser.newPage({ baseURL: BASE_URL });
  try {
    return await run(page);
  } finally {
    await browser.close();
  }
}

/**
 * Collects real errors only. Signed-out pages legitimately log pre-existing,
 * unrelated network errors (401 on /api/v1/auth/me and /auth/refresh, 404s on a
 * few broken seed Unsplash images), which Chrome reports as console errors whose
 * text starts with "Failed to load resource" — those are ignored. Uncaught
 * exceptions (`pageerror`) and every other console error still fail the test.
 */
function collectErrors(page: Page): string[] {
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(e.message));
  page.on('console', (m) => {
    if (m.type() === 'error' && !m.text().includes('Failed to load resource')) errors.push(m.text());
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
  test('home has no canvases yet and exactly one h1', async () => {
    await withPage(WEBGL_ON_ARGS, async (page) => {
      const errors = collectErrors(page);
      await page.goto('/');
      await expect(page.locator('h1')).toHaveCount(1);
      await expect(page.locator('canvas')).toHaveCount(0);
      expect(errors).toEqual([]);
    });
  });

  test('product viewer switches between 3D and photos', async () => {
    await withPage(WEBGL_ON_ARGS, async (page) => {
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
  });

  // Positive control for the test below: without emulation, a desktop fine
  // pointer should reach data-tilt="on" after hydration — otherwise "off"
  // could just mean the pointer/hover media query never resolved at all.
  test('card tilt turns on for a fine pointer with no reduced motion', async () => {
    await withPage(WEBGL_ON_ARGS, async (page) => {
      await page.goto('/products');
      const card = page.locator('[data-tilt]').first();
      test.skip((await card.count()) === 0, 'no products in this environment');
      await expect(card).toHaveAttribute('data-tilt', 'on');
    });
  });

  test('reduced motion disables card tilt', async () => {
    await withPage(WEBGL_ON_ARGS, async (page) => {
      await page.emulateMedia({ reducedMotion: 'reduce' });
      await page.goto('/products');
      const card = page.locator('[data-tilt]').first();
      test.skip((await card.count()) === 0, 'no products in this environment');
      await expect(card).toHaveAttribute('data-tilt', 'off');
    });
  });
});

test.describe('3D storefront (WebGL off)', () => {
  test('pages fall back to 2D and stay usable', async () => {
    await withPage(WEBGL_OFF_ARGS, async (page) => {
      const errors = collectErrors(page);
      await page.goto('/');
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
});
