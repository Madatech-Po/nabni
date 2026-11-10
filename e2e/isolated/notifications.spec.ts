import { test, expect, type Browser, type Page } from '@playwright/test';
import { account, authFile, type Role } from '../support/accounts';
import { clientAs, e2eText } from '../support/data';

// NAB-96 / NAB-107: an educator is notified when an admin suspends and reactivates them, and
// handles it through the bell and /notifications. It suspends the shared e2e educator, so it
// lives in the "isolated" project, which runs only after every other spec has finished.
// Notifications can't be deleted and other runs keep adding some, so nothing here relies on
// counts: the test finds its own by a unique reason and starts by marking everything read.
const EDUCATOR_PHONE = '01000000002';
const SUSPENDED = 'تم إيقاف حسابك';
const REACTIVATED = 'تمت إعادة تفعيل حسابك';

test.describe('educator notifications (NAB-96, NAB-107)', () => {
  test.describe.configure({ mode: 'serial' });
  test.skip(!account('educator') || !account('admin'), 'needs the e2e educator and admin accounts');

  /** Puts the e2e educator back to verified whatever happened in the test. */
  test.afterAll(async () => {
    const { supabase: educatorDb } = await clientAs('educator');
    let me: { id: string; verification_status: string | null };
    try {
      const { data, error } = await educatorDb.from('educators').select('id, verification_status').single();
      if (error || !data) throw new Error(`could not read the e2e educator: ${error?.message ?? 'no row'}`);
      me = data;
    } finally {
      await educatorDb.auth.signOut({ scope: 'local' });
    }
    if (me.verification_status === 'verified') return;

    const { supabase: adminDb } = await clientAs('admin');
    try {
      const { error } = await adminDb.rpc('set_educator_verification', { p_educator_id: me.id, p_status: 'verified' });
      if (error) throw new Error(`could not re-verify the e2e educator: ${error.message}`);
    } finally {
      await adminDb.auth.signOut({ scope: 'local' });
    }
  });

  async function pageAs(browser: Browser, role: Role): Promise<Page> {
    const context = await browser.newContext({ storageState: authFile(role) });
    return context.newPage();
  }

  const bell = (page: Page) => page.getByRole('banner').getByRole('button', { name: 'الإشعارات' });
  const badge = (page: Page) => bell(page).locator('.MuiBadge-badge');

  /** Opens the bell's popover, retrying in case the click lands before the page hydrates. */
  async function openBell(page: Page) {
    const popover = page.getByRole('dialog', { name: 'آخر الإشعارات' });
    await expect(async () => {
      await bell(page).click();
      await expect(popover).toBeVisible({ timeout: 1_000 });
    }).toPass();
    return popover;
  }

  /** Marks everything read on /notifications and waits until the page shows it. */
  async function markAllRead(page: Page) {
    await page.goto('/notifications');
    const markAll = page.getByRole('main').getByRole('button', { name: 'تعليم الكل كمقروء' });
    await expect(markAll).toBeVisible();
    if (await markAll.isEnabled()) {
      await expect(async () => {
        await markAll.click({ timeout: 1_000 });
        await expect(markAll).toBeDisabled({ timeout: 2_000 });
      }).toPass();
    }
    await expect(page.locator('[data-unread="true"]')).toHaveCount(0);
    await expect(badge(page)).toHaveClass(/MuiBadge-invisible/);
  }

  test('suspension and reactivation reach the educator through the bell', async ({ browser }) => {
    test.slow();
    const reason = e2eText('اختبار الإشعارات: سبب الإيقاف');
    const admin = await pageAs(browser, 'admin');
    const educator = await pageAs(browser, 'educator');

    // Start from a clean slate: nothing unread
    await markAllRead(educator);

    // Admin suspends the e2e educator with a unique reason
    await admin.goto(`/admin/educators?status=verified&q=${EDUCATOR_PHONE}`);
    const card = admin.locator('.MuiCard-root', { hasText: '[E2E]' });
    await card.getByRole('button', { name: 'إيقاف' }).click();
    const dialog = admin.getByRole('dialog');
    await dialog.getByLabel(/^السبب/).fill(reason);
    await dialog.getByRole('button', { name: 'تأكيد' }).click();
    await expect(dialog).toBeHidden();
    await expect(card).toHaveCount(0); // left the "verified" list: the change is saved

    // The educator's bell shows it, unread, with the exact reason
    await educator.goto('/teacher/profile');
    await expect(badge(educator)).not.toHaveClass(/MuiBadge-invisible/);
    expect(Number(await badge(educator).textContent())).toBeGreaterThanOrEqual(1);
    let popover = await openBell(educator);
    const suspended = popover.getByRole('button').filter({ hasText: reason });
    await expect(suspended).toHaveCount(1);
    await expect(suspended).toContainText(SUSPENDED);
    await expect(suspended).toContainText(`سبب القرار: ${reason}`);
    await expect(suspended).toHaveAttribute('data-unread', 'true');

    // Opening it marks it read and follows its link (/teacher)
    await suspended.click();
    await expect(educator).toHaveURL(/\/teacher$/);
    await expect(popover).toBeHidden();
    popover = await openBell(educator);
    await expect(popover.getByRole('button').filter({ hasText: reason })).not.toHaveAttribute('data-unread');
    await educator.keyboard.press('Escape');
    await expect(popover).toBeHidden();

    // Admin reactivates (no reason, so no dialog)
    await admin.goto(`/admin/educators?status=suspended&q=${EDUCATOR_PHONE}`);
    const suspendedCard = admin.locator('.MuiCard-root', { hasText: '[E2E]' });
    await suspendedCard.getByRole('button', { name: 'إعادة التفعيل' }).click();
    await expect(suspendedCard).toHaveCount(0);

    // The educator sees the reactivation, unread, right above the (read) suspension
    await educator.goto('/teacher');
    await expect(badge(educator)).not.toHaveClass(/MuiBadge-invisible/);
    popover = await openBell(educator);
    const items = popover.getByRole('list').getByRole('button');
    const suspendedAt = await items.evaluateAll((els, r) => els.findIndex((el) => el.textContent?.includes(r)), reason);
    expect(suspendedAt).toBeGreaterThan(0);
    const reactivated = items.nth(suspendedAt - 1);
    await expect(reactivated).toContainText(REACTIVATED);
    await expect(reactivated).toHaveAttribute('data-unread', 'true');

    // "Mark all read" clears the badge
    // (the popover is modal: the header is hidden from the accessibility tree until it closes)
    await popover.getByRole('button', { name: 'تعليم الكل كمقروء' }).click();
    await expect(popover.locator('[data-unread="true"]')).toHaveCount(0);
    await educator.keyboard.press('Escape');
    await expect(popover).toBeHidden();
    await expect(badge(educator)).toHaveClass(/MuiBadge-invisible/);

    // /notifications lists both, none unread (after a fresh load from the server)
    await educator.goto('/notifications');
    const list = educator.getByRole('main').getByRole('listitem');
    const suspendedItem = list.filter({ hasText: reason });
    await expect(suspendedItem).toHaveCount(1);
    await expect(suspendedItem).toContainText(SUSPENDED);
    await expect(list.filter({ hasText: REACTIVATED }).first()).toBeVisible();
    await expect(educator.locator('[data-unread="true"]')).toHaveCount(0);
    await expect(educator.getByRole('main').getByRole('button', { name: 'تعليم الكل كمقروء' })).toBeDisabled();
    await expect(badge(educator)).toHaveClass(/MuiBadge-invisible/);

    await Promise.all([admin.context().close(), educator.context().close()]);
  });
});
