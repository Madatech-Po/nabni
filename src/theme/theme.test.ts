import { describe, expect, it } from 'vitest';
import theme from './theme';

describe('theme palette (NAB-116)', () => {
  it('has the light primary shades used for tinted backgrounds', () => {
    // sx values like bgcolor: 'primary.50' resolve to theme.palette.primary[50].
    const primary = theme.palette.primary as typeof theme.palette.primary & Record<50 | 100, string>;
    expect(primary[50]).toMatch(/^#[0-9a-f]{6}$/i);
    expect(primary[100]).toMatch(/^#[0-9a-f]{6}$/i);
    expect(primary.main).toBe('#0d9488');
  });
});
