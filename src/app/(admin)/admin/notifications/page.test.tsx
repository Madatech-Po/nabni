import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';

const getMyNotifications = vi.fn();
vi.mock('@/services/notifications', () => ({
  NOTIFICATIONS_DEFAULT_LIMIT: 50,
  getMyNotifications: (opts: unknown) => getMyNotifications(opts),
}));
vi.mock('@/services/myNotifications', () => ({ markNotificationRead: vi.fn(), markAllNotificationsRead: vi.fn() }));
vi.mock('next/navigation', () => ({ useRouter: () => ({ push: vi.fn(), refresh: vi.fn() }) }));

import AdminNotificationsPage from './page';

describe('AdminNotificationsPage (NAB-107)', () => {
  it("lists the admin's notifications", async () => {
    getMyNotifications.mockResolvedValue([
      { id: 'a', type: 'educator_submitted', title: 'متخصص جديد بانتظار التوثيق', body: null, link: '/admin/educators', data: {}, readAt: null, createdAt: '2026-11-10T10:00:00Z' },
    ]);
    render(await AdminNotificationsPage());

    expect(getMyNotifications).toHaveBeenCalledWith({ limit: 50 });
    expect(screen.getByRole('heading', { name: 'الإشعارات' })).toBeInTheDocument();
    expect(screen.getByText('متخصص جديد بانتظار التوثيق')).toBeInTheDocument();
  });

  it('says so when there are none', async () => {
    getMyNotifications.mockResolvedValue([]);
    render(await AdminNotificationsPage());
    expect(screen.getByText('لا توجد إشعارات')).toBeInTheDocument();
  });
});
