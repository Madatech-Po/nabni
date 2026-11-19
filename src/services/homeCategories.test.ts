import { beforeEach, describe, expect, it, vi } from 'vitest';
import { argsOf, createSupabaseMock } from '@/test/supabaseMock';

let mock = createSupabaseMock();
vi.mock('@/utils/supabase/server', () => ({ createClient: async () => mock.client }));

import { getHomeServiceCategories } from './homeCategories';

const rows = [{ id: 4, name_ar: 'تأسيس عربي', slug: 'arabic-foundation' }];

beforeEach(() => {
  mock = createSupabaseMock((q) => (q.table === 'service_categories' ? { data: rows } : undefined));
});

describe('getHomeServiceCategories (NAB-129)', () => {
  it('reads the active categories in display order', async () => {
    expect(await getHomeServiceCategories()).toEqual(rows);

    const [query] = mock.on('service_categories');
    expect(argsOf(query, 'select')).toEqual(['id, name_ar, slug']);
    expect(argsOf(query, 'eq')).toEqual(['is_active', true]);
    expect(argsOf(query, 'order')).toEqual(['display_order']);
  });

  it('throws when the query fails', async () => {
    mock = createSupabaseMock(() => ({ error: { message: 'down' } }));

    await expect(getHomeServiceCategories()).rejects.toMatchObject({ message: 'down' });
  });
});
