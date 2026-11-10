import { test, expect, type Page } from '@playwright/test';
import { asRole, roleHome, roles } from './support/accounts';

// The notifications bell and pages (NAB-107). Read-only: nothing here changes shared state.
// The flow that creates notifications lives in isolated/notifications.spec.ts.

const bell = (page: Page) => page.getByRole('banner').getByRole('button', { name: 'الإشعارات' });

/** Opens the bell's popover, retrying in case the click lands before the page hydrates. */
async function openBell(page: Page) {
  const popover = page.getByRole('dialog', { name: 'آخر الإشعارات' });
  await expect(async () => {
    await bell(page).click();
    await expect(popover).toBeVisible({ timeout: 1_000 });
  }).toPass();
  return popover;
}

test.describe('visitors', () => {
  test('have no bell', async ({ page }) => {
    await page.goto('/');
    await expect(page.getByRole('banner').getByRole('link', { name: 'تسجيل الدخول' })).toBeVisible();
    await expect(bell(page)).toHaveCount(0);
  });

  test('/notifications sends them to the login page', async ({ page }) => {
    await page.goto('/notifications');
    await expect(page.locator('h1')).toHaveText('تسجيل الدخول');
    const url = new URL(page.url());
    expect(url.pathname).toBe('/login');
    expect(url.searchParams.get('redirectTo')).toBe('/notifications');
  });
});

for (const role of roles) {
  const listPage = role === 'admin' ? '/admin/notifications' : '/notifications';

  test.describe(`${role} bell`, () => {
    asRole(test, role);

    test(`shows the bell on ${roleHome[role]} and opens the latest notifications`, async ({ page }) => {
      await page.goto(roleHome[role]);
      await expect(bell(page)).toBeVisible();
      const popover = await openBell(page);
      await expect(popover.getByRole('button', { name: 'تعليم الكل كمقروء' })).toBeVisible();
      // At most five items (the list's buttons, minus "mark all read")
      expect(await popover.getByRole('list').getByRole('button').count()).toBeLessThanOrEqual(5);
      await expect(popover.getByRole('link', { name: 'عرض الكل' })).toHaveAttribute('href', listPage);
    });

    test(`"view all" opens ${listPage}`, async ({ page }) => {
      await page.goto(roleHome[role]);
      const popover = await openBell(page);
      await popover.getByRole('link', { name: 'عرض الكل' }).click();
      await expect(page).toHaveURL(new RegExp(`${listPage}$`));
      await expect(page.getByRole('heading', { level: 1, name: 'الإشعارات' })).toBeVisible();
      await expect(popover).toBeHidden();
    });

    test(`${listPage} lists the notifications or says there are none`, async ({ page }) => {
      await page.goto(listPage);
      await expect(page.getByRole('heading', { level: 1, name: 'الإشعارات' })).toBeVisible();
      // A list comes with its "mark all read" button (the bell's popover is closed here)
      const markAll = page.getByRole('button', { name: 'تعليم الكل كمقروء' });
      await expect(markAll.or(page.getByText('لا توجد إشعارات'))).toBeVisible();
    });
  });
}

test.describe('phone bell', () => {
  asRole(test, 'parent');
  test.use({ viewport: { width: 375, height: 812 } });

  test('the bell stays in the header next to the menu button', async ({ page }) => {
    await page.goto('/parent');
    await expect(page.getByRole('banner').getByRole('button', { name: 'القائمة' })).toBeVisible();
    await expect(bell(page)).toBeVisible();
    const popover = await openBell(page);
    // The popover fits the phone screen
    const box = await popover.boundingBox();
    expect(box).not.toBeNull();
    expect(box!.x).toBeGreaterThanOrEqual(0);
    expect(box!.x + box!.width).toBeLessThanOrEqual(375);
  });
});
