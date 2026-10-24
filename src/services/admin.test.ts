import { beforeEach, describe, expect, it, vi } from 'vitest';
import { argsOf, createSupabaseMock, hasCall } from '@/test/supabaseMock';

let mock = createSupabaseMock();
vi.mock('@/utils/supabase/server', () => ({ createClient: () => mock.client }));

import { getEducatorsForReview } from './admin';

beforeEach(() => {
  mock = createSupabaseMock(() => ({ data: [{ id: 'e1' }] }));
});

describe('getEducatorsForReview', () => {
  it('lists every educator, oldest first, when no filters are given', async () => {
    const rows = await getEducatorsForReview();

    const [query] = mock.on('educators');
    expect(rows).toEqual([{ id: 'e1' }]);
    expect(argsOf(query, 'order')).toEqual(['created_at', { ascending: true }]);
    expect(hasCall(query, 'eq')).toBe(false);
    expect(hasCall(query, 'or')).toBe(false);
  });

  it('selects contact details and the related lookups for the review card', async () => {
    await getEducatorsForReview();

    const select = String(argsOf(mock.on('educators')[0], 'select')?.[0]);
    for (const part of ['phone', 'whatsapp_number', 'governorates(name_ar)', 'educator_subjects', 'educator_levels', 'educator_locations']) {
      expect(select).toContain(part);
    }
  });

  it('filters by verification status', async () => {
    await getEducatorsForReview({ status: 'pending' });

    expect(argsOf(mock.on('educators')[0], 'eq')).toEqual(['verification_status', 'pending']);
  });

  it('searches name and phone with the cleaned term', async () => {
    await getEducatorsForReview({ q: '  محمد  ' });

    expect(argsOf(mock.on('educators')[0], 'or')).toEqual(['full_name.ilike.*محمد*,phone.ilike.*محمد*']);
  });

  it('strips characters that could change the PostgREST filter', async () => {
    await getEducatorsForReview({ q: 'ali),role.eq.admin,(x*%' });

    const [filter] = argsOf(mock.on('educators')[0], 'or') as [string];
    const term = filter.slice('full_name.ilike.*'.length, filter.indexOf('*,'));
    // Letters survive, but without , ( ) . the text can no longer add or close filter clauses.
    expect(term).toBe('aliroleeqadminx');
    expect(term).not.toMatch(/[(),.*%]/);
  });

  it('skips the search when nothing usable is left', async () => {
    await getEducatorsForReview({ q: '(),.*%' });

    expect(hasCall(mock.on('educators')[0], 'or')).toBe(false);
  });

  it('caps the search term at 50 characters', async () => {
    await getEducatorsForReview({ q: 'a'.repeat(80) });

    const [filter] = argsOf(mock.on('educators')[0], 'or') as [string];
    expect(filter).toBe(`full_name.ilike.*${'a'.repeat(50)}*,phone.ilike.*${'a'.repeat(50)}*`);
  });

  it('throws when the query fails', async () => {
    mock = createSupabaseMock(() => ({ error: { message: 'permission denied' } }));

    await expect(getEducatorsForReview()).rejects.toMatchObject({ message: 'permission denied' });
  });
});
