import { test as setup } from '@playwright/test';
import { account, authFile, roleHome, roles } from './support/accounts';

// Logs in once per role and saves the session, so specs reuse it instead of
// signing in for every test.
for (const role of roles) {
  setup(`log in as ${role}`, async ({ page }) => {
    const credentials = account(role);
    setup.skip(!credentials, `E2E_${role.toUpperCase()}_EMAIL / _PASSWORD not set`);

    await page.goto('/login');
    await page.getByLabel('البريد الإلكتروني').fill(credentials!.email);
    await page.getByLabel('كلمة المرور').fill(credentials!.password);
    await page.getByRole('button', { name: 'دخول' }).click();
    await page.waitForURL(`**${roleHome[role]}`);

    await page.context().storageState({ path: authFile(role) });
  });
}
