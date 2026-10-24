import { beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { createSupabaseMock } from '@/test/supabaseMock';

let mock = createSupabaseMock();
const router = { refresh: vi.fn(), push: vi.fn() };

vi.mock('@/utils/supabase/client', () => ({ createClient: () => mock.client }));
vi.mock('next/navigation', () => ({ useRouter: () => router }));

import RequestModerationActions from './RequestModerationActions';

beforeEach(() => {
  mock = createSupabaseMock();
  router.refresh.mockReset();
});

function buttonNames() {
  return screen.getAllByRole('button').map((b) => b.textContent);
}

describe('RequestModerationActions', () => {
  it.each([
    ['open', ['إغلاق', 'إخفاء']],
    ['closed', ['إعادة الفتح', 'إخفاء']],
    ['cancelled', ['إخفاء']],
    ['removed', ['إلغاء الإخفاء']],
  ] as const)('offers the right actions for a %s request', (status, expected) => {
    render(<RequestModerationActions requestId="r1" status={status} />);

    expect(buttonNames()).toEqual(expected);
  });

  it('hides a request with the given reason', async () => {
    render(<RequestModerationActions requestId="r1" status="open" />);

    await userEvent.click(screen.getByRole('button', { name: 'إخفاء' }));
    await userEvent.type(screen.getByLabelText(/السبب/), 'محتوى مسيء');
    await userEvent.click(screen.getByRole('button', { name: 'تأكيد' }));

    await waitFor(() => expect(router.refresh).toHaveBeenCalled());
    expect(mock.rpcCalls).toEqual([
      { fn: 'set_request_status', args: { p_request_id: 'r1', p_status: 'removed', p_reason: 'محتوى مسيء' } },
    ]);
  });

  it('restores a hidden request as closed', async () => {
    render(<RequestModerationActions requestId="r1" status="removed" />);

    await userEvent.click(screen.getByRole('button', { name: 'إلغاء الإخفاء' }));

    await waitFor(() => expect(router.refresh).toHaveBeenCalled());
    expect(mock.rpcCalls[0]).toEqual({
      fn: 'set_request_status',
      args: { p_request_id: 'r1', p_status: 'closed', p_reason: null },
    });
  });
});
