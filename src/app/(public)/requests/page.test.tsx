import { beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { createSupabaseMock, type RecordedQuery } from '@/test/supabaseMock';

let mock = createSupabaseMock();
let user: { id: string } | null = null;

vi.mock('@/utils/supabase/server', () => ({
  createClient: () => ({ ...mock.client, auth: { getUser: async () => ({ data: { user } }) } }),
}));
vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: vi.fn() }),
  usePathname: () => '/requests',
  useSearchParams: () => new URLSearchParams(),
}));
vi.mock('@/services/lookups', () => ({ getServiceCategories: async () => [], getGovernorates: async () => [] }));

import RequestsPage from './page';

const request = {
  id: 'r1', student_age: 5, description: 'طلب تأسيس', preferred_educator_gender: null, budget: null, area: null,
  created_at: new Date().toISOString(), service_category: { name_ar: 'تأسيس عربي' }, education_level: null,
  teaching_place: null, governorate: null, pricing_unit: null,
};

function respond(overrides: Partial<Record<string, (q: RecordedQuery) => object>> = {}) {
  return createSupabaseMock((q) => {
    const handler = overrides[q.table];
    if (handler) return handler(q);
    if (q.table === 'requests') return { data: [request] };
    return { data: null };
  });
}

beforeEach(() => {
  user = null;
  mock = respond();
});

describe('RequestsPage', () => {
  it('shows visitors the feed and the parent call to action, without offer buttons', async () => {
    render(await RequestsPage({ searchParams: {} }));

    expect(screen.getByText('طلب تأسيس')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'ولي أمر؟ انشر طلبك' })).toBeInTheDocument();
    expect(screen.queryByText('قدّم عرضك')).not.toBeInTheDocument();
  });

  it('marks requests the educator already offered on', async () => {
    user = { id: 'u1' };
    mock = respond({
      profiles: () => ({ data: { role: 'educator' } }),
      educators: () => ({ data: { id: 'e1', verification_status: 'verified', is_active: true } }),
      offers: () => ({ data: [{ request_id: 'r1' }] }),
    });
    render(await RequestsPage({ searchParams: {} }));

    expect(screen.getByRole('link', { name: 'تم إرسال عرضك' })).toHaveAttribute('href', '/teacher/offers');
    expect(screen.queryByText('ولي أمر؟ انشر طلبك')).not.toBeInTheDocument();
  });

  it('keeps the feed when the educator lookup fails (NAB-88)', async () => {
    user = { id: 'u1' };
    mock = respond({
      profiles: () => ({ data: { role: 'educator' } }),
      educators: () => ({ error: { message: 'timeout' } }),
    });
    render(await RequestsPage({ searchParams: {} }));

    expect(screen.getByText('طلب تأسيس')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'قدّم عرضك' })).toHaveAttribute('href', '/teacher/requests/r1/offer');
  });
});
