import { defineConfig, devices } from '@playwright/test';
import { loadEnvConfig } from '@next/env';

// UI tests run against the live Supabase project (see epic NAB-68). Load
// .env.local the way Next.js does, so the specs see the E2E_* accounts too;
// in CI the same variables come from secrets.
loadEnvConfig(process.cwd());

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
  projects: [
    { name: 'setup', testMatch: /.*\.setup\.ts/ },
    { name: 'chromium', use: { ...devices['Desktop Chrome'] }, dependencies: ['setup'] },
  ],
  webServer: {
    // CI tests the production build; locally an already running `npm run dev` is reused.
    command: isCI ? 'npm run build && npm run start' : 'npm run dev',
    url: baseURL,
    reuseExistingServer: !isCI,
    timeout: 180_000,
  },
});
