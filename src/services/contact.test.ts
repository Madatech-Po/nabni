import { beforeEach, describe, expect, it, vi } from 'vitest';
import { createSupabaseMock } from '@/test/supabaseMock';

let mock = createSupabaseMock();
vi.mock('@/utils/supabase/client', () => ({ createClient: () => mock.client }));

import { markContactMessageHandled, submitContactMessage } from './contact';

beforeEach(() => {
  mock = createSupabaseMock();
});

describe('submitContactMessage (NAB-124)', () => {
  it('sends the trimmed fields, with empty optional ones as null', async () => {
    mock.setRpcResult({ data: 'm1' });

    const id = await submitContactMessage({ name: ' منى ', email: '', phone: ' 01001234567 ', subject: '  ', message: ' سؤال عن التسجيل ' });

    expect(id).toBe('m1');
    expect(mock.rpcCalls).toEqual([
      {
        fn: 'submit_contact_message',
        args: { p_name: 'منى', p_email: null, p_phone: '01001234567', p_subject: null, p_message: 'سؤال عن التسجيل' },
      },
    ]);
  });

  it('rethrows database errors for the form to explain', async () => {
    mock.setRpcResult({ error: { code: 'PT429', message: 'contact_rate_limited' } });
    await expect(
      submitContactMessage({ name: 'منى', email: 'a@b.co', phone: '', subject: '', message: 'رسالة طويلة كفاية' })
    ).rejects.toMatchObject({ code: 'PT429', message: 'contact_rate_limited' });
  });
});

describe('markContactMessageHandled (NAB-124)', () => {
  it('marks the message handled through the RPC', async () => {
    mock.setRpcResult({ data: '2026-11-12T10:00:00Z' });

    expect(await markContactMessageHandled('m1')).toBe('2026-11-12T10:00:00Z');
    expect(mock.rpcCalls).toEqual([{ fn: 'mark_contact_message_handled', args: { p_id: 'm1' } }]);
  });

  it('rethrows database errors', async () => {
    mock.setRpcResult({ error: { code: '42501', message: 'Only admins can handle contact messages' } });
    await expect(markContactMessageHandled('m1')).rejects.toMatchObject({ code: '42501' });
  });
});
