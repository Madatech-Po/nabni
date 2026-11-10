import { beforeEach, describe, expect, it, vi } from 'vitest';
import { argsOf, createSupabaseMock, hasCall } from '@/test/supabaseMock';

let mock = createSupabaseMock();
vi.mock('@/utils/supabase/server', () => ({ createClient: () => mock.client }));

import { getMyNotifications, getMyUnreadCount, NOTIFICATIONS_DEFAULT_LIMIT } from './notifications';

const row = {
  id: 'n1',
  type: 'offer_received',
  title: 'عرض جديد على طلبك',
  body: null,
  link: '/parent/requests/r1',
  data: { offer_id: 'o1' },
  read_at: null,
  created_at: '2026-11-10T10:00:00Z',
};

beforeEach(() => {
  mock = createSupabaseMock();
});

describe('getMyNotifications', () => {
  it('lists notifications newest first with the default limit, mapped to camelCase', async () => {
    mock = createSupabaseMock(() => ({ data: [row, { ...row, id: 'n2', read_at: '2026-11-10T11:00:00Z' }] }));

    const items = await getMyNotifications();

    expect(items).toEqual([
      {
        id: 'n1', type: 'offer_received', title: 'عرض جديد على طلبك', body: null, link: '/parent/requests/r1',
        data: { offer_id: 'o1' }, readAt: null, createdAt: '2026-11-10T10:00:00Z',
      },
      expect.objectContaining({ id: 'n2', readAt: '2026-11-10T11:00:00Z' }),
    ]);
    const query = mock.on('notifications')[0];
    expect(argsOf(query, 'order')).toEqual(['created_at', { ascending: false }]);
    expect(argsOf(query, 'limit')).toEqual([NOTIFICATIONS_DEFAULT_LIMIT]);
    expect(NOTIFICATIONS_DEFAULT_LIMIT).toBe(50);
    expect(hasCall(query, 'is')).toBe(false);
  });

  it('honours a custom limit and the unread-only filter', async () => {
    mock = createSupabaseMock(() => ({ data: [row] }));

    await getMyNotifications({ limit: 10, unreadOnly: true });

    const query = mock.on('notifications')[0];
    expect(argsOf(query, 'limit')).toEqual([10]);
    expect(argsOf(query, 'is')).toEqual(['read_at', null]);
  });

  it('returns an empty list when there is nothing, and defaults missing data to {}', async () => {
    expect(await getMyNotifications()).toEqual([]);
    mock = createSupabaseMock(() => ({ data: [{ ...row, data: null }] }));
    expect((await getMyNotifications())[0].data).toEqual({});
  });

  it('rethrows database errors', async () => {
    mock = createSupabaseMock(() => ({ error: { message: 'permission denied for table notifications' } }));
    await expect(getMyNotifications()).rejects.toMatchObject({ message: expect.stringContaining('permission denied') });
  });
});

describe('getMyUnreadCount', () => {
  it('counts unread rows with a head-only exact count', async () => {
    mock = createSupabaseMock(() => ({ count: 3 }));

    expect(await getMyUnreadCount()).toBe(3);
    const query = mock.on('notifications')[0];
    expect(argsOf(query, 'select')).toEqual(['id', { count: 'exact', head: true }]);
    expect(argsOf(query, 'is')).toEqual(['read_at', null]);
  });

  it('reports a missing count as zero and rethrows errors', async () => {
    expect(await getMyUnreadCount()).toBe(0);
    mock = createSupabaseMock(() => ({ error: { message: 'boom' } }));
    await expect(getMyUnreadCount()).rejects.toMatchObject({ message: 'boom' });
  });
});
