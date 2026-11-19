import { test, expect, type Page } from '@playwright/test';

// The home page shows only real data (NAB-123). Live data changes, so these checks never
// expect exact counts: only that nothing made up is shown.

// Text from the old mock sections (counters, ratings, testimonials, example requests).
const MOCK_TEXT = [
  'قام بمساعدة',
  'متوسط التقييم',
  'ماذا يقول أولياء الأمور عن نبني',
  'وجدت معلمة تأسيس رائعة لابنتي',
  'أنصح كل أم باستخدام نبني',
  'منهج نور البيان',
  'نحتاج لمعلم رياضيات للتدريس الحضوري بمعدل حصتين أسبوعياً',
  'ابنتي تعاني من تأخر في النطق وتحتاج لجلسات تخاطب متخصصة في المنزل',
  'ابنِ سمعتك من خلال التقييمات',
];

test.beforeEach(async ({ page }) => {
  await page.goto('/');
  await page.waitForLoadState('load'); // not networkidle: Next keeps prefetching links
});

test('shows no mock content', async ({ page }) => {
  const text = await page.locator('main, body').first().innerText();
  for (const mock of MOCK_TEXT) expect(text, `mock text "${mock}"`).not.toContain(mock);
  // Placeholder avatars came from pravatar.cc.
  await expect(page.locator('img[src*="pravatar"]')).toHaveCount(0);
});

test('has no testimonials section', async ({ page }) => {
  await expect(page.getByRole('heading', { name: /ماذا يقول أولياء الأمور/ })).toHaveCount(0);
});

test('the stats section shows real counts or is hidden', async ({ page }) => {
  const stats = page.getByRole('region', { name: 'نبني بالأرقام' });
  if ((await stats.count()) === 0) return; // no numbers (or all zero): hidden, as intended

  // No blacklist of the old mock values: a real count can legitimately be 850. The old
  // counters are ruled out by their shape below ("850+", "4.9" never match).
  const numbers = stats.locator('h3');
  const count = await numbers.count();
  expect(count).toBeGreaterThan(0);
  expect(count).toBeLessThanOrEqual(4);
  for (const value of await numbers.allInnerTexts()) {
    // Shown as they are: digits only, no "+" and no rounding suffix, and above zero.
    expect(value.trim()).toMatch(/^[0-9٠-٩٬,]+$/);
    expect(value.trim()).not.toMatch(/^[0٠]+$/);
  }
});

test('latest requests shows real request cards or nothing', async ({ page }) => {
  const latest = page.getByRole('region', { name: 'أحدث الطلبات' });
  if ((await latest.count()) === 0) return; // nothing open: hidden rather than filled with examples

  const cards = latest.locator('.MuiCard-root');
  const count = await cards.count();
  expect(count).toBeGreaterThan(0);
  expect(count).toBeLessThanOrEqual(6);
  await expect(latest.getByRole('link', { name: 'عرض جميع الطلبات' })).toHaveAttribute('href', '/requests');

  // Every card is an open request from the public feed.
  const feed = await page.context().newPage();
  await feed.goto('/requests');
  await expect(feed.locator('h1')).toHaveText('طلبات أولياء الأمور');
  const feedText = await feed.locator('body').innerText();
  await feed.close();
  for (const card of await cards.all()) {
    const description = (await card.locator('p').last().innerText()).trim();
    // Other specs create and delete [E2E] requests meanwhile; only compare stable ones.
    if (description && !description.startsWith('[E2E]')) expect(feedText, 'a home card that is not in the /requests feed').toContain(description.slice(0, 40));
  }
});

test('a service card opens the directory filtered to that service (NAB-129)', async ({ page }) => {
  const card = page.locator('a[href^="/educators?subject="]').first();
  await expect(card).toBeVisible();
  const name = (await card.locator('h6').innerText()).trim();

  await card.click();

  await expect(page).toHaveURL(/\/educators\?subject=\d+$/);
  await expect(page.getByRole('combobox', { name: 'الخدمة' })).toHaveText(name);
});

test.describe('home search (NAB-130)', () => {
  const searchBox = (page: Page) =>
    page.getByRole('textbox', { name: 'ابحث عن متخصص، مادة، أو محافظة' });

  test('Enter searches the directory and the results match the term', async ({ page }) => {
    // Search by the name of a real educator from the directory, so there is always a match.
    const directory = await page.context().newPage();
    await directory.goto('/educators');
    await directory.waitForLoadState('load');
    const names = await directory.locator('.MuiCard-root h6').allInnerTexts();
    const total = names.length;
    await directory.close();
    test.skip(total === 0, 'no educators in the directory');
    // The longest word of the name: specific enough to narrow the list.
    const term = names[0].trim().split(/\s+/).reduce((a, b) => (b.length > a.length ? b : a));

    await searchBox(page).fill(term);
    await searchBox(page).press('Enter');

    await expect(page).toHaveURL((url) => url.pathname === '/educators' && url.searchParams.get('q') === term);
    await expect(page.getByText(`البحث: ${term}`)).toBeVisible();
    const cards = page.locator('.MuiCard-root');
    await expect(cards.first()).toBeVisible();
    expect(await cards.count()).toBeLessThanOrEqual(total);
    await expect(cards.filter({ hasText: names[0].trim() })).not.toHaveCount(0);
  });

  test('an empty search opens the whole directory', async ({ page }) => {
    await searchBox(page).press('Enter');

    await expect(page).toHaveURL(/\/educators$/);
    await expect(page.getByText(/البحث:/)).toHaveCount(0);
  });
});
