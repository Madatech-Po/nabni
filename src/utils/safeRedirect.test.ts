import { describe, expect, it } from 'vitest';
import { safeNextPath } from './safeRedirect';

describe('safeNextPath', () => {
  it('keeps internal paths', () => {
    expect(safeNextPath('/reset-password', '/dashboard')).toBe('/reset-password');
    expect(safeNextPath('/requests/5?tab=offers', '/dashboard')).toBe('/requests/5?tab=offers');
  });

  it('falls back when there is no next', () => {
    expect(safeNextPath(null, '/dashboard')).toBe('/dashboard');
    expect(safeNextPath('', '/dashboard')).toBe('/dashboard');
  });

  it('refuses anything that leaves the site', () => {
    for (const next of ['https://evil.com', '//evil.com', '/\\evil.com', 'evil.com', 'javascript:alert(1)', '/\t/evil.com']) {
      expect(safeNextPath(next, '/dashboard')).toBe('/dashboard');
    }
  });
});
