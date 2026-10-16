import { beforeEach, describe, expect, it, vi } from 'vitest';
import { argsOf, createSupabaseMock, hasCall, type RecordedQuery } from '@/test/supabaseMock';

let mock = createSupabaseMock();
vi.mock('@/utils/supabase/server', () => ({ createClient: () => mock.client }));

import { getEducators } from './tutors';

const categories = [
  { id: 6, name_ar: 'رياضيات' },
  { id: 7, name_ar: 'تخاطب' },
];

function respond(educators: unknown[]) {
  return (q: RecordedQuery) => {
    if (q.table === 'educator_directory') return { data: educators };
    if (q.table === 'service_categories') return { data: categories };
    return undefined;
  };
}

beforeEach(() => {
  mock = createSupabaseMock(respond([]));
});

describe('getEducators', () => {
  it('reads the public directory view, never the educators table', async () => {
    await getEducators();

    expect(mock.on('educator_directory')).toHaveLength(1);
    expect(mock.on('educators')).toHaveLength(0);
    expect(argsOf(mock.on('educator_directory')[0], 'order')).toEqual([
      'experience_years',
      { ascending: false, nullsFirst: false },
    ]);
  });

  it('filters by service category through subject_ids', async () => {
    await getEducators({ serviceCategoryId: 6 });

    expect(argsOf(mock.on('educator_directory')[0], 'contains')).toEqual(['subject_ids', [6]]);
  });

  it('matches a governorate where the educator lives or teaches', async () => {
    await getEducators({ governorateId: 2 });

    expect(argsOf(mock.on('educator_directory')[0], 'or')).toEqual([
      'governorate_id.eq.2,location_governorate_ids.cs.{2}',
    ]);
  });

  it('adds no filters when none are given', async () => {
    await getEducators();

    const [query] = mock.on('educator_directory');
    expect(hasCall(query, 'contains')).toBe(false);
    expect(hasCall(query, 'or')).toBe(false);
  });

  it('turns subject ids into service names and drops unknown ids', async () => {
    mock = createSupabaseMock(respond([{ id: 'e1', full_name: 'منى', subject_ids: [7, 99, 6] }]));

    const [educator] = await getEducators();

    expect(educator.subjects).toEqual([
      { id: 7, name_ar: 'تخاطب' },
      { id: 6, name_ar: 'رياضيات' },
    ]);
  });

  it('throws when the directory query fails', async () => {
    mock = createSupabaseMock((q) =>
      q.table === 'educator_directory' ? { error: { message: 'down' } } : { data: categories }
    );

    await expect(getEducators()).rejects.toMatchObject({ message: 'down' });
  });
});
