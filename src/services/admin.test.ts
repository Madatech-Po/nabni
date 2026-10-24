import { beforeEach, describe, expect, it, vi } from 'vitest';
import { allArgsOf, argsOf, createSupabaseMock, hasCall } from '@/test/supabaseMock';

let mock = createSupabaseMock();
vi.mock('@/utils/supabase/server', () => ({ createClient: () => mock.client }));

import { ADMIN_PAGE_SIZE, getEducatorsForReview, getParentsForAdmin, getRequestsForAdmin } from './admin';

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

describe('getParentsForAdmin', () => {
  beforeEach(() => {
    mock = createSupabaseMock(() => ({ data: [{ id: 'p1' }], count: 41 }));
  });

  it('lists parents newest first with the exact total and request counts', async () => {
    const result = await getParentsForAdmin();

    const [query] = mock.on('profiles');
    expect(result).toEqual({ items: [{ id: 'p1' }], total: 41 });
    expect(argsOf(query, 'eq')).toEqual(['role', 'parent']);
    expect(argsOf(query, 'order')).toEqual(['created_at', { ascending: false }]);
    const [columns, options] = argsOf(query, 'select') as [string, unknown];
    expect(columns).toContain('requests(count)');
    expect(options).toEqual({ count: 'exact' });
  });

  it('pages through the list', async () => {
    await getParentsForAdmin({ page: 3 });

    expect(argsOf(mock.on('profiles')[0], 'range')).toEqual([2 * ADMIN_PAGE_SIZE, 3 * ADMIN_PAGE_SIZE - 1]);
  });

  it('treats invalid pages as the first page', async () => {
    await getParentsForAdmin({ page: -2 });

    expect(argsOf(mock.on('profiles')[0], 'range')).toEqual([0, ADMIN_PAGE_SIZE - 1]);
  });

  it('filters suspended accounts and searches with the cleaned term', async () => {
    await getParentsForAdmin({ active: false, q: ' 010,( ' });

    const [query] = mock.on('profiles');
    expect(allArgsOf(query, 'eq')).toContainEqual(['is_active', false]);
    expect(argsOf(query, 'or')).toEqual(['full_name.ilike.*010*,phone.ilike.*010*']);
  });

  it('reports a missing count as zero and rethrows errors', async () => {
    mock = createSupabaseMock(() => ({ data: [] }));
    expect(await getParentsForAdmin()).toEqual({ items: [], total: 0 });

    mock = createSupabaseMock(() => ({ error: { message: 'boom' } }));
    await expect(getParentsForAdmin()).rejects.toMatchObject({ message: 'boom' });
  });
});

describe('getRequestsForAdmin', () => {
  beforeEach(() => {
    mock = createSupabaseMock(() => ({ data: [{ id: 'r1' }], count: 3 }));
  });

  it('lists every request newest first, with the parent and lookups', async () => {
    const result = await getRequestsForAdmin();

    const [query] = mock.on('requests');
    expect(result).toEqual({ items: [{ id: 'r1' }], total: 3 });
    expect(argsOf(query, 'order')).toEqual(['created_at', { ascending: false }]);
    expect(hasCall(query, 'eq')).toBe(false);
    const [columns, options] = argsOf(query, 'select') as [string, unknown];
    for (const part of ['parent:profiles(id, full_name, phone, is_active)', 'service_categories(name_ar)', 'governorates(name_ar)']) {
      expect(columns).toContain(part);
    }
    expect(options).toEqual({ count: 'exact' });
    expect(argsOf(query, 'range')).toEqual([0, ADMIN_PAGE_SIZE - 1]);
  });

  it('applies status, service, governorate and parent filters', async () => {
    const parentId = '29dd7ba3-d2f2-4ac5-a310-08ce674c397c';
    await getRequestsForAdmin({ status: 'removed', serviceCategoryId: 4, governorateId: 7, parentId });

    expect(allArgsOf(mock.on('requests')[0], 'eq')).toEqual([
      ['status', 'removed'],
      ['service_category_id', 4],
      ['governorate_id', 7],
      ['parent_id', parentId],
    ]);
  });

  it('ignores a parent id that is not a uuid', async () => {
    await getRequestsForAdmin({ parentId: 'abc' });

    expect(hasCall(mock.on('requests')[0], 'eq')).toBe(false);
  });

  it('searches the description with the cleaned term', async () => {
    await getRequestsForAdmin({ q: ' قراءة%_ ' });

    expect(argsOf(mock.on('requests')[0], 'ilike')).toEqual(['description', '%قراءة%']);
  });
});
