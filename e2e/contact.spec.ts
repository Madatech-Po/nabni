import { test, expect, type Page } from '@playwright/test';
import { account, authFile } from './support/accounts';
import { E2E_MARK, clientAs, e2eText } from './support/data';

// The contact page (NAB-124) and its admin inbox. Every sent message notifies EVERY active admin,
// real ones included, so the suite sends exactly one message per run and the e2e admin marks it
// handled. Contact messages can't be deleted; "handled" is their clean-up state.

const submitButton = (page: Page) => page.getByRole('button', { name: 'إرسال', exact: true });

test.describe('contact form validation', () => {
  test.beforeEach(async ({ page }) => {
    await page.route('**/rest/v1/rpc/submit_contact_message**', () => {
      throw new Error('the contact form sent an invalid message');
    });
    await page.goto('/contact');
  });

  test('explains every missing field in Arabic', async ({ page }) => {
    await submitButton(page).click();

    await expect(page.getByText('اكتب اسمك (حتى 100 حرف)')).toBeVisible();
    // Shown under both the email and the phone field.
    await expect(page.getByText('اكتب البريد الإلكتروني أو رقم الموبايل لنتمكن من الرد عليك')).toHaveCount(2);
    await expect(page.getByText('اكتب رسالتك من 10 إلى 2000 حرف (0/2000)')).toBeVisible();
  });

  test('needs an email or a phone number, and a message of 10 letters or more', async ({ page }) => {
    await page.getByLabel('الاسم').fill(`${E2E_MARK} زائر`);
    await page.getByLabel('الرسالة').fill('قصيرة');
    await submitButton(page).click();

    await expect(page.getByText('اكتب اسمك (حتى 100 حرف)')).toHaveCount(0);
    await expect(page.getByText('اكتب البريد الإلكتروني أو رقم الموبايل لنتمكن من الرد عليك')).toHaveCount(2);
    await expect(page.getByText('اكتب رسالتك من 10 إلى 2000 حرف (5/2000)')).toBeVisible();

    await page.getByLabel('البريد الإلكتروني').fill('not-an-email');
    await submitButton(page).click();
    await expect(page.getByText('البريد الإلكتروني غير صحيح')).toBeVisible();
  });
});

/** Marks the e2e admin's view of `[E2E]` contact messages handled: one prefix, or leftovers. */
async function markE2eMessagesHandled({ prefix, olderThanMinutes }: { prefix: string; olderThanMinutes?: number }) {
  if (!prefix.startsWith(E2E_MARK)) throw new Error(`cleanup prefix must start with ${E2E_MARK}`);
  const { supabase } = await clientAs('admin');
  try {
    let query = supabase.from('contact_messages').select('id').is('handled_at', null).like('name', `${prefix}%`);
    if (olderThanMinutes) query = query.lt('created_at', new Date(Date.now() - olderThanMinutes * 60_000).toISOString());
    const { data, error } = await query;
    if (error) throw new Error(`contact cleanup failed: ${error.message}`);
    for (const { id } of data ?? []) {
      const { error: markError } = await supabase.rpc('mark_contact_message_handled', { p_id: id });
      if (markError) throw new Error(`contact cleanup could not mark ${id} handled: ${markError.message}`);
    }
  } finally {
    await supabase.auth.signOut({ scope: 'local' });
  }
}

test.describe('sending a message and handling it', () => {
  test.skip(!account('admin'), 'needs the e2e admin to clean the message up');
  test.describe.configure({ mode: 'serial' });

  let marker = '';
  test.beforeAll(() => markE2eMessagesHandled({ prefix: E2E_MARK, olderThanMinutes: 30 }));
  test.afterEach(async () => { if (marker) await markE2eMessagesHandled({ prefix: marker }); });

  test('a visitor sends a message and the e2e admin marks it handled', async ({ page, browser }) => {
    test.slow(); // two roles and several pages the dev server may still have to compile
    marker = e2eText('زائر');
    const email = `e2e-contact-${Date.now()}@example.invalid`;

    await page.goto('/contact');
    await page.getByLabel('الاسم').fill(marker);
    await page.getByLabel('البريد الإلكتروني').fill(email);
    await page.getByLabel('الموضوع (اختياري)').fill(`${E2E_MARK} اختبار آلي`);
    await page.getByLabel('الرسالة').fill('رسالة أرسلها اختبار آلي لتجربة صفحة تواصل معنا، تجاهلها.');
    const sent = page.waitForResponse((r) => r.url().includes('/rpc/submit_contact_message'));
    await submitButton(page).click();
    expect((await sent).ok()).toBe(true);
    await expect(page.getByText('وصلتنا رسالتك، هنرد عليك قريباً')).toBeVisible();

    // The e2e admin finds it in the inbox, still new, and marks it handled.
    const adminContext = await browser.newContext({ storageState: authFile('admin') });
    try {
      const admin = await adminContext.newPage();
      await admin.goto('/admin/messages');
      await expect(admin.locator('h1')).toHaveText('الرسائل');
      const message = admin.getByRole('article', { name: `رسالة من ${marker}` });
      await expect(message).toHaveCount(1);
      await expect(message.getByText('جديدة', { exact: true })).toBeVisible();
      await expect(message.getByRole('link', { name: email })).toHaveAttribute('href', `mailto:${email}`);

      const button = message.getByRole('button', { name: 'تم التعامل' });
      const handled = admin.waitForResponse((r) => r.url().includes('/rpc/mark_contact_message_handled'));
      // Retried: a click that lands before hydration does nothing.
      await expect(async () => {
        if (await button.count()) await button.click({ timeout: 2_000 });
        await expect(button).toHaveCount(0, { timeout: 5_000 });
      }).toPass();
      expect((await handled).ok()).toBe(true);

      await expect(message.getByText('تم التعامل', { exact: true })).toBeVisible();
      await expect(message.getByText(/^تم التعامل في /)).toBeVisible();
    } finally {
      await adminContext.close();
    }
  });
});
