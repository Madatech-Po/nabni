import { test, expect, type Browser, type Page } from '@playwright/test';
import { account, authFile, type Role } from '../support/accounts';
import { clientAs } from '../support/data';

// NAB-97: an educator sees the admin's reason for a suspension, and it disappears once they are
// reactivated. It suspends the shared e2e educator, so it lives in the "isolated" project, which
// runs only after every other spec has finished (playwright.config.ts).
const EDUCATOR_PHONE = '01000000002';
const REASON = 'اختبار آلي: صورة الملف غير واضحة';

test.describe('verification reason (NAB-97)', () => {
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

  test('admin suspends with a reason; the educator sees it until reactivated', async ({ browser }) => {
    test.slow();
    const admin = await pageAs(browser, 'admin');
    const educator = await pageAs(browser, 'educator');

    // Admin suspends the e2e educator with a reason
    await admin.goto(`/admin/educators?status=verified&q=${EDUCATOR_PHONE}`);
    const card = admin.locator('.MuiCard-root', { hasText: '[E2E]' });
    await card.getByRole('button', { name: 'إيقاف' }).click();
    const dialog = admin.getByRole('dialog');
    await dialog.getByLabel(/^السبب/).fill(REASON);
    await dialog.getByRole('button', { name: 'تأكيد' }).click();
    await expect(dialog).toBeHidden();

    // The educator sees the reason on the dashboard and the profile page
    await educator.goto('/teacher');
    await expect(educator.getByText('تم إيقاف حسابك')).toBeVisible();
    await expect(educator.getByText('سبب القرار:')).toBeVisible();
    await expect(educator.getByText(REASON)).toBeVisible();
    await educator.goto('/teacher/profile');
    await expect(educator.getByText(REASON)).toBeVisible();

    // Admin reactivates; the reason is gone
    // (actions without a reason apply at once, with no dialog)
    await admin.goto(`/admin/educators?status=suspended&q=${EDUCATOR_PHONE}`);
    const suspendedCard = admin.locator('.MuiCard-root', { hasText: '[E2E]' });
    await suspendedCard.getByRole('button', { name: 'إعادة التفعيل' }).click();
    await expect(suspendedCard).toHaveCount(0);

    await educator.goto('/teacher');
    await expect(educator.getByText('حالة الملف: موثق')).toBeVisible();
    await expect(educator.getByText(REASON)).toHaveCount(0);

    await Promise.all([admin.context().close(), educator.context().close()]);
  });
});
