import { test, expect } from '@playwright/test';

// These checks never submit a valid form, so no account is created.
test.describe('register form validation', () => {
  test.beforeEach(async ({ page }) => {
    await page.route('**/auth/v1/signup**', () => {
      throw new Error('the register form sent a sign-up request');
    });
    await page.goto('/register');
  });

  test('shows Arabic messages under empty fields', async ({ page }) => {
    await page.getByRole('button', { name: 'إنشاء حساب' }).click();

    await expect(page.getByText('اكتب الاسم الأول')).toBeVisible();
    await expect(page.getByText('اكتب البريد الإلكتروني')).toBeVisible();
    await expect(page.getByText('اكتب كلمة المرور')).toBeVisible();
  });

  test('explains an email typed with the Arabic keyboard', async ({ page }) => {
    await page.getByLabel('البريد الإلكتروني').fill('سشينشكينك');
    await page.getByRole('button', { name: 'إنشاء حساب' }).click();

    await expect(page.getByText(/حوّل لوحة المفاتيح إلى الإنجليزية/)).toBeVisible();
    await expect(page.getByLabel('البريد الإلكتروني')).toHaveAttribute('dir', 'ltr');
  });
});
