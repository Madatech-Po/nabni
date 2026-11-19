import { test, expect } from '@playwright/test';

// When the auth request never reaches Supabase (offline, blocked), the login and register
// forms explain it in Arabic and stay usable (NAB-136). Every request is aborted, so nothing
// is signed in or created.

const NETWORK_ERROR = 'تعذّر الاتصال بالخادم — تحقّق من اتصالك بالإنترنت ثم حاول مرة أخرى';
const fakeEmail = () => `e2e-nobody-${Date.now()}@example.invalid`;

test('login recovers when the connection fails', async ({ page }) => {
  await page.route('**/auth/v1/token**', (route) => route.abort());
  await page.goto('/login');

  await page.getByLabel('البريد الإلكتروني').fill(fakeEmail());
  await page.getByLabel('كلمة المرور').fill('not-a-real-password');
  await page.getByRole('button', { name: 'دخول' }).click();

  // Not getByRole('alert'): Next's route announcer is an alert too.
  await expect(page.locator('.MuiAlert-message')).toHaveText(NETWORK_ERROR);
  await expect(page.getByRole('button', { name: 'دخول' })).toBeEnabled();
  await expect(page.getByLabel('البريد الإلكتروني')).toBeEnabled();
  await expect(page).toHaveURL(/\/login$/);
});

test('sign-up recovers when the connection fails', async ({ page }) => {
  await page.route('**/auth/v1/signup**', (route) => route.abort());
  await page.goto('/register');

  await page.getByLabel('الاسم الأول').fill('اختبار');
  await page.getByLabel('الاسم الأخير').fill('شبكة');
  await page.getByLabel('البريد الإلكتروني').fill(fakeEmail());
  await page.getByLabel('كلمة المرور').fill('not-a-real-password');
  await page.getByRole('button', { name: 'إنشاء حساب' }).click();

  await expect(page.locator('.MuiAlert-message')).toHaveText(NETWORK_ERROR);
  await expect(page.getByRole('button', { name: 'إنشاء حساب' })).toBeEnabled();
  await expect(page).toHaveURL(/\/register$/);
});
