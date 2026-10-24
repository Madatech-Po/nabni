import { beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { argsOf, createSupabaseMock } from '@/test/supabaseMock';
import { EMPTY_REQUEST_FORM, type RequestFormValues } from './requestFormValues';

let mock = createSupabaseMock();
const router = { push: vi.fn(), refresh: vi.fn(), back: vi.fn() };

vi.mock('@/utils/supabase/client', () => ({ createClient: () => mock.client }));
vi.mock('next/navigation', () => ({ useRouter: () => router }));

import RequestForm from './RequestForm';

const lookups = {
  services: [{ id: 4, name_ar: 'تأسيس عربي', slug: 'arabic' }],
  levels: [{ id: 1, name_ar: 'من 4 إلى 5 سنوات', min_age: 4, max_age: 5 }],
  places: [{ id: 1, name_ar: 'منزل ولي الأمر' }],
  governorates: [{ id: 2, name_ar: 'القاهرة' }],
  pricingUnits: [{ id: 1, name_ar: 'حصة' }],
};

const filled: RequestFormValues = {
  ...EMPTY_REQUEST_FORM,
  serviceCategoryId: '4',
  teachingPlaceId: '1',
  governorateId: '2',
  studentAge: '5',
  description: 'نحتاج معلمة لتأسيس القراءة والكتابة باللغة العربية لطفل في الخامسة',
};

beforeEach(() => {
  mock = createSupabaseMock(() => ({ data: { id: 'r1' } }));
  router.push.mockReset();
  router.refresh.mockReset();
});

describe('RequestForm', () => {
  it('cancels back to "my requests", even on a direct visit', () => {
    render(<RequestForm lookups={lookups} parentId="p1" />);

    expect(screen.getByRole('link', { name: 'إلغاء' })).toHaveAttribute('href', '/parent/requests');
  });

  it('shows what is missing and saves nothing', async () => {
    render(<RequestForm lookups={lookups} parentId="p1" />);

    await userEvent.click(screen.getByRole('button', { name: 'نشر الطلب' }));

    expect(screen.getByText('اختر الخدمة')).toBeInTheDocument();
    expect(screen.getByText('عمر الطفل من 2 إلى 15 سنة')).toBeInTheDocument();
    expect(mock.queries).toHaveLength(0);
  });

  it('asks for a pricing unit once a budget is typed', async () => {
    render(<RequestForm lookups={lookups} parentId="p1" initialValues={filled} />);

    await userEvent.type(screen.getByLabelText(/الميزانية/), '150');
    await userEvent.click(screen.getByRole('button', { name: 'نشر الطلب' }));

    expect(screen.getByText('اختر وحدة السعر (حصة، شهر...)')).toBeInTheDocument();
    expect(mock.queries).toHaveLength(0);
  });

  it('posts a valid request and opens "my requests"', async () => {
    render(<RequestForm lookups={lookups} parentId="p1" initialValues={filled} />);

    await userEvent.type(screen.getByLabelText(/المنطقة/), 'المعادي');
    await userEvent.click(screen.getByRole('button', { name: 'نشر الطلب' }));

    await waitFor(() => expect(router.push).toHaveBeenCalledWith('/parent/requests'));
    expect(argsOf(mock.on('requests')[0], 'insert')).toEqual([
      expect.objectContaining({ parent_id: 'p1', service_category_id: 4, student_age: 5, area: 'المعادي', budget: null }),
    ]);
  });

  it('updates instead of inserting when editing', async () => {
    mock = createSupabaseMock(() => ({ data: [{ id: 'r1' }] }));
    render(<RequestForm lookups={lookups} parentId="p1" requestId="r1" initialValues={filled} />);

    await userEvent.click(screen.getByRole('button', { name: 'حفظ التعديلات' }));

    await waitFor(() => expect(router.push).toHaveBeenCalledWith('/parent/requests'));
    const [query] = mock.on('requests');
    expect(argsOf(query, 'update')).toBeDefined();
    expect(argsOf(query, 'eq')).toEqual(['id', 'r1']);
  });

  it('shows other database errors as they come', async () => {
    mock = createSupabaseMock(() => ({ error: { code: '23514', message: 'violates check constraint' } }));
    render(<RequestForm lookups={lookups} parentId="p1" initialValues={filled} />);

    await userEvent.click(screen.getByRole('button', { name: 'نشر الطلب' }));

    expect(await screen.findByText('violates check constraint')).toBeInTheDocument();
  });

  it('keeps the form and explains a permission refusal', async () => {
    mock = createSupabaseMock(() => ({ error: { code: '42501', message: 'new row violates row-level security policy' } }));
    render(<RequestForm lookups={lookups} parentId="p1" initialValues={filled} />);

    await userEvent.click(screen.getByRole('button', { name: 'نشر الطلب' }));

    expect(await screen.findByText('لا يمكن حفظ الطلب. تأكد أن حسابك حساب ولي أمر مفعّل.')).toBeInTheDocument();
    expect(router.push).not.toHaveBeenCalled();
    expect(screen.getByRole('button', { name: 'نشر الطلب' })).toBeEnabled();
  });
});
