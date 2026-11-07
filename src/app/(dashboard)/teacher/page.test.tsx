import { beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { createSupabaseMock, type RecordedQuery } from '@/test/supabaseMock';

let mock = createSupabaseMock();
const redirect = vi.fn((url: string) => {
  throw new Error(`redirect:${url}`);
});

vi.mock('@/utils/supabase/server', () => ({
  createClient: () => ({ ...mock.client, auth: { getUser: async () => ({ data: { user: { id: 'u1' } } }) } }),
}));
vi.mock('next/navigation', () => ({ redirect: (url: string) => redirect(url) }));

import TeacherDashboard from './page';

const request = {
  id: 'r1', student_age: 5, description: 'طلب مطابق', preferred_educator_gender: null, budget: null, area: null,
  created_at: new Date().toISOString(), service_category: { name_ar: 'تأسيس عربي' }, education_level: null,
  teaching_place: null, governorate: null, pricing_unit: null,
};

function respond(tables: Record<string, (q: RecordedQuery) => object>) {
  return createSupabaseMock((q) => tables[q.table]?.(q) ?? { data: [] });
}

const verified = {
  profiles: () => ({ data: { full_name: 'منى', onboarding_completed: true } }),
  educators: (q: RecordedQuery) =>
    q.calls.some((c) => c.method === 'eq' && c.args[0] === 'user_id')
      ? { data: { id: 'e1', verification_status: 'verified', is_active: true } }
      : { data: { governorate_id: 1 } },
  educator_subjects: () => ({ data: [{ subject_id: 4 }] }),
  offers: (q: RecordedQuery) =>
    q.calls.some((c) => c.method === 'in')
      ? { data: [] }
      : { data: [{ id: 'o1', status: 'pending' }, { id: 'o2', status: 'accepted' }, { id: 'o3', status: 'declined' }] },
  requests: () => ({ data: [request] }),
};

beforeEach(() => {
  redirect.mockClear();
});

describe('TeacherDashboard', () => {
  it('sends educators without a finished profile to it', async () => {
    mock = respond({ profiles: () => ({ data: { full_name: '', onboarding_completed: false } }) });

    await expect(TeacherDashboard()).rejects.toThrow('redirect:/teacher/profile');
  });

  it('shows the offer counts and matching requests to a verified educator', async () => {
    mock = respond(verified);
    render(await TeacherDashboard());

    expect(screen.getByText('حالة الملف: موثق')).toBeInTheDocument();
    expect(screen.getByText('عروض بانتظار الرد').previousSibling).toHaveTextContent('1');
    expect(screen.getByText('عروض مقبولة').previousSibling).toHaveTextContent('1');
    expect(screen.getByText('إجمالي عروضك').previousSibling).toHaveTextContent('3');
    expect(screen.getByText('طلب مطابق')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'قدّم عرضك' })).toHaveAttribute('href', '/teacher/requests/r1/offer');
  });

  it('explains the pending review instead of listing requests', async () => {
    mock = respond({
      ...verified,
      educators: () => ({ data: { id: 'e1', verification_status: 'pending', is_active: true } }),
    });
    render(await TeacherDashboard());

    expect(screen.getByText('ملفك قيد المراجعة')).toBeInTheDocument();
    expect(screen.queryByText('طلبات تناسب خدماتك ومنطقتك')).not.toBeInTheDocument();
  });
});
