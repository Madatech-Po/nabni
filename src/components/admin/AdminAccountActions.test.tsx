import { describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, within } from '@testing-library/react';

vi.mock('next/navigation', () => ({ useRouter: () => ({ push: vi.fn(), refresh: vi.fn() }) }));
vi.mock('@/utils/supabase/client', () => ({ createClient: () => ({ auth: { signOut: vi.fn() } }) }));

import AdminAccountActions from './AdminAccountActions';

const notifications = {
  unreadCount: 1,
  items: [{ id: 'n1', type: 'educator_submitted', title: 'متخصص جديد بانتظار التوثيق', body: null, link: '/admin/educators', data: {}, readAt: null, createdAt: '2026-11-10T10:00:00Z' }],
};

describe('AdminAccountActions (NAB-104)', () => {
  it('links back to the public site and offers sign-out', () => {
    render(<AdminAccountActions notifications={notifications} />);

    expect(screen.getByRole('link', { name: 'الموقع' })).toHaveAttribute('href', '/');
    expect(screen.getByRole('button', { name: 'تسجيل الخروج' })).toBeEnabled();
  });

  it("shows the admin's notifications bell, linking to the admin list (NAB-107)", () => {
    render(<AdminAccountActions notifications={notifications} />);
    const bell = screen.getByRole('button', { name: 'الإشعارات' });
    expect(bell.querySelector('.MuiBadge-badge')).toHaveTextContent('1');

    fireEvent.click(bell);
    const menu = screen.getByRole('dialog', { name: 'آخر الإشعارات' });
    expect(within(menu).getByText('متخصص جديد بانتظار التوثيق')).toBeInTheDocument();
    expect(within(menu).getByRole('link', { name: 'عرض الكل' })).toHaveAttribute('href', '/admin/notifications');
  });
});
