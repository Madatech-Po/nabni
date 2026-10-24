import { beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { createSupabaseMock } from '@/test/supabaseMock';

let mock = createSupabaseMock();
const router = { refresh: vi.fn(), push: vi.fn() };

vi.mock('@/utils/supabase/client', () => ({ createClient: () => mock.client }));
vi.mock('next/navigation', () => ({ useRouter: () => router }));

import ParentAccountActions from './ParentAccountActions';

beforeEach(() => {
  mock = createSupabaseMock();
  router.refresh.mockReset();
});

describe('ParentAccountActions', () => {
  it('suspends an active parent only after a reason is given', async () => {
    render(<ParentAccountActions userId="p1" active />);

    await userEvent.click(screen.getByRole('button', { name: 'إيقاف الحساب' }));
    expect(mock.rpcCalls).toHaveLength(0);

    await userEvent.type(screen.getByLabelText(/السبب/), 'spam');
    await userEvent.click(screen.getByRole('button', { name: 'تأكيد' }));

    await waitFor(() => expect(router.refresh).toHaveBeenCalled());
    expect(mock.rpcCalls).toEqual([
      { fn: 'set_profile_active', args: { p_user_id: 'p1', p_active: false, p_reason: 'spam' } },
    ]);
  });

  it('reactivates a suspended parent straight away', async () => {
    render(<ParentAccountActions userId="p1" active={false} />);

    await userEvent.click(screen.getByRole('button', { name: 'إعادة التفعيل' }));

    await waitFor(() => expect(router.refresh).toHaveBeenCalled());
    expect(mock.rpcCalls).toEqual([
      { fn: 'set_profile_active', args: { p_user_id: 'p1', p_active: true, p_reason: null } },
    ]);
  });

  it('shows the database error', async () => {
    mock.setRpcResult({ error: { message: 'Only parent accounts can be suspended here' } });
    render(<ParentAccountActions userId="p1" active={false} />);

    await userEvent.click(screen.getByRole('button', { name: 'إعادة التفعيل' }));

    expect(await screen.findByRole('alert')).toHaveTextContent('Only parent accounts can be suspended here');
    expect(router.refresh).not.toHaveBeenCalled();
  });
});
