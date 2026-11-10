import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';

const push = vi.fn();
const refresh = vi.fn();
const signOut = vi.fn<(opts?: unknown) => Promise<{ error: Error | null }>>(async () => ({ error: null }));

vi.mock('next/navigation', () => ({ useRouter: () => ({ push, refresh }) }));
vi.mock('@/utils/supabase/client', () => ({ createClient: () => ({ auth: { signOut } }) }));

import GlobalHeader, { NAV_LINKS } from './GlobalHeader';

beforeEach(() => {
  push.mockClear();
  refresh.mockClear();
  signOut.mockClear();
});

describe('GlobalHeader (NAB-93)', () => {
  it('offers login and register to visitors', () => {
    render(<GlobalHeader />);

    expect(screen.getByRole('link', { name: 'تسجيل الدخول' })).toHaveAttribute('href', '/login');
    expect(screen.getByRole('link', { name: 'إنشاء حساب' })).toHaveAttribute('href', '/register');
    expect(screen.queryByRole('link', { name: 'لوحتي' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'تسجيل الخروج' })).not.toBeInTheDocument();
  });

  it('offers the dashboard and sign-out to signed-in users', () => {
    render(<GlobalHeader signedIn />);

    expect(screen.getByRole('link', { name: 'لوحتي' })).toHaveAttribute('href', '/dashboard');
    expect(screen.getByRole('button', { name: 'تسجيل الخروج' })).toBeInTheDocument();
    expect(screen.queryByRole('link', { name: 'تسجيل الدخول' })).not.toBeInTheDocument();
    expect(screen.queryByRole('link', { name: 'إنشاء حساب' })).not.toBeInTheDocument();
  });

  it('offers "join as educator" to visitors only (NAB-100)', () => {
    const { unmount } = render(<GlobalHeader />);
    expect(screen.getByRole('link', { name: 'انضم كمتخصص' })).toHaveAttribute('href', '/register?role=educator');
    unmount();

    render(<GlobalHeader signedIn />);
    expect(screen.queryByRole('link', { name: 'انضم كمتخصص' })).not.toBeInTheDocument();
  });

  it('always links home from the logo', () => {
    render(<GlobalHeader signedIn />);

    expect(screen.getByRole('link', { name: 'Nabni' })).toHaveAttribute('href', '/');
  });

  it('signs out and goes home', async () => {
    render(<GlobalHeader signedIn />);
    fireEvent.click(screen.getByRole('button', { name: 'تسجيل الخروج' }));

    await waitFor(() => expect(push).toHaveBeenCalledWith('/'));
    expect(signOut).toHaveBeenCalledWith({ scope: 'local' });
    expect(refresh).toHaveBeenCalled();
  });

  it.each([
    ['returns an error', async () => ({ error: new Error('network') })],
    ['throws', async () => { throw new Error('offline'); }],
  ])('stays put and re-enables the button when sign-out %s (NAB-94)', async (_case, impl) => {
    signOut.mockImplementationOnce(impl);
    render(<GlobalHeader signedIn />);
    const button = screen.getByRole('button', { name: 'تسجيل الخروج' });
    fireEvent.click(button);

    await waitFor(() => expect(button).toBeEnabled());
    expect(signOut).toHaveBeenCalledTimes(1);
    expect(push).not.toHaveBeenCalled();
  });

  describe('notifications bell (NAB-107)', () => {
    const notifications = {
      unreadCount: 2,
      items: [{ id: 'n1', type: 'offer_accepted', title: 'تم قبول عرضك', body: null, link: null, data: {}, readAt: null, createdAt: '2026-11-10T10:00:00Z' }],
    };

    it('is not shown to visitors', () => {
      render(<GlobalHeader notifications={notifications} />);
      expect(screen.queryByRole('button', { name: 'الإشعارات' })).not.toBeInTheDocument();
    });

    it('shows signed-in users their unread count and latest notifications', () => {
      render(<GlobalHeader signedIn notifications={notifications} />);
      const bell = screen.getByRole('button', { name: 'الإشعارات' });
      expect(bell.querySelector('.MuiBadge-badge')).toHaveTextContent('2');

      fireEvent.click(bell);
      const menu = screen.getByRole('dialog', { name: 'آخر الإشعارات' });
      expect(within(menu).getByText('تم قبول عرضك')).toBeInTheDocument();
      expect(within(menu).getByRole('link', { name: 'عرض الكل' })).toHaveAttribute('href', '/notifications');
    });

    it('stays outside the phone menu, so it is always one tap away', () => {
      render(<GlobalHeader signedIn notifications={notifications} />);
      const bell = screen.getByRole('button', { name: 'الإشعارات' });
      expect(bell.closest('nav')).toBeNull();
      expect(bell.parentElement).toBe(screen.getByRole('button', { name: 'القائمة' }).parentElement);
    });

    it('still shows an empty bell to a signed-in user without data', () => {
      render(<GlobalHeader signedIn />);
      expect(screen.getByRole('button', { name: 'الإشعارات' }).querySelector('.MuiBadge-badge')).toHaveClass('MuiBadge-invisible');
    });
  });

  describe('phone menu (NAB-99)', () => {
    it('opens from the menu button and lists every page link', async () => {
      render(<GlobalHeader />);
      fireEvent.click(screen.getByRole('button', { name: 'القائمة' }));

      const menu = await screen.findByRole('navigation', { name: 'قائمة الموقع' });
      for (const { href, label } of NAV_LINKS) {
        expect(within(menu).getByRole('link', { name: label })).toHaveAttribute('href', href);
      }
      expect(within(menu).getByRole('link', { name: 'تسجيل الدخول' })).toHaveAttribute('href', '/login');
    });

    it('shows a signed-in user the dashboard and sign-out, without "join as educator"', async () => {
      render(<GlobalHeader signedIn />);
      fireEvent.click(screen.getByRole('button', { name: 'القائمة' }));

      const menu = await screen.findByRole('navigation', { name: 'قائمة الموقع' });
      expect(within(menu).getByRole('link', { name: 'لوحتي' })).toHaveAttribute('href', '/dashboard');
      expect(within(menu).getByRole('button', { name: 'تسجيل الخروج' })).toBeInTheDocument();
      expect(within(menu).queryByRole('link', { name: 'انضم كمتخصص' })).not.toBeInTheDocument();
    });

    it('closes after picking a link', async () => {
      render(<GlobalHeader />);
      fireEvent.click(screen.getByRole('button', { name: 'القائمة' }));
      const menu = await screen.findByRole('navigation', { name: 'قائمة الموقع' });
      fireEvent.click(within(menu).getByRole('link', { name: 'عن نبني' }));

      await waitFor(() => expect(screen.queryByRole('navigation', { name: 'قائمة الموقع' })).not.toBeInTheDocument());
    });
  });
});
