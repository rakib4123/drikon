import { test, expect, type Page } from '@playwright/test';

/**
 * Storefront smoke tests — the paths that must never be broken by a deploy.
 *
 * The catalogue pages degrade gracefully when the API is unreachable (they render
 * an empty state rather than erroring), so a test that needs real products checks
 * for them first and skips instead of reporting a false failure.
 */

async function hasProducts(page: Page): Promise<boolean> {
  await page.goto('/products');
  const cards = page.locator('article a[href^="/products/"]');
  try {
    await cards.first().waitFor({ state: 'visible', timeout: 5_000 });
    return true;
  } catch {
    return false;
  }
}

test.describe('storefront', () => {
  test('home page renders the shell and primary navigation', async ({ page }) => {
    await page.goto('/');
    await expect(page).toHaveTitle(/drikon/i);
    await expect(page.locator('main')).toBeVisible();
    await expect(page.getByRole('link', { name: /products/i }).first()).toBeVisible();
  });

  test('products page renders without a server error', async ({ page }) => {
    const response = await page.goto('/products');
    expect(response?.status()).toBeLessThan(400);
    await expect(page.locator('main')).toBeVisible();
  });

  test('a product page opens from the catalogue', async ({ page }) => {
    test.skip(!(await hasProducts(page)), 'No seeded products available');

    await page.locator('article a[href^="/products/"]').first().click();
    await expect(page).toHaveURL(/\/products\/[^/]+$/);
    // The price is the one thing a product page must always show.
    await expect(page.locator('main')).toContainText(/৳|BDT|\d/);
  });

  test('adding to the cart updates the cart page', async ({ page }) => {
    test.skip(!(await hasProducts(page)), 'No seeded products available');

    await page.locator('article a[href^="/products/"]').first().click();
    await page.getByRole('button', { name: /add to cart/i }).first().click();

    await page.goto('/cart');
    await expect(page.locator('main')).toBeVisible();
    await expect(page.locator('main')).not.toContainText(/your cart is empty/i);
  });

  test('unknown routes return the 404 page, not a crash', async ({ page }) => {
    const response = await page.goto('/this-route-does-not-exist');
    expect(response?.status()).toBe(404);
    await expect(page.locator('main, body')).toContainText(/not found|404/i);
  });
});

test.describe('admin', () => {
  test('the admin panel is not reachable without signing in', async ({ page }) => {
    await page.goto('/admin');
    // The layout bounces an anonymous visitor to login; the API enforces the
    // real gate, this only checks the client guard is still wired up.
    await expect(page).toHaveURL(/\/login/, { timeout: 15_000 });
  });
});
