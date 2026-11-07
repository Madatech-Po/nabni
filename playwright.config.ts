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

export default defineConfig({
  testDir: './e2e',
  fullyParallel: true,
  forbidOnly: isCI,
  retries: isCI ? 1 : 0,
  // The dev server compiles pages on first visit and breaks under heavy parallel
  // load, and every test talks to the live project: keep it to two workers.
  workers: 2,
  expect: { timeout: 10_000 },
  reporter: isCI ? [['list'], ['html', { open: 'never' }]] : [['list']],
  use: {
    baseURL,
    locale: 'ar-EG',
    timezoneId: 'Africa/Cairo',
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
  },
  projects: [
    { name: 'setup', testMatch: /.*\.setup\.ts/ },
    { name: 'chromium', use: { ...devices['Desktop Chrome'] }, dependencies: ['setup'] },
  ],
  webServer: {
    // CI tests the production build; locally an already running `npm run dev` is reused.
    command: isCI ? `npm run build && npm run start -- -p ${port}` : `npm run dev -- -p ${port}`,
    url: baseURL,
    reuseExistingServer: !isCI,
    timeout: 180_000,
  },
});
