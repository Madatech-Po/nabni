import { test, expect } from '@playwright/test';
import { asRole, roleHome, roles } from './support/accounts';

for (const role of roles) {
  test.describe(`${role} session`, () => {
    asRole(test, role);

    test(`/dashboard sends the ${role} to ${roleHome[role]}`, async ({ page }) => {
      await page.goto('/dashboard');
      await expect(page).toHaveURL(new RegExp(`${roleHome[role]}$`));
    });
  });
}
