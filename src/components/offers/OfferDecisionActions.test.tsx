import { beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { createSupabaseMock } from '@/test/supabaseMock';

let mock = createSupabaseMock();
const router = { refresh: vi.fn() };

vi.mock('@/utils/supabase/client', () => ({ createClient: () => mock.client }));
vi.mock('next/navigation', () => ({ useRouter: () => router }));

import OfferDecisionActions from './OfferDecisionActions';

beforeEach(() => {
  mock = createSupabaseMock();
  router.refresh.mockReset();
});

describe('OfferDecisionActions', () => {
  it('accepts after explaining what acceptance does', async () => {
    render(<OfferDecisionActions offerId="o1" />);

    await userEvent.click(screen.getByRole('button', { name: 'قبول العرض' }));
    const dialog = screen.getByRole('dialog');
    expect(dialog).toHaveTextContent('سيُغلق الطلب، وتُرفض باقي العروض');
    expect(mock.rpcCalls).toHaveLength(0);

    await userEvent.click(within(dialog).getByRole('button', { name: 'قبول العرض' }));

    await waitFor(() => expect(router.refresh).toHaveBeenCalled());
    expect(mock.rpcCalls).toEqual([{ fn: 'accept_offer', args: { p_offer_id: 'o1' } }]);
  });

  it('declines after confirmation', async () => {
    render(<OfferDecisionActions offerId="o1" />);

    await userEvent.click(screen.getByRole('button', { name: 'رفض' }));
    await userEvent.click(within(screen.getByRole('dialog')).getByRole('button', { name: 'رفض العرض' }));

    await waitFor(() => expect(router.refresh).toHaveBeenCalled());
    expect(mock.rpcCalls).toEqual([{ fn: 'decline_offer', args: { p_offer_id: 'o1' } }]);
  });

  it('does nothing when cancelled', async () => {
    render(<OfferDecisionActions offerId="o1" />);

    await userEvent.click(screen.getByRole('button', { name: 'قبول العرض' }));
    await userEvent.click(within(screen.getByRole('dialog')).getByRole('button', { name: 'تراجع' }));

    expect(mock.rpcCalls).toHaveLength(0);
  });

  it('explains a refusal inside the dialog (request already closed)', async () => {
    mock.setRpcResult({ error: { code: '23514', message: 'The request is no longer open' } });
    render(<OfferDecisionActions offerId="o1" />);

    await userEvent.click(screen.getByRole('button', { name: 'قبول العرض' }));
    await userEvent.click(within(screen.getByRole('dialog')).getByRole('button', { name: 'قبول العرض' }));

    const alert = await screen.findByText('لم يعد هذا العرض قابلاً للتغيير.');
    expect(screen.getByRole('dialog')).toContainElement(alert);
    expect(router.refresh).not.toHaveBeenCalled();
  });
});
