import { beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { createSupabaseMock } from '@/test/supabaseMock';

let mock = createSupabaseMock();
const router = { refresh: vi.fn() };

vi.mock('@/utils/supabase/client', () => ({ createClient: () => mock.client }));
vi.mock('next/navigation', () => ({ useRouter: () => router }));

import MyOfferActions from './MyOfferActions';

beforeEach(() => {
  mock = createSupabaseMock();
  router.refresh.mockReset();
});

describe('MyOfferActions', () => {
  it('links to the edit page', () => {
    render(<MyOfferActions offerId="o1" />);

    expect(screen.getByRole('link', { name: 'تعديل العرض' })).toHaveAttribute('href', '/teacher/offers/o1/edit');
  });

  it('does nothing when the confirmation is cancelled', async () => {
    render(<MyOfferActions offerId="o1" />);

    await userEvent.click(screen.getByRole('button', { name: 'سحب العرض' }));
    await userEvent.click(within(screen.getByRole('dialog')).getByRole('button', { name: 'تراجع' }));

    expect(mock.rpcCalls).toHaveLength(0);
  });

  it('withdraws once after confirmation', async () => {
    render(<MyOfferActions offerId="o1" />);

    await userEvent.click(screen.getByRole('button', { name: 'سحب العرض' }));
    await userEvent.click(within(screen.getByRole('dialog')).getByRole('button', { name: 'سحب العرض' }));

    await waitFor(() => expect(router.refresh).toHaveBeenCalled());
    expect(mock.rpcCalls).toEqual([{ fn: 'withdraw_offer', args: { p_offer_id: 'o1' } }]);
  });

  it('shows why a withdrawal was refused inside the dialog', async () => {
    mock.setRpcResult({ error: { code: '23514', message: 'Only pending offers can be withdrawn' } });
    render(<MyOfferActions offerId="o1" />);

    await userEvent.click(screen.getByRole('button', { name: 'سحب العرض' }));
    await userEvent.click(within(screen.getByRole('dialog')).getByRole('button', { name: 'سحب العرض' }));

    const alert = await screen.findByText('لم يعد هذا العرض قابلاً للتغيير.');
    expect(screen.getByRole('dialog')).toContainElement(alert);
    expect(router.refresh).not.toHaveBeenCalled();
  });
});
