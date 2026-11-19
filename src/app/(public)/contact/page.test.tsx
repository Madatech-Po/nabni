import { beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { createSupabaseMock } from '@/test/supabaseMock';

let mock = createSupabaseMock();
let user: { id: string; email?: string } | null = null;

vi.mock('@/utils/supabase/server', () => ({
  createClient: () => ({ ...mock.client, auth: { getUser: async () => ({ data: { user } }) } }),
}));
vi.mock('@/services/contact', () => ({ submitContactMessage: vi.fn() }));

import ContactPage from './page';

beforeEach(() => {
  user = null;
  mock = createSupabaseMock((q) => (q.table === 'profiles' ? { data: { full_name: 'منى علي' } } : undefined));
});

describe('ContactPage (NAB-124)', () => {
  it('shows visitors an empty form, without reading any profile', async () => {
    render(await ContactPage());

    expect(screen.getByRole('heading', { name: 'تواصل معنا' })).toBeInTheDocument();
    expect(screen.queryByText(/جاري التطوير/)).not.toBeInTheDocument();
    expect(screen.getByLabelText(/الاسم/)).toHaveValue('');
    expect(mock.on('profiles')).toHaveLength(0);
  });

  it("prefills a signed-in user's name and email", async () => {
    user = { id: 'u1', email: 'mona@example.com' };
    render(await ContactPage());

    expect(screen.getByLabelText(/الاسم/)).toHaveValue('منى علي');
    expect(screen.getByLabelText('البريد الإلكتروني')).toHaveValue('mona@example.com');
  });
});
