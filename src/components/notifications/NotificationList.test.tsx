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

import NotificationList from './NotificationList';
import { MARK_ERROR } from './useNotificationActions';

const notification = (id: string, overrides: Partial<NotificationItem> = {}): NotificationItem => ({
  id,
  type: 'verification_approved',
  title: `عنوان ${id}`,
  body: `تفاصيل ${id}`,
  link: `/teacher/profile`,
  data: {},
  readAt: null,
  createdAt: '2026-11-10T10:00:00Z',
  ...overrides,
});

const row = (title: string) => screen.getByText(title).closest('li') as HTMLElement;

beforeEach(() => {
  push.mockClear();
  refresh.mockClear();
  markNotificationRead.mockReset().mockResolvedValue(undefined);
  markAllNotificationsRead.mockReset().mockResolvedValue(0);
});

describe('NotificationList (NAB-107)', () => {
  it('lists every notification with its body, highlighting unread ones', () => {
    render(<NotificationList items={[notification('a'), notification('b', { readAt: '2026-11-10T11:00:00Z', body: null })]} />);

    expect(screen.getAllByRole('listitem')).toHaveLength(2);
    expect(screen.getByText('تفاصيل a')).toBeInTheDocument();
    expect(row('عنوان a')).toHaveAttribute('data-unread', 'true');
    expect(within(row('عنوان a')).getByRole('button', { name: 'تعليم كمقروء' })).toBeInTheDocument();
    expect(row('عنوان b')).not.toHaveAttribute('data-unread');
    expect(within(row('عنوان b')).queryByRole('button', { name: 'تعليم كمقروء' })).not.toBeInTheDocument();
  });

  it('says so when there are no notifications', () => {
    render(<NotificationList items={[]} />);
    expect(screen.getByText('لا توجد إشعارات')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'تعليم الكل كمقروء' })).not.toBeInTheDocument();
  });

  it('marks one read from its button, without leaving the page', async () => {
    render(<NotificationList items={[notification('a')]} />);
    fireEvent.click(within(row('عنوان a')).getByRole('button', { name: 'تعليم كمقروء' }));

    await waitFor(() => expect(refresh).toHaveBeenCalled());
    expect(markNotificationRead).toHaveBeenCalledWith('a');
    expect(push).not.toHaveBeenCalled();
    expect(row('عنوان a')).not.toHaveAttribute('data-unread');
  });

  it('opens an item: marks it read and follows its link', async () => {
    render(<NotificationList items={[notification('a')]} />);
    fireEvent.click(screen.getByRole('button', { name: /عنوان a/ }));

    await waitFor(() => expect(push).toHaveBeenCalledWith('/teacher/profile'));
    expect(markNotificationRead).toHaveBeenCalledWith('a');
  });

  it('marks everything read', async () => {
    render(<NotificationList items={[notification('a'), notification('b')]} />);
    fireEvent.click(screen.getByRole('button', { name: 'تعليم الكل كمقروء' }));

    await waitFor(() => expect(refresh).toHaveBeenCalled());
    expect(markAllNotificationsRead).toHaveBeenCalledTimes(1);
    expect(screen.queryByRole('button', { name: 'تعليم كمقروء' })).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'تعليم الكل كمقروء' })).toBeDisabled();
  });

  it('disables "mark all" when everything is already read', () => {
    render(<NotificationList items={[notification('a', { readAt: '2026-11-10T11:00:00Z' })]} />);
    expect(screen.getByRole('button', { name: 'تعليم الكل كمقروء' })).toBeDisabled();
  });

  it('shows a short message when marking fails', async () => {
    markAllNotificationsRead.mockRejectedValueOnce(new Error('offline'));
    render(<NotificationList items={[notification('a')]} />);
    fireEvent.click(screen.getByRole('button', { name: 'تعليم الكل كمقروء' }));

    expect(await screen.findByText(MARK_ERROR)).toBeInTheDocument();
    expect(row('عنوان a')).toHaveAttribute('data-unread', 'true');
    expect(refresh).not.toHaveBeenCalled();
  });
});
