import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import type { NotificationItem } from '@/services/notifications';

const push = vi.fn();
const refresh = vi.fn();
const markNotificationRead = vi.fn<(id: string) => Promise<void>>(async () => undefined);
const markAllNotificationsRead = vi.fn<() => Promise<number>>(async () => 0);

vi.mock('next/navigation', () => ({ useRouter: () => ({ push, refresh }) }));
vi.mock('@/services/myNotifications', () => ({
  markNotificationRead: (id: string) => markNotificationRead(id),
  markAllNotificationsRead: () => markAllNotificationsRead(),
}));

import NotificationBell from './NotificationBell';
import { internalLink, MARK_ERROR } from './useNotificationActions';

const notification = (id: string, overrides: Partial<NotificationItem> = {}): NotificationItem => ({
  id,
  type: 'offer_accepted',
  title: `عنوان ${id}`,
  body: `تفاصيل ${id}`,
  link: `/teacher/offers/${id}`,
  data: {},
  readAt: null,
  createdAt: '2026-11-10T10:00:00Z',
  ...overrides,
});

// `hidden`: while the menu is open, MUI hides the rest of the page from assistive tech.
const bell = () => screen.getByRole('button', { name: 'الإشعارات', hidden: true });
const badge = () => bell().querySelector('.MuiBadge-badge');
const expectBadge = (text: string) => {
  expect(badge()).toHaveTextContent(text);
  expect(badge()).not.toHaveClass('MuiBadge-invisible');
};

function openBell() {
  fireEvent.click(bell());
  return screen.getByRole('dialog', { name: 'آخر الإشعارات' });
}

beforeEach(() => {
  push.mockClear();
  refresh.mockClear();
  markNotificationRead.mockReset().mockResolvedValue(undefined);
  markAllNotificationsRead.mockReset().mockResolvedValue(0);
});

describe('NotificationBell (NAB-107)', () => {
  it('shows the unread count on the badge', () => {
    render(<NotificationBell unreadCount={3} items={[notification('a')]} viewAllHref="/notifications" />);
    expectBadge('3');
  });

  it('hides the badge when nothing is unread', () => {
    render(<NotificationBell unreadCount={0} items={[]} viewAllHref="/notifications" />);
    expect(badge()).toHaveClass('MuiBadge-invisible');
  });

  it('lists the latest notifications, highlighting unread ones, and links to all', () => {
    render(
      <NotificationBell
        unreadCount={1}
        items={[notification('a'), notification('b', { readAt: '2026-11-10T11:00:00Z' })]}
        viewAllHref="/admin/notifications"
      />,
    );
    const menu = openBell();

    const unread = within(menu).getByRole('button', { name: /عنوان a/ });
    const read = within(menu).getByRole('button', { name: /عنوان b/ });
    expect(unread).toHaveAttribute('data-unread', 'true');
    expect(read).not.toHaveAttribute('data-unread');
    expect(within(menu).getByText('تفاصيل a')).toBeInTheDocument();
    expect(within(menu).getByRole('link', { name: 'عرض الكل' })).toHaveAttribute('href', '/admin/notifications');
  });

  it('says so when there are no notifications', () => {
    render(<NotificationBell unreadCount={0} items={[]} viewAllHref="/notifications" />);
    const menu = openBell();
    expect(within(menu).getByText('لا توجد إشعارات')).toBeInTheDocument();
    expect(within(menu).getByRole('button', { name: 'تعليم الكل كمقروء' })).toBeDisabled();
  });

  it('marks an unread item read, follows its link and refreshes', async () => {
    render(<NotificationBell unreadCount={2} items={[notification('a')]} viewAllHref="/notifications" />);
    fireEvent.click(within(openBell()).getByRole('button', { name: /عنوان a/ }));

    await waitFor(() => expect(push).toHaveBeenCalledWith('/teacher/offers/a'));
    expect(markNotificationRead).toHaveBeenCalledWith('a');
    expect(refresh).toHaveBeenCalled();
    expectBadge('1');
  });

  it('follows a read item without marking it again', async () => {
    render(<NotificationBell unreadCount={0} items={[notification('a', { readAt: '2026-11-10T11:00:00Z' })]} viewAllHref="/notifications" />);
    fireEvent.click(within(openBell()).getByRole('button', { name: /عنوان a/ }));

    await waitFor(() => expect(push).toHaveBeenCalledWith('/teacher/offers/a'));
    expect(markNotificationRead).not.toHaveBeenCalled();
  });

  it('marks everything read and refreshes', async () => {
    render(<NotificationBell unreadCount={7} items={[notification('a'), notification('b')]} viewAllHref="/notifications" />);
    const menu = openBell();
    fireEvent.click(within(menu).getByRole('button', { name: 'تعليم الكل كمقروء' }));

    await waitFor(() => expect(refresh).toHaveBeenCalled());
    expect(markAllNotificationsRead).toHaveBeenCalledTimes(1);
    expect(within(menu).getByRole('button', { name: /عنوان a/ })).not.toHaveAttribute('data-unread');
    expect(badge()).toHaveClass('MuiBadge-invisible');
  });

  it('trusts the server again once a refresh brings new notifications', async () => {
    const { rerender } = render(<NotificationBell unreadCount={1} items={[notification('a')]} viewAllHref="/notifications" />);
    fireEvent.click(within(openBell()).getByRole('button', { name: 'تعليم الكل كمقروء' }));
    await waitFor(() => expect(refresh).toHaveBeenCalled());

    rerender(<NotificationBell unreadCount={1} items={[notification('new'), notification('a', { readAt: '2026-11-10T11:00:00Z' })]} viewAllHref="/notifications" />);
    expectBadge('1');
    expect(screen.getByRole('button', { name: /عنوان new/ })).toHaveAttribute('data-unread', 'true');
  });

  it('shows a short message and stays put when marking fails', async () => {
    markNotificationRead.mockRejectedValueOnce(new Error('offline'));
    render(<NotificationBell unreadCount={1} items={[notification('a')]} viewAllHref="/notifications" />);
    const menu = openBell();
    fireEvent.click(within(menu).getByRole('button', { name: /عنوان a/ }));

    expect(await within(menu).findByText(MARK_ERROR)).toBeInTheDocument();
    expect(push).not.toHaveBeenCalled();
    expect(within(menu).getByRole('button', { name: /عنوان a/ })).toHaveAttribute('data-unread', 'true');
  });
});

describe('internalLink', () => {
  it('only allows in-app paths', () => {
    expect(internalLink('/parent/requests/1')).toBe('/parent/requests/1');
    expect(internalLink(null)).toBeNull();
    expect(internalLink('https://evil.example')).toBeNull();
    expect(internalLink('//evil.example')).toBeNull();
    expect(internalLink('/\\evil.example')).toBeNull();
  });
});
