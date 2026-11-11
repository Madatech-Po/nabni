import { test, expect, type Browser, type Locator, type Page } from '@playwright/test';
import { account, authFile, type Role } from './support/accounts';
import { clientAs, createE2eRequest, deleteE2eRequests, e2eText, sweepStaleE2eRequests, tokenOf } from './support/data';

// NAB-110: the e2e parent is notified about offers on their requests and about admin decisions on
// them, and not about their own changes. Only e2e-owned requests and offers are touched.
//
// Notifications can't be deleted, and other specs running in parallel (and CI) keep adding
// notifications to the same parent with the same titles, so nothing here relies on absolute
// counts or on which item is on top. Each scenario starts by marking everything read, then:
//   * exact checks go through the parent's own rows (RLS), scoped to the request's link
//     ("/parent/requests/<id>", which the DOM doesn't expose);
//   * the UI checks that the bell and /notifications show those titles unread, and clicks the
//     one notification that is unique on the page (the hide notification, by its unique reason).
const RECEIVED = 'وصلك عرض جديد على طلبك';
const UPDATED = 'عدّل المتخصص عرضه على طلبك';
const WITHDRAWN = 'سحب المتخصص عرضه';
const REMOVED = 'تم إخفاء طلبك من قِبل الإدارة';
const CLOSED_BY_ADMIN = 'تم إغلاق طلبك من قِبل الإدارة';

type Row = { id: string; type: string; title: string; body: string | null; read_at: string | null };

/** The e2e parent's notifications whose link is this request, oldest first. */
async function notificationsFor(requestId: string): Promise<Row[]> {
  const { supabase } = await clientAs('parent');
  try {
    const { data, error } = await supabase
      .from('notifications')
      .select('id, type, title, body, read_at')
      .eq('link', `/parent/requests/${requestId}`)
      .order('created_at', { ascending: true });
    if (error) throw new Error(`could not read the parent's notifications: ${error.message}`);
    return data ?? [];
  } finally {
    await supabase.auth.signOut({ scope: 'local' });
  }
}

const typesFor = async (requestId: string) => (await notificationsFor(requestId)).map((n) => n.type);

test.describe('parent notifications (NAB-110)', () => {
  test.describe.configure({ mode: 'serial' });
  test.skip(
    !account('parent') || !account('educator') || !account('admin'),
    'needs the e2e parent, educator and admin accounts',
  );

  let marker = '';
  test.beforeAll(sweepStaleE2eRequests);
  test.afterEach(async () => { if (marker) await deleteE2eRequests({ prefix: marker }); });

  async function pageAs(browser: Browser, role: Role): Promise<Page> {
    const context = await browser.newContext({ storageState: authFile(role) });
    return context.newPage();
  }

  const bell = (page: Page) => page.getByRole('banner').getByRole('button', { name: 'الإشعارات' });
  const badge = (page: Page) => bell(page).locator('.MuiBadge-badge');
  const unreadItems = (page: Page) => page.getByRole('main').locator('li[data-unread="true"]');

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
    await expect(markAll.or(page.getByText('لا توجد إشعارات'))).toBeVisible();
    if (await markAll.isVisible() && await markAll.isEnabled()) {
      await expect(async () => {
        await markAll.click({ timeout: 1_000 });
        await expect(markAll).toBeDisabled({ timeout: 2_000 });
      }).toPass();
    }
    await expect(page.locator('[data-unread="true"]')).toHaveCount(0);
  }

  function feedCard(page: Page, text: string) {
    return page.locator('.MuiCard-root', { hasText: text });
  }

  function myOffer(page: Page, text: string) {
    return page.locator('.MuiPaper-outlined', { hasText: text });
  }

  /** Tomorrow as YYYY-MM-DD on the Cairo calendar, which the offer form validates against. */
  function tomorrow(): string {
    return new Intl.DateTimeFormat('en-CA', { timeZone: 'Africa/Cairo' }).format(new Date(Date.now() + 24 * 60 * 60 * 1000));
  }

  async function sendOffer(educator: Page, text: string) {
    await educator.goto('/requests');
    await feedCard(educator, text).getByRole('link', { name: 'قدّم عرضك' }).click();
    await expect(educator).toHaveURL(/\/teacher\/requests\/[0-9a-f-]+\/offer$/);
    await educator.getByLabel(/^السعر بالجنيه/).fill('250');
    await educator.getByRole('combobox', { name: /^لكل/ }).click();
    await educator.getByRole('listbox').getByRole('option').first().click();
    await educator.getByLabel(/^المواعيد المتاحة لك/).fill('الأربعاء من 5 إلى 7 مساءً');
    await educator.getByLabel(/^تاريخ البدء المتوقع/).fill(tomorrow());
    await educator.getByLabel(/^رسالة لولي الأمر/).fill('خبرة في التأسيس للمرحلة الابتدائية.');
    await educator.getByRole('button', { name: 'إرسال العرض' }).click();
    await expect(educator).toHaveURL(/\/teacher\/offers$/);
    await expect(myOffer(educator, text).getByText('بانتظار رد ولي الأمر')).toBeVisible();
  }

  async function editPrice(educator: Page, text: string, price: string) {
    await educator.goto('/teacher/offers');
    await myOffer(educator, text).getByRole('link', { name: 'تعديل العرض' }).click();
    await expect(educator).toHaveURL(/\/teacher\/offers\/[0-9a-f-]+\/edit$/);
    await educator.getByLabel(/^السعر بالجنيه/).fill(price);
    await educator.getByRole('button', { name: 'حفظ التعديلات' }).click();
    await expect(educator).toHaveURL(/\/teacher\/offers$/);
    await expect(myOffer(educator, text).getByText(new RegExp(`${price} ج\\.م`))).toBeVisible();
  }

  /** At least one unread item with this title on /notifications (others may share it). */
  async function expectUnreadOnPage(page: Page, title: string) {
    await expect(unreadItems(page).filter({ hasText: title }).first()).toBeVisible();
  }

  /** Clicks a status button and waits until Supabase has saved the change. */
  async function changeStatus(page: Page, button: Locator) {
    await Promise.all([
      page.waitForResponse((r) => r.request().method() === 'PATCH' && r.url().includes('/rest/v1/requests') && r.ok()),
      button.click(),
    ]);
  }

  test('offers on the request: received, edited (coalesced) and withdrawn', async ({ browser }) => {
    test.slow();
    const parent = await pageAs(browser, 'parent');
    const educator = await pageAs(browser, 'educator');
    await markAllRead(parent);

    marker = e2eText('طلب لإشعارات العروض');
    const requestId = await createE2eRequest(`${marker} — طلب أنشأه اختبار آلي لتجربة إشعارات ولي الأمر بالعروض.`);
    expect(await typesFor(requestId)).toEqual([]);

    // A new offer
    await sendOffer(educator, marker);
    await expect.poll(() => typesFor(requestId)).toEqual(['offer.received']);
    const [received] = await notificationsFor(requestId);
    expect(received.title).toBe(RECEIVED);
    expect(received.read_at).toBeNull();

    await parent.goto('/parent');
    await expect(badge(parent)).not.toHaveClass(/MuiBadge-invisible/);
    const popover = await openBell(parent);
    await expect(popover.locator('[data-unread="true"]').filter({ hasText: RECEIVED }).first()).toBeVisible();
    await parent.keyboard.press('Escape');
    await expect(popover).toBeHidden();

    // Two quick edits while pending: one "edited" notification
    await editPrice(educator, marker, '300');
    await editPrice(educator, marker, '350');
    await expect.poll(() => typesFor(requestId)).toEqual(['offer.received', 'offer.updated']);

    // Withdrawn
    await educator.goto('/teacher/offers');
    const offer = myOffer(educator, marker);
    await offer.getByRole('button', { name: 'سحب العرض' }).click();
    const dialog = educator.getByRole('dialog');
    await dialog.getByRole('button', { name: 'سحب العرض' }).click();
    await expect(dialog).toBeHidden();
    await expect(offer.getByText('سحبت العرض')).toBeVisible();
    await expect.poll(() => typesFor(requestId)).toEqual(['offer.received', 'offer.updated', 'offer.withdrawn']);

    const rows = await notificationsFor(requestId);
    expect(rows.map((n) => n.title)).toEqual([RECEIVED, UPDATED, WITHDRAWN]);
    expect(rows.every((n) => n.read_at === null)).toBe(true);

    // All three show up unread on /notifications
    await parent.goto('/notifications');
    for (const title of [RECEIVED, UPDATED, WITHDRAWN]) await expectUnreadOnPage(parent, title);

    await Promise.all([parent.context().close(), educator.context().close()]);
  });

  test('admin hides and un-hides the request; the notification opens the request', async ({ browser }) => {
    test.slow();
    const parent = await pageAs(browser, 'parent');
    const admin = await pageAs(browser, 'admin');
    await markAllRead(parent);

    marker = e2eText('طلب لإشعارات الإشراف');
    const reason = e2eText('سبب الإخفاء');
    const requestId = await createE2eRequest(`${marker} — طلب أنشأه اختبار آلي لتجربة إشعار الإخفاء من الإدارة.`);

    // Hide with a unique reason (the admin search drops punctuation, so search by the run token)
    await admin.goto(`/admin/requests?q=${tokenOf(marker)}`);
    const row = admin.locator('.MuiPaper-outlined', { hasText: marker });
    await expect(row).toHaveCount(1);
    await row.getByRole('button', { name: 'إخفاء' }).click();
    const dialog = admin.getByRole('dialog');
    await dialog.getByLabel(/^السبب/).fill(reason);
    await dialog.getByRole('button', { name: 'تأكيد' }).click();
    await expect(dialog).toBeHidden();
    await expect(row.getByText('مخفي بواسطة الإدارة')).toBeVisible();

    await expect.poll(() => typesFor(requestId)).toEqual(['request.removed']);
    const [removed] = await notificationsFor(requestId);
    expect(removed.title).toBe(REMOVED);
    expect(removed.body).toBe(`السبب: ${reason}`);

    // The parent sees it, unread, with the reason
    await parent.goto('/notifications');
    const hiddenItem = parent.getByRole('main').getByRole('listitem').filter({ hasText: reason });
    await expect(hiddenItem).toHaveCount(1);
    await expect(hiddenItem).toContainText(REMOVED);
    await expect(hiddenItem).toContainText(`السبب: ${reason}`);
    await expect(hiddenItem).toHaveAttribute('data-unread', 'true');

    // Un-hide. The admin UI un-hides to "closed" (RequestModerationActions), so the parent gets
    // "closed by the admin", not "تمت إعادة نشر طلبك", which the database sends only for
    // removed -> open. Reported on NAB-110; update this when un-hiding reopens the request.
    await row.getByRole('button', { name: 'إلغاء الإخفاء' }).click();
    await expect(row.getByText('مغلق', { exact: true })).toBeVisible();
    await expect.poll(() => typesFor(requestId)).toEqual(['request.removed', 'request.closed_by_admin']);
    const [, unhidden] = await notificationsFor(requestId);
    expect(unhidden.title).toBe(CLOSED_BY_ADMIN);
    expect(unhidden.read_at).toBeNull();

    // Clicking the hide notification marks it read and opens the request page
    await parent.goto('/notifications');
    await expectUnreadOnPage(parent, CLOSED_BY_ADMIN);
    await expect(async () => {
      await hiddenItem.getByRole('button').first().click({ timeout: 1_000 });
      await expect(parent).toHaveURL(new RegExp(`/parent/requests/${requestId}$`), { timeout: 3_000 });
    }).toPass();
    await expect(parent.getByText(marker)).toBeVisible();
    await expect.poll(async () => (await notificationsFor(requestId))[0].read_at).not.toBeNull();

    await Promise.all([parent.context().close(), admin.context().close()]);
  });

  test("the parent's own close and reopen notify nobody", async ({ browser }) => {
    test.slow();
    const parent = await pageAs(browser, 'parent');
    await markAllRead(parent);

    marker = e2eText('طلب بلا إشعارات');
    const requestId = await createE2eRequest(`${marker} — طلب أنشأه اختبار آلي ليغلقه ولي الأمر ويعيد فتحه بنفسه.`);

    await parent.goto('/parent/requests');
    const card = parent.locator('.MuiCard-root', { hasText: marker });
    await changeStatus(parent, card.getByRole('button', { name: 'إغلاق الطلب' }));
    await expect(card.getByText('مغلق', { exact: true })).toBeVisible();
    await changeStatus(parent, card.getByRole('button', { name: 'إعادة فتح' }));
    await expect(card.getByText('مفتوح — يظهر للمتخصصين')).toBeVisible();

    expect(await notificationsFor(requestId)).toEqual([]);

    await parent.context().close();
  });
});
