import { defineConfig, devices } from '@playwright/test';
import { loadEnvConfig } from '@next/env';

// UI tests run against the live Supabase project (see epic NAB-68). Load
// .env.local the way Next.js does, so the specs see the E2E_* accounts too;
// in CI the same variables come from secrets.
loadEnvConfig(process.cwd());

const isCI = !!process.env.CI;
// E2E_PORT lets a second checkout run its own server next to `npm run dev` on 3000.
const port = Number(process.env.E2E_PORT ?? 3000);
const baseURL = `http://localhost:${port}`;
// To watch the tests (NAB-112): E2E_BROWSER=chrome or msedge drives the installed browser
// instead of Playwright's bundled Chromium, and E2E_SLOWMO=<ms> pauses between actions.
const channel = process.env.E2E_BROWSER || undefined;
const slowMo = Number(process.env.E2E_SLOWMO ?? 0);

export default defineConfig({
  testDir: './e2e',
  fullyParallel: true,
  forbidOnly: isCI,
  retries: isCI ? 1 : 0,
  // The dev server compiles pages on first visit and breaks under heavy parallel
  // load, and every test talks to the live project: keep it to two workers.
  workers: 2,
  // Slowed-down runs (E2E_SLOWMO) need far longer per test, and more patience while the dev
  // server compiles a page it hasn't served yet.
  timeout: slowMo ? 180_000 : 30_000,
  expect: { timeout: slowMo ? 30_000 : 10_000 },
  reporter: isCI ? [['list'], ['html', { open: 'never' }]] : [['list']],
  use: {
    baseURL,
    locale: 'ar-EG',
    timezoneId: 'Africa/Cairo',
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
    channel,
    launchOptions: { slowMo },
  },
  projects: [
    { name: 'setup', testMatch: /.*\.setup\.ts/ },
    { name: 'chromium', use: { ...devices['Desktop Chrome'], channel }, dependencies: ['setup'], testIgnore: /isolated[\/]/ },
    // Specs that change the shared e2e accounts (e.g. suspend the educator) run after all others.
    { name: 'isolated', testMatch: /isolated[\/].*\.spec\.ts/, use: { ...devices['Desktop Chrome'], channel }, dependencies: ['chromium'] },
  ],
  webServer: {
    // CI tests the production build; locally an already running `npm run dev` is reused.
    command: isCI ? `npm run build && npm run start -- -p ${port}` : `npm run dev -- -p ${port}`,
    url: baseURL,
    reuseExistingServer: !isCI,
    timeout: 180_000,
  },
});
