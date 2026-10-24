import { beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { createSupabaseMock } from '@/test/supabaseMock';
import { countByStatus } from '@/components/requests/countByStatus';

let mock = createSupabaseMock();
const redirect = vi.fn((url: string) => {
  throw new Error(`redirect:${url}`);
});

vi.mock('@/utils/supabase/server', () => ({
  createClient: () => ({ ...mock.client, auth: { getUser: async () => ({ data: { user: { id: 'p1' } } }) } }),
}));
vi.mock('@/utils/supabase/client', () => ({ createClient: () => mock.client }));
vi.mock('next/navigation', () => ({ redirect: (url: string) => redirect(url), useRouter: () => ({ refresh: vi.fn() }) }));

import ParentDashboard from './page';

const request = (id: string, status: string) => ({
  id, status, student_age: 5, description: `طلب ${id}`, preferred_educator_gender: null, budget: null, area: null,
  created_at: new Date().toISOString(), updated_at: new Date().toISOString(),
  service_category: { name_ar: 'تأسيس عربي' }, education_level: null, teaching_place: null, governorate: null, pricing_unit: null,
});

function respond(profile: object, requests: object[]) {
  return createSupabaseMock((q) => (q.table === 'profiles' ? { data: profile } : { data: requests }));
}

beforeEach(() => {
  redirect.mockClear();
});

describe('countByStatus', () => {
  it('counts each status', () => {
    expect(countByStatus([{ status: 'open' }, { status: 'open' }, { status: 'removed' }])).toEqual({
      open: 2, closed: 0, cancelled: 0, removed: 1,
    });
  });
});

describe('ParentDashboard', () => {
  it('sends parents who have not finished their profile to it', async () => {
    mock = respond({ full_name: 'منى', onboarding_completed: false }, []);

    await expect(ParentDashboard()).rejects.toThrow('redirect:/parent/profile');
  });

  it('shows the counts and only the latest two requests', async () => {
    mock = respond({ full_name: 'منى', onboarding_completed: true }, [
      request('a', 'open'), request('b', 'closed'), request('c', 'cancelled'),
    ]);
    render(await ParentDashboard());

    expect(screen.getByText('أهلاً منى')).toBeInTheDocument();
    expect(screen.getByText('طلبات مفتوحة').previousSibling).toHaveTextContent('1');
    expect(screen.getByText('طلبات مغلقة').previousSibling).toHaveTextContent('2');
    expect(screen.getByText('إجمالي الطلبات').previousSibling).toHaveTextContent('3');
    expect(screen.getByText('طلب a')).toBeInTheDocument();
    expect(screen.getByText('طلب b')).toBeInTheDocument();
    expect(screen.queryByText('طلب c')).not.toBeInTheDocument();
  });

  it('invites a new parent to post the first request', async () => {
    mock = respond({ full_name: '', onboarding_completed: true }, []);
    render(await ParentDashboard());

    expect(screen.getByRole('link', { name: 'انشر أول طلب' })).toHaveAttribute('href', '/parent/requests/new');
  });
});
