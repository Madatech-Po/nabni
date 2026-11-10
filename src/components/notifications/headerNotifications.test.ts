import { beforeEach, describe, expect, it, vi } from 'vitest';

const getMyUnreadCount = vi.fn();
const getMyNotifications = vi.fn();
vi.mock('@/services/notifications', () => ({
  getMyUnreadCount: () => getMyUnreadCount(),
  getMyNotifications: (opts: unknown) => getMyNotifications(opts),
}));

import { BELL_LIMIT, getHeaderNotifications } from './headerNotifications';

beforeEach(() => {
  getMyUnreadCount.mockReset();
  getMyNotifications.mockReset();
});

describe('getHeaderNotifications (NAB-107)', () => {
  it('reads the unread count and the latest few', async () => {
    getMyUnreadCount.mockResolvedValue(4);
    getMyNotifications.mockResolvedValue([{ id: 'a' }]);

    expect(await getHeaderNotifications()).toEqual({ unreadCount: 4, items: [{ id: 'a' }] });
    expect(getMyNotifications).toHaveBeenCalledWith({ limit: BELL_LIMIT });
    expect(BELL_LIMIT).toBe(5);
  });

  it('falls back to an empty bell when a read fails', async () => {
    getMyUnreadCount.mockRejectedValue(new Error('offline'));
    getMyNotifications.mockResolvedValue([{ id: 'a' }]);

    expect(await getHeaderNotifications()).toEqual({ unreadCount: 0, items: [] });
  });
});
