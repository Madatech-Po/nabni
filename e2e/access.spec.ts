import { test, expect } from '@playwright/test';
import { asRole } from './support/accounts';
import { createE2eRequest, deleteE2eRequests, e2eText, sweepStaleE2eRequests, tokenOf } from './support/data';

// Who may open which dashboard, and the admin pages (NAB-73).

test.describe('logged out', () => {
  for (const area of ['/parent', '/teacher', '/admin']) {
    test(`${area} sends visitors to the login page`, async ({ page }) => {
      await page.goto(area);
      await expect(page.locator('h1')).toHaveText('تسجيل الدخول');
      const url = new URL(page.url());
      expect(url.pathname).toBe('/login');
      expect(url.searchParams.get('redirectTo')).toBe(area);
    });
  }
});

test.describe('parent', () => {
  asRole(test, 'parent');

  for (const area of ['/admin', '/teacher']) {
    test(`cannot open ${area}`, async ({ page }) => {
      await page.goto(area);
      await expect(page).toHaveURL(/\/parent$/);
    });
  }
});

test.describe('educator', () => {
  asRole(test, 'educator');

  for (const area of ['/parent', '/admin']) {
    test(`cannot open ${area}`, async ({ page }) => {
      await page.goto(area);
      await expect(page).toHaveURL(/\/teacher$/);
    });
  }
});

test.describe('admin pages', () => {
  asRole(test, 'admin');

  const adminPages = [
    { path: '/admin/educators', heading: 'توثيق المعلمين' },
    { path: '/admin/parents', heading: 'أولياء الأمور' },
    { path: '/admin/requests', heading: 'الطلبات' },
    { path: '/admin/logs', heading: 'سجل الإجراءات' },
  ];

  for (const { path, heading } of adminPages) {
    test(`${path} loads`, async ({ page }) => {
      const errors: string[] = [];
      page.on('pageerror', (error) => errors.push(error.message));

      await page.goto(path);
      await expect(page.locator('h1')).toHaveText(heading);
      expect(errors).toEqual([]);
    });
  }
});

// Moderation acts only on a request the e2e parent posted for this test.
test.describe('admin moderation', () => {
  asRole(test, 'admin');
  test.describe.configure({ mode: 'serial' });
  test.skip(!process.env.E2E_PARENT_EMAIL, 'needs the e2e parent to own the request');

  let marker = '';
  test.beforeAll(sweepStaleE2eRequests);
  test.afterEach(async () => { if (marker) await deleteE2eRequests({ prefix: marker }); });

  test('hides and un-hides the e2e parent\'s request, and logs both', async ({ page }) => {
    marker = e2eText('طلب للإشراف');
    await createE2eRequest(`${marker} — طلب أنشأه اختبار آلي لتجربة الإخفاء من لوحة الإدارة.`);

    // The admin search drops punctuation such as [ ], so search by the run token.
    await page.goto(`/admin/requests?q=${tokenOf(marker)}`);
    const row = page.locator('.MuiPaper-outlined', { hasText: marker });
    await expect(row).toHaveCount(1);
    await expect(row.getByText('مفتوح', { exact: true })).toBeVisible();

    // Hiding needs a reason
    await row.getByRole('button', { name: 'إخفاء' }).click();
    const dialog = page.getByRole('dialog');
    await expect(dialog.getByRole('button', { name: 'تأكيد' })).toBeDisabled();
    await dialog.getByLabel(/^السبب/).fill('اختبار آلي');
    await dialog.getByRole('button', { name: 'تأكيد' }).click();
    await expect(dialog).toBeHidden();
    await expect(row.getByText('مخفي بواسطة الإدارة')).toBeVisible();

    // A hidden request is gone from the public feed
    const feed = await page.context().newPage();
    await feed.goto('/requests');
    await expect(feed.getByText(marker)).toHaveCount(0);
    await feed.close();

    await row.getByRole('button', { name: 'إلغاء الإخفاء' }).click();
    await expect(row.getByText('مغلق', { exact: true })).toBeVisible();

    // One log entry for hiding and one for un-hiding.
    await page.goto('/admin/logs');
    const entries = page.getByRole('row').filter({ hasText: tokenOf(marker) });
    await expect(entries.filter({ hasText: 'مفتوح ← مخفي بواسطة الإدارة' })).toHaveCount(1);
    await expect(entries.filter({ hasText: 'مخفي بواسطة الإدارة ← مغلق' })).toHaveCount(1);
  });
});
