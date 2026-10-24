import { beforeEach, describe, expect, it, vi } from 'vitest';
import { allArgsOf, argsOf, createSupabaseMock } from '@/test/supabaseMock';

let mock = createSupabaseMock();
vi.mock('@/utils/supabase/server', () => ({ createClient: () => mock.client }));

import { getMyRequests, getOpenRequests } from './requests';

beforeEach(() => {
  mock = createSupabaseMock(() => ({ data: [{ id: 'r1' }] }));
});

describe('getOpenRequests', () => {
  it('returns only open requests, newest first', async () => {
    const rows = await getOpenRequests();

    const [query] = mock.on('requests');
    expect(rows).toEqual([{ id: 'r1' }]);
    expect(allArgsOf(query, 'eq')).toEqual([['status', 'open']]);
    expect(argsOf(query, 'order')).toEqual(['created_at', { ascending: false }]);
  });

  it('joins the lookups shown on the card and never parent contact details', async () => {
    await getOpenRequests();

    const select = String(argsOf(mock.on('requests')[0], 'select')?.[0]);
    for (const part of ['service_categories(name_ar)', 'education_levels(name_ar)', 'teaching_places(name_ar)', 'governorates(name_ar)', 'pricing_units(name_ar)']) {
      expect(select).toContain(part);
    }
    expect(select).not.toMatch(/phone|profiles|parent_id/);
  });

  it('filters by service category and governorate', async () => {
    await getOpenRequests({ serviceCategoryId: 6, governorateId: 2 });

    expect(allArgsOf(mock.on('requests')[0], 'eq')).toEqual([
      ['status', 'open'],
      ['service_category_id', 6],
      ['governorate_id', 2],
    ]);
  });

  it('returns an empty list when there is no data', async () => {
    mock = createSupabaseMock(() => ({ data: null }));

    await expect(getOpenRequests()).resolves.toEqual([]);
  });

  it('throws when the query fails', async () => {
    mock = createSupabaseMock(() => ({ error: { message: 'boom' } }));

    await expect(getOpenRequests()).rejects.toMatchObject({ message: 'boom' });
  });
});

describe('getMyRequests', () => {
  it("reads only the parent's own requests, every status, newest first", async () => {
    mock = createSupabaseMock(() => ({ data: [{ id: 'r1', status: 'removed' }] }));

    expect(await getMyRequests('p1')).toEqual([{ id: 'r1', status: 'removed' }]);
    const [query] = mock.on('requests');
    expect(allArgsOf(query, 'eq')).toEqual([['parent_id', 'p1']]);
    expect(argsOf(query, 'order')).toEqual(['created_at', { ascending: false }]);
    expect(String(argsOf(query, 'select')?.[0])).toContain('status');
  });
});
