import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';

let user: { id: string } | null = null;
const getHeaderNotifications = vi.fn(async () => ({
  unreadCount: 3,
  items: [{ id: 'n1', type: 'offer_received', title: 'عرض جديد على طلبك', body: null, link: null, data: {}, readAt: null, createdAt: '2026-11-10T10:00:00Z' }],
}));

vi.mock('@/utils/supabase/server', () => ({
  createClient: () => ({ auth: { getUser: async () => ({ data: { user } }) } }),
}));
vi.mock('next/navigation', () => ({ useRouter: () => ({ push: vi.fn(), refresh: vi.fn() }) }));
vi.mock('@/utils/supabase/client', () => ({ createClient: () => ({ auth: { signOut: vi.fn() } }) }));
vi.mock('@/components/notifications/headerNotifications', () => ({ getHeaderNotifications: () => getHeaderNotifications() }));

import SiteLayout from './SiteLayout';

beforeEach(() => {
  user = null;
  getHeaderNotifications.mockClear();
});

describe('SiteLayout (NAB-93)', () => {
  it('wraps the page with the site header and footer', async () => {
    render(await SiteLayout({ children: <p>page</p> }));

    expect(screen.getByText('page')).toBeInTheDocument();
    expect(screen.getByRole('banner')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'تسجيل الدخول' })).toBeInTheDocument();
  });

  it('reads no notifications and shows no bell for visitors (NAB-107)', async () => {
    render(await SiteLayout({ children: <p>page</p> }));

    expect(getHeaderNotifications).not.toHaveBeenCalled();
    expect(screen.queryByRole('button', { name: 'الإشعارات' })).not.toBeInTheDocument();
  });

  it("passes a signed-in user's notifications to the header bell (NAB-107)", async () => {
    user = { id: 'p1' };
    render(await SiteLayout({ children: <p>page</p> }));

    expect(getHeaderNotifications).toHaveBeenCalledTimes(1);
    const bell = screen.getByRole('button', { name: 'الإشعارات' });
    expect(bell.querySelector('.MuiBadge-badge')).toHaveTextContent('3');
    fireEvent.click(bell);
    expect(screen.getByText('عرض جديد على طلبك')).toBeInTheDocument();
  });

  it('shows the signed-in header to a signed-in user', async () => {
    user = { id: 'p1' };
    render(await SiteLayout({ children: <p>page</p> }));

    expect(screen.getByRole('link', { name: 'لوحتي' })).toHaveAttribute('href', '/dashboard');
    expect(screen.getByRole('button', { name: 'تسجيل الخروج' })).toBeInTheDocument();
  });
});
