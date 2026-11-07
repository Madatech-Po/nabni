import { test, expect } from '@playwright/test';

test('home page renders in Arabic, right to left, without page errors', async ({ page }) => {
  const pageErrors: string[] = [];
  page.on('pageerror', (error) => pageErrors.push(error.message));

  await page.goto('/');

  const html = page.locator('html');
  await expect(html).toHaveAttribute('lang', 'ar');
  await expect(html).toHaveAttribute('dir', 'rtl');
  await expect(page.locator('h1').first()).toBeVisible();
  expect(pageErrors).toEqual([]);
});
