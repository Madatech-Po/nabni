import { beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';

let user: { id: string } | null = { id: 'u1' };
const getMyNotifications = vi.fn();
const redirect = vi.fn((url: string) => {
  throw new Error(`redirect:${url}`);
});

vi.mock('@/utils/supabase/server', () => ({
  createClient: () => ({ auth: { getUser: async () => ({ data: { user } }) } }),
}));
vi.mock('@/services/notifications', () => ({
  NOTIFICATIONS_DEFAULT_LIMIT: 50,
  getMyNotifications: (opts: unknown) => getMyNotifications(opts),
}));
vi.mock('@/services/myNotifications', () => ({ markNotificationRead: vi.fn(), markAllNotificationsRead: vi.fn() }));
vi.mock('next/navigation', () => ({ redirect: (url: string) => redirect(url), useRouter: () => ({ push: vi.fn(), refresh: vi.fn() }) }));

import NotificationsPage from './page';

beforeEach(() => {
  user = { id: 'u1' };
  getMyNotifications.mockReset().mockResolvedValue([]);
  redirect.mockClear();
});

describe('NotificationsPage (NAB-107)', () => {
  it('sends visitors to log in and back', async () => {
    user = null;
    await expect(NotificationsPage()).rejects.toThrow('redirect:/login?redirectTo=/notifications');
    expect(getMyNotifications).not.toHaveBeenCalled();
  });

  it('lists up to 50 of the user\'s notifications', async () => {
    getMyNotifications.mockResolvedValue([
      { id: 'a', type: 'offer_accepted', title: 'تم قبول عرضك', body: 'تواصل مع ولي الأمر', link: null, data: {}, readAt: null, createdAt: '2026-11-10T10:00:00Z' },
    ]);
    render(await NotificationsPage());

    expect(getMyNotifications).toHaveBeenCalledWith({ limit: 50 });
    expect(screen.getByRole('heading', { name: 'الإشعارات' })).toBeInTheDocument();
    expect(screen.getByText('تم قبول عرضك')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'تعليم الكل كمقروء' })).toBeEnabled();
  });

  it('says so when there are none', async () => {
    render(await NotificationsPage());
    expect(screen.getByText('لا توجد إشعارات')).toBeInTheDocument();
  });
});
