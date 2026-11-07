import { beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { argsOf, createSupabaseMock } from '@/test/supabaseMock';
import { EMPTY_OFFER_FORM } from './offerFormValues';

let mock = createSupabaseMock();
const router = { push: vi.fn(), refresh: vi.fn() };

vi.mock('@/utils/supabase/client', () => ({ createClient: () => mock.client }));
vi.mock('next/navigation', () => ({ useRouter: () => router }));

import OfferForm from './OfferForm';

const units = [{ id: 1, name_ar: 'حصة' }];
const filled = { ...EMPTY_OFFER_FORM, price: '200', pricingUnitId: '1', schedule: 'السبت والثلاثاء مساءً' };

beforeEach(() => {
  mock = createSupabaseMock(() => ({ data: { id: 'o1' } }));
  router.push.mockReset();
});

describe('OfferForm', () => {
  it('shows what is missing and sends nothing', async () => {
    render(<OfferForm requestId="r1" educatorId="e1" pricingUnits={units} />);

    await userEvent.click(screen.getByRole('button', { name: 'إرسال العرض' }));

    expect(screen.getByText('اكتب سعراً أكبر من صفر')).toBeInTheDocument();
    expect(screen.getByText('اختر وحدة السعر')).toBeInTheDocument();
    expect(mock.queries).toHaveLength(0);
  });

  it('sends the offer as this educator on this request', async () => {
    render(<OfferForm requestId="r1" educatorId="e1" pricingUnits={units} initialValues={filled} />);

    await userEvent.type(screen.getByLabelText(/رسالة لولي الأمر/), 'خبرة 5 سنوات');
    await userEvent.click(screen.getByRole('button', { name: 'إرسال العرض' }));

    await waitFor(() => expect(router.push).toHaveBeenCalledWith('/teacher/offers'));
    expect(argsOf(mock.on('offers')[0], 'insert')).toEqual([
      { price: 200, pricing_unit_id: 1, schedule: 'السبت والثلاثاء مساءً', start_date: null, notes: 'خبرة 5 سنوات', request_id: 'r1', educator_id: 'e1' },
    ]);
  });

  it('explains a duplicate offer', async () => {
    mock = createSupabaseMock(() => ({ error: { code: '23505', message: 'duplicate key' } }));
    render(<OfferForm requestId="r1" educatorId="e1" pricingUnits={units} initialValues={filled} />);

    await userEvent.click(screen.getByRole('button', { name: 'إرسال العرض' }));

    expect(await screen.findByText('لديك عرض قائم على هذا الطلب بالفعل.')).toBeInTheDocument();
    expect(router.push).not.toHaveBeenCalled();
  });

  it('explains a refusal by the database (unverified educator or closed request)', async () => {
    mock = createSupabaseMock(() => ({ error: { code: '42501', message: 'row-level security' } }));
    render(<OfferForm requestId="r1" educatorId="e1" pricingUnits={units} initialValues={filled} />);

    await userEvent.click(screen.getByRole('button', { name: 'إرسال العرض' }));

    expect(await screen.findByText(/يجب أن يكون حسابك موثقاً/)).toBeInTheDocument();
  });

  it('updates instead of inserting when editing, and cancels back to my offers', async () => {
    mock = createSupabaseMock(() => ({ data: [{ id: 'o1' }] }));
    render(<OfferForm requestId="r1" educatorId="e1" pricingUnits={units} offerId="o1" initialValues={filled} />);

    expect(screen.getByRole('link', { name: 'إلغاء' })).toHaveAttribute('href', '/teacher/offers');
    await userEvent.click(screen.getByRole('button', { name: 'حفظ التعديلات' }));

    await waitFor(() => expect(router.push).toHaveBeenCalledWith('/teacher/offers'));
    const [query] = mock.on('offers');
    expect(argsOf(query, 'update')).toBeDefined();
    expect(argsOf(query, 'eq')).toEqual(['id', 'o1']);
  });
});
