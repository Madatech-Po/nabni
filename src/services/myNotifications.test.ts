import { beforeEach, describe, expect, it, vi } from 'vitest';
import { createSupabaseMock } from '@/test/supabaseMock';

let mock = createSupabaseMock();
vi.mock('@/utils/supabase/client', () => ({ createClient: () => mock.client }));

import { markAllNotificationsRead, markNotificationRead } from './myNotifications';

beforeEach(() => {
  mock = createSupabaseMock();
});

describe('markNotificationRead', () => {
  it('marks one notification read through the RPC', async () => {
    await markNotificationRead('n1');
    expect(mock.rpcCalls).toEqual([{ fn: 'mark_notification_read', args: { p_id: 'n1' } }]);
  });

  it('rethrows database errors', async () => {
    mock.setRpcResult({ error: { code: '42501', message: 'permission denied' } });
    await expect(markNotificationRead('n1')).rejects.toMatchObject({ code: '42501' });
  });
});

describe('markAllNotificationsRead', () => {
  it('marks everything read and returns how many rows changed', async () => {
    mock.setRpcResult({ data: 4 });
    expect(await markAllNotificationsRead()).toBe(4);
    expect(mock.rpcCalls).toEqual([{ fn: 'mark_all_notifications_read', args: undefined }]);
  });

  it('returns zero when the RPC gives nothing back', async () => {
    expect(await markAllNotificationsRead()).toBe(0);
  });

  it('rethrows database errors', async () => {
    mock.setRpcResult({ error: { message: 'boom' } });
    await expect(markAllNotificationsRead()).rejects.toMatchObject({ message: 'boom' });
  });
});
