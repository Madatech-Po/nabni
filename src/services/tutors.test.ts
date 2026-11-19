import { beforeEach, describe, expect, it, vi } from 'vitest';
import { allArgsOf, argsOf, createSupabaseMock, hasCall, type RecordedQuery } from '@/test/supabaseMock';

let mock = createSupabaseMock();
vi.mock('@/utils/supabase/server', () => ({ createClient: async () => mock.client }));

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

  describe('free-text search (NAB-130)', () => {
    // Name lookups (made with ilike) return the matching ids; the subject-name lookup returns all.
    function respondSearch(serviceIds: number[], governorateIds: number[]) {
      return (q: RecordedQuery) => {
        const isLookup = hasCall(q, 'ilike');
        if (q.table === 'educator_directory') return { data: [] };
        if (q.table === 'service_categories') return { data: isLookup ? serviceIds.map((id) => ({ id })) : categories };
        if (q.table === 'governorates') return { data: governorateIds.map((id) => ({ id })) };
        return undefined;
      };
    }

    it('matches the name or bio when no service or governorate name matches', async () => {
      mock = createSupabaseMock(respondSearch([], []));

      await getEducators({ q: 'منى' });

      expect(argsOf(mock.on('educator_directory')[0], 'or')).toEqual(['full_name.ilike.*منى*,bio.ilike.*منى*']);
      expect(argsOf(mock.on('governorates')[0], 'ilike')).toEqual(['name_ar', '%منى%']);
    });

    it('also matches services and governorates whose names contain the term', async () => {
      mock = createSupabaseMock(respondSearch([7], [2]));

      await getEducators({ q: 'تخاطب' });

      expect(argsOf(mock.on('educator_directory')[0], 'or')).toEqual([
        'full_name.ilike.*تخاطب*,bio.ilike.*تخاطب*,subject_ids.cs.{7},governorate_id.eq.2,location_governorate_ids.cs.{2}',
      ]);
    });

    it('sanitises the term before it reaches a filter', async () => {
      mock = createSupabaseMock(respondSearch([], []));

      await getEducators({ q: '  a,b)*%(c.  ' });

      expect(argsOf(mock.on('educator_directory')[0], 'or')).toEqual(['full_name.ilike.*abc*,bio.ilike.*abc*']);
    });

    it('ignores a term that is empty after sanitising', async () => {
      await getEducators({ q: ' %,() ' });

      expect(hasCall(mock.on('educator_directory')[0], 'or')).toBe(false);
      expect(mock.on('governorates')).toHaveLength(0);
    });

    it('combines with the governorate filter', async () => {
      mock = createSupabaseMock(respondSearch([], []));

      await getEducators({ governorateId: 3, q: 'منى' });

      expect(allArgsOf(mock.on('educator_directory')[0], 'or')).toEqual([
        ['governorate_id.eq.3,location_governorate_ids.cs.{3}'],
        ['full_name.ilike.*منى*,bio.ilike.*منى*'],
      ]);
    });

    it('throws when a name lookup fails', async () => {
      mock = createSupabaseMock((q) => (q.table === 'governorates' ? { error: { message: 'down' } } : { data: [] }));

      await expect(getEducators({ q: 'منى' })).rejects.toMatchObject({ message: 'down' });
    });
  });
});
