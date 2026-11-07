import path from 'node:path';
import type { test as playwrightTest } from '@playwright/test';

export type Role = 'parent' | 'educator' | 'admin';

export const roles: Role[] = ['parent', 'educator', 'admin'];

// Where /dashboard sends each role after login.
export const roleHome: Record<Role, string> = {
  parent: '/parent',
  educator: '/teacher',
  admin: '/admin',
};

// E2E accounts live on the live Supabase project; their credentials come from
// .env.local locally and from GitHub secrets in CI, never from the repo.
export function account(role: Role): { email: string; password: string } | null {
  const prefix = `E2E_${role.toUpperCase()}`;
  const email = process.env[`${prefix}_EMAIL`];
  const password = process.env[`${prefix}_PASSWORD`];
  return email && password ? { email, password } : null;
}

export function authFile(role: Role): string {
  return path.join(__dirname, '..', '..', 'playwright', '.auth', `${role}.json`);
}

// Call inside a describe block: runs its tests logged in as `role`, or skips
// them when that e2e account is not configured.
export function asRole(test: typeof playwrightTest, role: Role): void {
  test.skip(!account(role), `E2E_${role.toUpperCase()}_EMAIL / _PASSWORD not set`);
  test.use({ storageState: authFile(role) });
}
