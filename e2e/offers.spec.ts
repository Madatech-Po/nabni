import { test, expect, type Browser, type Page } from '@playwright/test';
import { account, authFile, type Role } from './support/accounts';
import { createE2eRequest, deleteE2eRequests, e2eText, sweepStaleE2eRequests, tokenOf } from './support/data';

// The whole offers flow across the three e2e roles (NAB-91, epic NAB-79).
// The e2e profiles carry test phone numbers: parent 01000000001, educator 01000000002.
const PARENT_PHONE = '01000000001';
const EDUCATOR_PHONE = '01000000002';

test.describe('offers flow', () => {
  test.describe.configure({ mode: 'serial' });
  test.skip(
    !account('parent') || !account('educator') || !account('admin'),
    'needs the e2e parent, educator and admin accounts',
  );

  let marker = '';
  test.beforeAll(sweepStaleE2eRequests);
  test.afterEach(async () => { if (marker) await deleteE2eRequests({ prefix: marker }); });

  /** A page logged in as `role`, in its own browser context. */
  async function pageAs(browser: Browser, role: Role): Promise<Page> {
    const context = await browser.newContext({ storageState: authFile(role) });
    return context.newPage();
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

  async function sendOffer(educator: Page, text: string, price: string, schedule: string) {
    await educator.goto('/requests');
    await feedCard(educator, text).getByRole('link', { name: 'قدّم عرضك' }).click();
    await expect(educator).toHaveURL(/\/teacher\/requests\/[0-9a-f-]+\/offer$/);
    await educator.getByLabel(/^السعر بالجنيه/).fill(price);
    await educator.getByRole('combobox', { name: /^لكل/ }).click();
    await educator.getByRole('listbox').getByRole('option').first().click();
    await educator.getByLabel(/^المواعيد المتاحة لك/).fill(schedule);
    await educator.getByLabel(/^تاريخ البدء المتوقع/).fill(tomorrow());
    await educator.getByLabel(/^رسالة لولي الأمر/).fill('خبرة في التأسيس للمرحلة الابتدائية.');
    await educator.getByRole('button', { name: 'إرسال العرض' }).click();
    await expect(educator).toHaveURL(/\/teacher\/offers$/);
  }

  test('educator offers, edits; parent accepts; both see contacts; admin sees it', async ({ browser }) => {
    test.slow();
    marker = e2eText('طلب للعروض');
    const requestId = await createE2eRequest(`${marker} — نبحث عن متخصص تأسيس لطفل في الصف الثاني الابتدائي.`);
    const educator = await pageAs(browser, 'educator');
    const parent = await pageAs(browser, 'parent');
    const admin = await pageAs(browser, 'admin');

    // Educator sends an offer from the feed
    await sendOffer(educator, marker, '250', 'السبت والثلاثاء من 5 إلى 7 مساءً');
    const offer = myOffer(educator, marker);
    await expect(offer.getByText('بانتظار رد ولي الأمر')).toBeVisible();
    await expect(offer.getByText(/250 ج\.م/)).toBeVisible();
    await expect(educator.getByText(PARENT_PHONE)).toHaveCount(0); // no contacts before acceptance

    // The feed now says the offer was sent
    await educator.goto('/requests');
    await expect(feedCard(educator, marker).getByRole('link', { name: 'تم إرسال عرضك' })).toBeVisible();

    // Educator edits the price
    await educator.goto('/teacher/offers');
    await offer.getByRole('link', { name: 'تعديل العرض' }).click();
    await expect(educator).toHaveURL(/\/teacher\/offers\/[0-9a-f-]+\/edit$/);
    await educator.getByLabel(/^السعر بالجنيه/).fill('300');
    await educator.getByRole('button', { name: 'حفظ التعديلات' }).click();
    await expect(educator).toHaveURL(/\/teacher\/offers$/);
    await expect(offer.getByText(/300 ج\.م/)).toBeVisible();

    // Parent sees the offer, without the educator's number yet
    await parent.goto(`/parent/requests/${requestId}`);
    await expect(parent.getByText('العروض (1)')).toBeVisible();
    const parentOffer = parent.locator('.MuiPaper-outlined', { hasText: 'السبت والثلاثاء' });
    await expect(parentOffer.getByText('بانتظار ردك')).toBeVisible();
    await expect(parentOffer.getByText(/300 ج\.م/)).toBeVisible();
    await expect(parent.getByText(EDUCATOR_PHONE)).toHaveCount(0);

    // Parent accepts (with confirmation)
    await parentOffer.getByRole('button', { name: 'قبول العرض' }).click();
    const dialog = parent.getByRole('dialog');
    await expect(dialog.getByText('قبول هذا العرض؟')).toBeVisible();
    await dialog.getByRole('button', { name: 'قبول العرض' }).click();
    await expect(dialog).toBeHidden();
    await expect(parentOffer.getByText('العرض المقبول')).toBeVisible();
    await expect(parent.getByText('مغلق', { exact: true })).toBeVisible(); // the request closed

    // Parent now sees the educator's contacts
    await expect(parent.getByText('تواصل مع المتخصص لترتيب أول حصة')).toBeVisible();
    await expect(parent.getByText(EDUCATOR_PHONE)).toBeVisible();
    await expect(parent.getByRole('link', { name: 'واتساب' })).toHaveAttribute('href', /wa\.me\/201000000002/);

    // Educator sees "accepted" and the parent's contacts
    await educator.goto('/teacher/offers');
    await expect(offer.getByText('تم قبول عرضك')).toBeVisible();
    await expect(offer.getByText('تواصل مع ولي الأمر لترتيب أول حصة')).toBeVisible();
    await expect(offer.getByText(PARENT_PHONE)).toBeVisible();
    await expect(offer.getByRole('button', { name: 'سحب العرض' })).toHaveCount(0);

    // A closed request is gone from the public feed
    await educator.goto('/requests');
    await expect(feedCard(educator, marker)).toHaveCount(0);

    // Admin sees the accepted offer on the request
    await admin.goto(`/admin/requests?q=${tokenOf(marker)}`);
    const row = admin.locator('.MuiPaper-outlined', { hasText: marker });
    await expect(row.getByText('العروض (1)')).toBeVisible();
    await expect(row.getByText('[E2E] متخصص')).toBeVisible();
    await expect(row.getByText('مقبول', { exact: true })).toBeVisible();
    await expect(row.getByRole('button', { name: 'إزالة العرض' })).toBeVisible();

    await Promise.all([educator.context().close(), parent.context().close(), admin.context().close()]);
  });

  test('educator withdraws and offers again; parent declines', async ({ browser }) => {
    test.slow();
    marker = e2eText('طلب للرفض');
    const requestId = await createE2eRequest(`${marker} — طلب لتجربة سحب العرض ورفضه من ولي الأمر في اختبار آلي.`);
    const educator = await pageAs(browser, 'educator');
    const parent = await pageAs(browser, 'parent');

    // Offer, then withdraw it (with confirmation)
    await sendOffer(educator, marker, '200', 'الأحد من 4 إلى 6 مساءً');
    const first = myOffer(educator, marker).filter({ hasText: 'الأحد من 4' });
    await first.getByRole('button', { name: 'سحب العرض' }).click();
    const withdrawDialog = educator.getByRole('dialog');
    await withdrawDialog.getByRole('button', { name: 'سحب العرض' }).click();
    await expect(withdrawDialog).toBeHidden();
    await expect(first.getByText('سحبت العرض')).toBeVisible();

    // A withdrawn offer lets the educator apply again while the request is open
    await sendOffer(educator, marker, '220', 'الاثنين من 5 إلى 7 مساءً');
    await expect(myOffer(educator, marker).filter({ hasText: 'الاثنين من 5' }).getByText('بانتظار رد ولي الأمر')).toBeVisible();

    // Parent sees the withdrawn and the new offer, and declines the new one
    await parent.goto(`/parent/requests/${requestId}`);
    await expect(parent.getByText('العروض (2)')).toBeVisible();
    await expect(parent.locator('.MuiPaper-outlined', { hasText: 'الأحد من 4' }).getByText('سحبه المتخصص')).toBeVisible();
    const pending = parent.locator('.MuiPaper-outlined', { hasText: 'الاثنين من 5' });
    await pending.getByRole('button', { name: 'رفض' }).click();
    const declineDialog = parent.getByRole('dialog');
    await expect(declineDialog.getByText('رفض هذا العرض؟')).toBeVisible();
    await declineDialog.getByRole('button', { name: 'رفض العرض' }).click();
    await expect(declineDialog).toBeHidden();
    await expect(pending.getByText('مرفوض', { exact: true })).toBeVisible();
    await expect(parent.getByText('مفتوح — يظهر للمتخصصين')).toBeVisible(); // still open for other offers
    await expect(parent.getByText(EDUCATOR_PHONE)).toHaveCount(0); // no contacts without acceptance

    // Educator sees the decision, still without the parent's number
    await educator.goto('/teacher/offers');
    const declined = myOffer(educator, marker).filter({ hasText: 'الاثنين من 5' });
    await expect(declined.getByText('لم يتم اختيار عرضك')).toBeVisible();
    await expect(educator.getByText(PARENT_PHONE)).toHaveCount(0);

    await Promise.all([educator.context().close(), parent.context().close()]);
  });
});
