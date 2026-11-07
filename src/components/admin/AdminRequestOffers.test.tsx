import { beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { createSupabaseMock } from '@/test/supabaseMock';
import type { AdminOfferItem } from '@/services/admin';

let mock = createSupabaseMock();
const router = { refresh: vi.fn() };

vi.mock('@/utils/supabase/client', () => ({ createClient: () => mock.client }));
vi.mock('next/navigation', () => ({ useRouter: () => router }));

import AdminRequestOffers from './AdminRequestOffers';

const offer = (id: string, status: AdminOfferItem['status'], created_at: string): AdminOfferItem => ({
  id, status, created_at, price: 200, educator: { full_name: `معلم ${id}` }, pricing_unit: { name_ar: 'حصة' },
});

beforeEach(() => {
  mock = createSupabaseMock();
  router.refresh.mockReset();
});

describe('AdminRequestOffers', () => {
  it('says when a request has no offers', () => {
    render(<AdminRequestOffers offers={[]} />);

    expect(screen.getByText('لا توجد عروض على هذا الطلب.')).toBeInTheDocument();
  });

  it('lists offers oldest first and lets admins remove only pending or accepted ones', () => {
    render(
      <AdminRequestOffers
        offers={[
          offer('b', 'accepted', '2026-11-02T10:00:00Z'),
          offer('a', 'pending', '2026-11-01T10:00:00Z'),
          offer('c', 'declined', '2026-11-03T10:00:00Z'),
        ]}
      />
    );

    expect(screen.getByText('العروض (3)')).toBeInTheDocument();
    const names = screen.getAllByText(/^معلم /).map((el) => el.textContent);
    expect(names).toEqual(['معلم a', 'معلم b', 'معلم c']);
    expect(screen.getAllByRole('button', { name: 'إزالة العرض' })).toHaveLength(2);
  });

  it('removes an offer with the reason, without sending a status argument', async () => {
    render(<AdminRequestOffers offers={[offer('a', 'pending', '2026-11-01T10:00:00Z')]} />);

    await userEvent.click(screen.getByRole('button', { name: 'إزالة العرض' }));
    const dialog = screen.getByRole('dialog');
    expect(within(dialog).getByRole('button', { name: 'تأكيد' })).toBeDisabled();
    await userEvent.type(within(dialog).getByLabelText(/السبب/), 'محتوى مسيء');
    await userEvent.click(within(dialog).getByRole('button', { name: 'تأكيد' }));

    await waitFor(() => expect(router.refresh).toHaveBeenCalled());
    expect(mock.rpcCalls).toEqual([{ fn: 'remove_offer', args: { p_offer_id: 'a', p_reason: 'محتوى مسيء' } }]);
  });
});
