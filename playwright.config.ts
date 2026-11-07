import { defineConfig, devices } from '@playwright/test';

// UI tests run against the live Supabase project (see epic NAB-68): Next.js
// reads NEXT_PUBLIC_SUPABASE_* from .env.local locally and from secrets in CI.
const isCI = !!process.env.CI;
const port = 3000;
const baseURL = `http://localhost:${port}`;

export default defineConfig({
  testDir: './e2e',
  fullyParallel: true,
  forbidOnly: isCI,
  retries: isCI ? 1 : 0,
  workers: isCI ? 2 : undefined,
  reporter: isCI ? [['list'], ['html', { open: 'never' }]] : [['list']],
  use: {
    baseURL,
    locale: 'ar-EG',
    timezoneId: 'Africa/Cairo',
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
  },
  projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'] } }],
  webServer: {
    // CI tests the production build; locally an already running `npm run dev` is reused.
    command: isCI ? 'npm run build && npm run start' : 'npm run dev',
    url: baseURL,
    reuseExistingServer: !isCI,
    timeout: 180_000,
  },
});
