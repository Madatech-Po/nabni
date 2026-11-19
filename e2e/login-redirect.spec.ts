import { test, expect, type Page } from '@playwright/test';
import { account } from './support/accounts';

// The login page only follows redirectTo paths on this site (NAB-126), and explains a wrong
// password in Arabic. These tests log in fresh (no saved session) and sign out of this
// browser only afterwards, so the saved sessions other specs use stay valid.

async function logIn(page: Page, email: string, password: string) {
  await page.getByLabel('البريد الإلكتروني').fill(email);
  await page.getByLabel('كلمة المرور').fill(password);
  await page.getByRole('button', { name: 'دخول' }).click();
}

test('a wrong password shows an Arabic error', async ({ page }) => {
  await page.goto('/login');
  const signIn = page.waitForResponse((r) => r.url().includes('/auth/v1/token'));
  // A made-up address: no real account collects failed attempts.
  await logIn(page, `e2e-nobody-${Date.now()}@example.invalid`, 'wrong-password-123');
  await signIn;

  // Not getByRole('alert'): Next's route announcer is an alert too.
  const alert = page.locator('.MuiAlert-message');
  await expect(alert).toHaveText('البريد الإلكتروني أو كلمة المرور غير صحيحة');
  await expect(alert).not.toHaveText(/invalid|credentials/i);
  await expect(page).toHaveURL(/\/login$/);
});

test.describe('redirectTo after logging in as the e2e parent', () => {
  const credentials = account('parent');
  test.skip(!credentials, 'E2E_PARENT_EMAIL / _PASSWORD not set');
  test.use({ storageState: { cookies: [], origins: [] } }); // log in fresh

  test.afterEach(async ({ page }) => {
    // The app's sign-out button signs out locally (scope: 'local'), never other sessions.
    const signOut = page.getByRole('button', { name: 'تسجيل الخروج' }).first();
    if (await signOut.isVisible().catch(() => false)) {
      await signOut.click();
      await expect(page.getByRole('banner').getByRole('link', { name: 'تسجيل الدخول' })).toBeVisible();
    }
    await page.context().clearCookies();
  });

  for (const target of ['//evil.com', 'https://evil.com', '/\\evil.com', '/\t/evil.com']) {
    test(`ignores ${JSON.stringify(target)} and stays on the site`, async ({ page, baseURL }) => {
      await page.goto(`/login?redirectTo=${encodeURIComponent(target)}`);
      await logIn(page, credentials!.email, credentials!.password);

      await page.waitForURL((url) => /^\/(parent|dashboard)$/.test(url.pathname) || url.origin !== baseURL);
      const url = new URL(page.url());
      expect(url.origin).toBe(baseURL);
      expect(url.pathname).toMatch(/^\/(parent|dashboard)$/);
      await page.waitForURL('**/parent');
    });
  }

  test('follows a safe path on the site', async ({ page }) => {
    await page.goto('/login?redirectTo=/parent/requests');
    await logIn(page, credentials!.email, credentials!.password);
    await page.waitForURL('**/parent/requests');
  });
});
