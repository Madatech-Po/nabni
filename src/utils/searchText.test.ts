import { describe, expect, it } from 'vitest';
import { sanitizeSearch } from './searchText';

describe('sanitizeSearch', () => {
  it('keeps Arabic and Latin letters, digits and spaces', () => {
    expect(sanitizeSearch('  منى Ali 10 ')).toBe('منى Ali 10');
  });

  it('strips characters that would break a PostgREST filter', () => {
    expect(sanitizeSearch('a%,()*.:b')).toBe('ab');
  });

  it('caps the length at 50', () => {
    expect(sanitizeSearch('a'.repeat(80))).toHaveLength(50);
  });
});
