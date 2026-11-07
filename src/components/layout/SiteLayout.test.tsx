import { beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';

let user: { id: string } | null = null;

vi.mock('@/utils/supabase/server', () => ({
  createClient: () => ({ auth: { getUser: async () => ({ data: { user } }) } }),
}));
vi.mock('next/navigation', () => ({ useRouter: () => ({ push: vi.fn(), refresh: vi.fn() }) }));
vi.mock('@/utils/supabase/client', () => ({ createClient: () => ({ auth: { signOut: vi.fn() } }) }));

import SiteLayout from './SiteLayout';

beforeEach(() => {
  user = null;
});

describe('SiteLayout (NAB-93)', () => {
  it('wraps the page with the site header and footer', async () => {
    render(await SiteLayout({ children: <p>page</p> }));

    expect(screen.getByText('page')).toBeInTheDocument();
    expect(screen.getByRole('banner')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'تسجيل الدخول' })).toBeInTheDocument();
  });

  it('shows the signed-in header to a signed-in user', async () => {
    user = { id: 'p1' };
    render(await SiteLayout({ children: <p>page</p> }));

    expect(screen.getByRole('link', { name: 'لوحتي' })).toHaveAttribute('href', '/dashboard');
    expect(screen.getByRole('button', { name: 'تسجيل الخروج' })).toBeInTheDocument();
  });
});
