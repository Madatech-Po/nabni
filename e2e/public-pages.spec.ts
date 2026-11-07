import { test, expect, type Page } from '@playwright/test';

// Public pages, visited logged out (NAB-71).
const pages: { path: string; heading: string | null }[] = [
  { path: '/', heading: null }, // the home hero has no fixed wording, any h1 will do
  { path: '/educators', heading: 'تصفح المعلمين' },
  { path: '/requests', heading: 'طلبات أولياء الأمور' },
  { path: '/about', heading: 'عن منصة نبني' },
  { path: '/faq', heading: 'الأسئلة الشائعة' },
  { path: '/contact', heading: 'تواصل معنا' },
  { path: '/login', heading: 'تسجيل الدخول' },
  { path: '/register', heading: 'إنشاء حساب جديد' },
];

// Egyptian mobile numbers, with or without the +20 / 20 prefix.
const PHONE_RE = /(?:\+?20)?01[0125]\d{8}/;

function collectErrors(page: Page): string[] {
  const errors: string[] = [];
  page.on('pageerror', (error) => errors.push(`pageerror: ${error.message}`));
  page.on('console', (message) => {
    if (message.type() === 'error') errors.push(`console: ${message.text()}`);
  });
  return errors;
}

for (const { path, heading } of pages) {
  test(`${path} renders in Arabic, right to left, without errors`, async ({ page }) => {
    const errors = collectErrors(page);

    await page.goto(path);

    const html = page.locator('html');
    await expect(html).toHaveAttribute('lang', 'ar');
    await expect(html).toHaveAttribute('dir', 'rtl');
    const h1 = page.locator('h1').first();
    await expect(h1).toBeVisible();
    if (heading) await expect(h1).toHaveText(heading);

    await page.waitForLoadState('load'); // not networkidle: Next keeps prefetching links
    expect(errors).toEqual([]);
  });
}

test.describe('no contact details on public pages', () => {
  for (const path of ['/', '/educators', '/requests']) {
    test(`${path} shows no phone numbers or WhatsApp / call links`, async ({ page }) => {
      await page.goto(path);
      await page.waitForLoadState('load'); // not networkidle: Next keeps prefetching links

      const text = await page.locator('body').innerText();
      expect(text).not.toMatch(PHONE_RE);
      await expect(page.locator('a[href*="wa.me"], a[href*="whatsapp"], a[href^="tel:"]')).toHaveCount(0);
    });
  }
});

test.describe('educators filters', () => {
  test('filtering by governorate updates the URL and can be cleared', async ({ page }) => {
    await page.goto('/educators');

    await page.getByRole('combobox', { name: 'المحافظة' }).click();
    const options = page.getByRole('option');
    await expect(options.nth(1)).toBeVisible(); // lookups loaded; option 0 is "all"
    await options.nth(1).click();

    await expect(page).toHaveURL(/[?&]governorate=\d+/);
    await expect(page.locator('h1')).toHaveText('تصفح المعلمين');

    await page.getByRole('button', { name: 'مسح الفلاتر' }).click();
    await expect(page).toHaveURL(/\/educators$/);
  });

  test('filtering by service updates the URL', async ({ page }) => {
    await page.goto('/educators');

    await page.getByRole('combobox', { name: 'الخدمة' }).click();
    const options = page.getByRole('option');
    await expect(options.nth(1)).toBeVisible();
    await options.nth(1).click();

    await expect(page).toHaveURL(/[?&]subject=\d+/);
  });
});
