import { beforeEach, describe, expect, it, vi } from 'vitest';

const getEducators = vi.fn();
vi.mock('@/services/tutors', () => ({ getEducators: (filters: unknown) => getEducators(filters) }));
vi.mock('@/components/educators/TutorFilters', () => ({ default: () => null }));

import EducatorsPage from './page';

beforeEach(() => {
  getEducators.mockReset();
  getEducators.mockResolvedValue([]);
});

describe('EducatorsPage filters', () => {
  it('passes the search term and the id filters to the directory query (NAB-130)', async () => {
    await EducatorsPage({ searchParams: Promise.resolve({ q: 'منى', subject: '7', governorate: 'x' }) });

    expect(getEducators).toHaveBeenCalledWith({ serviceCategoryId: 7, governorateId: undefined, q: 'منى' });
  });

  it('searches nothing when there is no term', async () => {
    await EducatorsPage({ searchParams: Promise.resolve({}) });

    expect(getEducators).toHaveBeenCalledWith({ serviceCategoryId: undefined, governorateId: undefined, q: undefined });
  });
});
