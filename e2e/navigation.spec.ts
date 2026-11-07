import { test, expect, type Page } from '@playwright/test';
import { account, asRole, roleHome, type Role } from './support/accounts';

// A signed-in user can always get home, back to their dashboard, and sign out (NAB-93).

for (const [role, pages] of [
  ['parent', ['/parent', '/parent/requests', '/parent/requests/new', '/parent/profile']],
  ['educator', ['/teacher', '/teacher/offers', '/teacher/profile']],
] as [Role, string[]][]) {
  test.describe(`${role} navigation`, () => {
    asRole(test, role);

    for (const path of pages) {
      test(`${path} has the site header with home and dashboard links`, async ({ page }) => {
        await page.goto(path);
        const header = page.getByRole('banner');
        await expect(header.getByRole('link', { name: 'Nabni' })).toHaveAttribute('href', '/');
        await expect(header.getByRole('link', { name: 'الرئيسية' })).toBeVisible();
        await expect(header.getByRole('link', { name: 'لوحتي' })).toBeVisible();
        await expect(header.getByRole('button', { name: 'تسجيل الخروج' })).toBeVisible();
        await expect(header.getByRole('link', { name: 'تسجيل الدخول' })).toHaveCount(0);
        await expect(header.getByRole('link', { name: 'انضم كمتخصص' })).toHaveCount(0); // NAB-100
      });
    }

    test('goes home from the dashboard and back again', async ({ page }) => {
      await page.goto(pages[pages.length - 1]);
      await page.getByRole('banner').getByRole('link', { name: 'الرئيسية' }).click();
      await expect(page).toHaveURL(/\/$/);
      await page.getByRole('banner').getByRole('link', { name: 'لوحتي' }).click();
      await expect(page).toHaveURL(new RegExp(`${roleHome[role]}$`));
    });
  });
}

test('visitors see "join as educator" in the header (NAB-100)', async ({ page }) => {
  await page.goto('/');
  await expect(page.getByRole('banner').getByRole('link', { name: 'انضم كمتخصص' })).toHaveAttribute('href', '/register?role=educator');
});

test.describe('phone menu (NAB-99)', () => {
  test.use({ viewport: { width: 375, height: 812 } });

  /** Opens the phone menu, retrying in case the click lands before the page hydrates. */
  async function openMenu(page: Page) {
    const menu = page.getByRole('navigation', { name: 'قائمة الموقع' });
    await expect(async () => {
      await page.getByRole('banner').getByRole('button', { name: 'القائمة' }).click();
      await expect(menu).toBeVisible({ timeout: 1_000 });
    }).toPass();
    return menu;
  }

  test('a visitor opens the menu and reaches the educators page', async ({ page }) => {
    await page.goto('/');
    const header = page.getByRole('banner');
    await expect(header.getByRole('navigation', { name: 'القائمة الرئيسية' })).toBeHidden();
    const menu = await openMenu(page);
    await expect(menu.getByRole('link', { name: 'تسجيل الدخول' })).toBeVisible();
    await menu.getByRole('link', { name: 'ابحث عن متخصص' }).click();
    await expect(page).toHaveURL(/\/educators$/);
    await expect(menu).toBeHidden();
  });

  test.describe('signed in', () => {
    asRole(test, 'parent');

    test('a parent gets back to the dashboard from the menu', async ({ page }) => {
      await page.goto('/parent/requests/new');
      const menu = await openMenu(page);
      await expect(menu.getByRole('link', { name: 'انضم كمتخصص' })).toHaveCount(0);
      await menu.getByRole('link', { name: 'لوحتي' }).click();
      await expect(page).toHaveURL(/\/parent$/);
    });
  });
});

test.describe('sign out', () => {
  test.skip(!account('parent'), 'needs the e2e parent account');

  // Logs in fresh rather than reusing the saved session, so other specs keep theirs.
  test('a parent signs out from the header and lands home, signed out', async ({ page }) => {
    const credentials = account('parent')!;
    await page.goto('/login');
    await page.getByLabel('البريد الإلكتروني').fill(credentials.email);
    await page.getByLabel('كلمة المرور').fill(credentials.password);
    await page.getByRole('button', { name: 'دخول' }).click();
    await page.waitForURL(`**${roleHome.parent}`);

    await page.getByRole('banner').getByRole('button', { name: 'تسجيل الخروج' }).click();
    await expect(page).toHaveURL(/\/$/);
    await expect(page.getByRole('banner').getByRole('link', { name: 'تسجيل الدخول' })).toBeVisible();

    await page.goto('/parent');
    await expect(page).toHaveURL(/\/login\?redirectTo=%2Fparent|\/login\?redirectTo=\/parent/);
  });
});
