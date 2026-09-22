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
      // The "skip to content" link (and any other `.sr-only` utility) is clipped to
      // 1x1px on purpose — Tailwind's standard visually-hidden-but-focusable technique
      // for screen readers and keyboard users. It is never meant to be seen or tapped
      // at its own box size, so it is not a responsive-layout bug.
      if (el.classList.contains('sr-only')) continue;
      const hasOwnText = Array.from(el.childNodes).some((n) => n.nodeType === Node.TEXT_NODE && (n.textContent ?? '').trim().length > 0);
      if (!hasOwnText) continue;

      // A decorative marquee/scroller opts into overflow on purpose — that's not a bug.
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
        if (el.classList.contains('sr-only')) continue; // see the note above
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
  // Each test launches its own browser and never shares state with another, so
  // there's no reason they all pile into one worker. Without this, Playwright's
  // default (fullyParallel: false) runs every test in this file on a single
  // worker no matter what `--workers` says on the command line — 72 sequential
  // page loads is what made this matrix slow in the first place.
  test.describe.configure({ mode: 'parallel' });

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

/**
 * `/checkout` needs a signed-in user, faked here via a routed `/auth/me`. The shape
 * below matches the API's real envelope (verified with
 * `curl -s localhost:4000/api/v1/auth/me`): the global `ResponseInterceptor` wraps
 * every success payload as `{ success, data, requestId, timestamp }`, and the
 * controller's own payload is `{ user: PublicUser }` — so the faked user lives at
 * `data.user`, not `data` directly, and `role` is `PublicUser['role']`
 * ('USER' | 'ADMIN' | 'SUPER_ADMIN'), not an arbitrary string.
 */
test.describe('responsive size matrix (data pages)', () => {
  test.describe.configure({ mode: 'parallel' });

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
                body: JSON.stringify({
                  success: true,
                  data: { user: { id: 'e2e', email: 'e2e@example.com', name: 'E2E', role: 'USER' } },
                  requestId: 'e2e',
                  timestamp: new Date().toISOString(),
                }),
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
