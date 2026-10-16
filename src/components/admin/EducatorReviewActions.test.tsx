import { beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { createSupabaseMock } from '@/test/supabaseMock';

let mock = createSupabaseMock();
const router = { refresh: vi.fn(), push: vi.fn() };

vi.mock('@/utils/supabase/client', () => ({ createClient: () => mock.client }));
vi.mock('next/navigation', () => ({ useRouter: () => router }));

import EducatorReviewActions from './EducatorReviewActions';

beforeEach(() => {
  mock = createSupabaseMock();
  router.refresh.mockReset();
});

function buttonNames() {
  return screen.getAllByRole('button').map((b) => b.textContent);
}

describe('EducatorReviewActions', () => {
  it.each([
    ['pending', ['توثيق', 'رفض']],
    ['verified', ['إيقاف']],
    ['rejected', ['توثيق']],
    ['suspended', ['إعادة التفعيل']],
  ] as const)('offers the right actions for a %s educator', (status, expected) => {
    render(<EducatorReviewActions educatorId="e1" status={status} />);

    expect(buttonNames()).toEqual(expected);
  });

  it('verifies straight away and refreshes the list', async () => {
    render(<EducatorReviewActions educatorId="e1" status="pending" />);

    await userEvent.click(screen.getByRole('button', { name: 'توثيق' }));

    await waitFor(() => expect(router.refresh).toHaveBeenCalled());
    expect(mock.rpcCalls).toEqual([
      { fn: 'set_educator_verification', args: { p_educator_id: 'e1', p_status: 'verified', p_reason: null } },
    ]);
  });

  it('asks for a reason before rejecting and sends it trimmed', async () => {
    render(<EducatorReviewActions educatorId="e1" status="pending" />);

    await userEvent.click(screen.getByRole('button', { name: 'رفض' }));
    expect(mock.rpcCalls).toHaveLength(0);

    await userEvent.type(screen.getByLabelText(/السبب/), '  بيانات ناقصة  ');
    await userEvent.click(screen.getByRole('button', { name: 'تأكيد' }));

    await waitFor(() => expect(router.refresh).toHaveBeenCalled());
    expect(mock.rpcCalls[0]).toEqual({
      fn: 'set_educator_verification',
      args: { p_educator_id: 'e1', p_status: 'rejected', p_reason: 'بيانات ناقصة' },
    });
  });

  it('does nothing when the reason dialog is cancelled', async () => {
    render(<EducatorReviewActions educatorId="e1" status="verified" />);

    await userEvent.click(screen.getByRole('button', { name: 'إيقاف' }));
    await userEvent.click(screen.getByRole('button', { name: 'إلغاء' }));

    expect(mock.rpcCalls).toHaveLength(0);
    expect(router.refresh).not.toHaveBeenCalled();
  });

  it('shows the database error and keeps the list as is', async () => {
    mock.setRpcResult({ error: { message: 'Only admins can change educator verification status' } });
    render(<EducatorReviewActions educatorId="e1" status="pending" />);

    await userEvent.click(screen.getByRole('button', { name: 'توثيق' }));

    expect(await screen.findByRole('alert')).toHaveTextContent('Only admins can change educator verification status');
    expect(router.refresh).not.toHaveBeenCalled();
  });
});
