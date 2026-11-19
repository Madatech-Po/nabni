import { test, expect } from '@playwright/test';

// Forgot / reset password and the email-link landing page (NAB-122), all logged out.
// Only made-up @example.invalid addresses are used, so no real reset email is ever sent.

const RESET_SENT = /إذا كان البريد مسجلاً لدينا فستصلك رسالة لإعادة تعيين كلمة المرور/;
const LINK_ERROR = 'الرابط غير صالح أو انتهت صلاحيته، اطلب رابطاً جديداً';

test('the login page links to "forgot password"', async ({ page }) => {
  await page.goto('/login');
  await page.getByRole('link', { name: 'نسيت كلمة المرور؟' }).click();
  await expect(page).toHaveURL(/\/forgot-password$/);
  await expect(page.getByRole('button', { name: 'أرسل رابط إعادة التعيين' })).toBeVisible();
});

test.describe('forgot password form', () => {
  test('explains an empty or malformed email in Arabic and sends nothing', async ({ page }) => {
    await page.route('**/auth/v1/recover**', () => {
      throw new Error('the form sent a reset request for an invalid email');
    });
    await page.goto('/forgot-password');
    const submit = page.getByRole('button', { name: 'أرسل رابط إعادة التعيين' });

    await submit.click();
    await expect(page.getByText('اكتب البريد الإلكتروني')).toBeVisible();

    await page.getByLabel('البريد الإلكتروني').fill('not-an-email');
    await submit.click();
    await expect(page.getByText('البريد الإلكتروني غير صحيح، مثال: name@example.com')).toBeVisible();
  });

  test('answers a valid email with the same generic message', async ({ page }) => {
    const email = `e2e-nobody-${Date.now()}@example.invalid`;
    await page.goto('/forgot-password');
    await page.getByLabel('البريد الإلكتروني').fill(email);

    const recover = page.waitForRequest((r) => r.url().includes('/auth/v1/recover') && r.method() === 'POST');
    await page.getByRole('button', { name: 'أرسل رابط إعادة التعيين' }).click();
    expect((await recover).postDataJSON()).toMatchObject({ email });

    await expect(page.getByText(RESET_SENT)).toBeVisible();
    await expect(page.getByRole('link', { name: 'العودة لتسجيل الدخول' })).toHaveAttribute('href', '/login');
  });
});

test('/reset-password without a session asks to open the email link', async ({ page }) => {
  await page.goto('/reset-password');
  await expect(page.getByText(/افتح الرابط من رسالة البريد/)).toBeVisible();
  await expect(page.getByRole('link', { name: 'اطلب رابطاً جديداً' })).toHaveAttribute('href', '/forgot-password');
  await expect(page.getByLabel('كلمة المرور الجديدة')).toHaveCount(0);
});

test.describe('/auth/confirm with a broken link', () => {
  for (const query of ['', '?type=recovery', '?token_hash=not-a-real-token&type=recovery', '?code=not-a-real-code', '?token_hash=x&type=bogus']) {
    test(`"${query || '(no params)'}" goes to the login page with a link error`, async ({ page }) => {
      await page.goto(`/auth/confirm${query}`);
      await expect(page).toHaveURL(/\/login\?error=link$/);
      await expect(page.getByText(LINK_ERROR)).toBeVisible();
    });
  }
});
