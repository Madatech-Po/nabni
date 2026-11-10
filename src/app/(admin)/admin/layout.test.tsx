import { beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { createSupabaseMock } from '@/test/supabaseMock';

let user: { id: string } | null = { id: 'admin1' };
let mock = createSupabaseMock();
const getHeaderNotifications = vi.fn(async () => ({ unreadCount: 2, items: [] }));
const redirect = vi.fn((url: string) => {
  throw new Error(`redirect:${url}`);
});

vi.mock('@/utils/supabase/server', () => ({
  createClient: () => ({ ...mock.client, auth: { getUser: async () => ({ data: { user } }) } }),
}));
vi.mock('@/utils/supabase/client', () => ({ createClient: () => ({ auth: { signOut: vi.fn() } }) }));
vi.mock('@/components/notifications/headerNotifications', () => ({ getHeaderNotifications: () => getHeaderNotifications() }));
vi.mock('next/navigation', () => ({
  redirect: (url: string) => redirect(url),
  usePathname: () => '/admin',
  useRouter: () => ({ push: vi.fn(), refresh: vi.fn() }),
}));

import AdminLayout from './layout';

beforeEach(() => {
  user = { id: 'admin1' };
  mock = createSupabaseMock(() => ({ data: { role: 'admin', is_active: true } }));
  getHeaderNotifications.mockClear();
});

describe('AdminLayout', () => {
  it('shows the admin their notifications bell (NAB-107)', async () => {
    render(await AdminLayout({ children: <p>page</p> }));

    expect(getHeaderNotifications).toHaveBeenCalledTimes(1);
    expect(screen.getByRole('button', { name: 'الإشعارات' }).querySelector('.MuiBadge-badge')).toHaveTextContent('2');
    expect(screen.getByText('page')).toBeInTheDocument();
  });

  it('sends non-admins away before reading any notifications', async () => {
    mock = createSupabaseMock(() => ({ data: { role: 'parent', is_active: true } }));

    await expect(AdminLayout({ children: <p>page</p> })).rejects.toThrow('redirect:/dashboard');
    expect(getHeaderNotifications).not.toHaveBeenCalled();
  });
});
