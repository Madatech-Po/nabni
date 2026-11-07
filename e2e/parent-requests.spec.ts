import { test, expect, type Page } from '@playwright/test';
import { asRole } from './support/accounts';
import { deleteE2eRequests, e2eText } from './support/data';

// The e2e parent posts, edits, closes, reopens and cancels a request (NAB-72).
test.describe('parent request flow', () => {
  asRole(test, 'parent');
  test.describe.configure({ mode: 'serial' });

  test.beforeAll(deleteE2eRequests); // leftovers from an interrupted run
  test.afterEach(deleteE2eRequests);

  /** Picks the first real option of an MUI select. */
  async function pickFirst(page: Page, label: RegExp) {
    await page.getByRole('combobox', { name: label }).click();
    const listbox = page.getByRole('listbox');
    await listbox.getByRole('option').filter({ hasNotText: /^(غير محدد|لا يوجد تفضيل|اختر الوحدة)$/ }).first().click();
    await expect(listbox).toBeHidden();
  }

  function card(page: Page, text: string) {
    return page.locator('.MuiCard-root', { hasText: text });
  }

  test('post, see, edit, close, reopen and cancel a request', async ({ page }) => {
    const marker = e2eText('طلب اختبار');
    const description = `${marker} — نحتاج متابعة أسبوعية لطفل في المرحلة الابتدائية بعد المدرسة.`;

    // Post
    await page.goto('/parent/requests/new');
    await pickFirst(page, /^الخدمة المطلوبة/);
    await page.getByLabel(/^عمر الطفل/).fill('8');
    await pickFirst(page, /^مكان التدريس/);
    await pickFirst(page, /^المحافظة/);
    await page.getByLabel(/^وصف الطلب/).fill(description);
    await page.getByRole('button', { name: 'نشر الطلب' }).click();

    await expect(page).toHaveURL(/\/parent\/requests$/);
    const myCard = card(page, marker);
    await expect(myCard).toBeVisible();
    await expect(myCard.getByText('مفتوح — يظهر للمتخصصين')).toBeVisible();

    // Shown on the dashboard and, while open, in the public feed
    await page.goto('/parent');
    await expect(page.getByText(marker)).toBeVisible();
    await page.goto('/requests');
    await expect(page.getByText(marker)).toBeVisible();

    // Edit
    await page.goto('/parent/requests');
    await myCard.getByRole('link', { name: 'تعديل' }).click();
    await expect(page).toHaveURL(/\/parent\/requests\/[0-9a-f-]+\/edit$/);
    const edited = `${marker} — معدّل: المتابعة مرتين في الأسبوع بدلاً من مرة واحدة فقط.`;
    await page.getByLabel(/^وصف الطلب/).fill(edited);
    await page.getByRole('button', { name: 'حفظ التعديلات' }).click();
    await expect(page).toHaveURL(/\/parent\/requests$/);
    await expect(card(page, marker).getByText(edited)).toBeVisible();

    // Close, reopen, cancel
    await myCard.getByRole('button', { name: 'إغلاق الطلب' }).click();
    await expect(myCard.getByText('مغلق', { exact: true })).toBeVisible();

    await myCard.getByRole('button', { name: 'إعادة فتح' }).click();
    await expect(myCard.getByText('مفتوح — يظهر للمتخصصين')).toBeVisible();

    await myCard.getByRole('button', { name: 'إلغاء الطلب' }).click();
    await expect(myCard.getByText('ملغي', { exact: true })).toBeVisible();

    // A cancelled request leaves the public feed
    await page.goto('/requests');
    await expect(page.getByText(marker)).toHaveCount(0);
  });
});
