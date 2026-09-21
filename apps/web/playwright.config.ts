import { defineConfig, devices } from '@playwright/test';

/**
 * `pnpm test:e2e` was wired up but had no config and no specs, so it could never
 * run. These are storefront smoke tests: they assume the web app can reach a
 * seeded API, and they skip themselves rather than fail when it can't, so a
 * checkout without a database doesn't produce false alarms.
 */
const PORT = Number(process.env.E2E_PORT ?? 3100);
const BASE_URL = process.env.E2E_BASE_URL ?? `http://localhost:${PORT}`;
// This environment's ms-playwright cache has chromium-1234, but the installed
// playwright-core (1.60.0) pins revision 1223, so the default download-managed
// launch fails with "Executable doesn't exist". Rather than re-downloading browsers,
// allow pointing at the cached binary directly.
const CHROMIUM_EXECUTABLE_PATH = process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH;

export default defineConfig({
  testDir: './e2e',
  // Fail the run if a `.only` was committed by accident.
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: process.env.CI ? [['github'], ['html', { open: 'never' }]] : [['list']],
  timeout: 30_000,
  expect: { timeout: 10_000 },

  use: {
    baseURL: BASE_URL,
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
    ...(CHROMIUM_EXECUTABLE_PATH ? { launchOptions: { executablePath: CHROMIUM_EXECUTABLE_PATH } } : {}),
  },

  projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'] } }],

  // Reuse an already-running dev server locally; boot a production build in CI.
  webServer: process.env.E2E_BASE_URL
    ? undefined
    : {
        command: `pnpm start -p ${PORT}`,
        url: BASE_URL,
        reuseExistingServer: !process.env.CI,
        timeout: 120_000,
      },
});
