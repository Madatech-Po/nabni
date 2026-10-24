import { beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { argsOf, createSupabaseMock } from '@/test/supabaseMock';

let mock = createSupabaseMock();
const router = { refresh: vi.fn() };

vi.mock('@/utils/supabase/client', () => ({ createClient: () => mock.client }));
vi.mock('next/navigation', () => ({ useRouter: () => router }));

import MyRequestActions from './MyRequestActions';

beforeEach(() => {
  mock = createSupabaseMock(() => ({ data: [{ id: 'r1' }] }));
  router.refresh.mockReset();
});

function buttonNames() {
  return screen.queryAllByRole('button').map((b) => b.textContent);
}

describe('MyRequestActions', () => {
  it.each([
    ['open', ['إغلاق الطلب', 'إلغاء الطلب']],
    ['closed', ['إعادة فتح']],
    ['cancelled', ['إعادة فتح']],
  ] as const)('offers edit plus the right status changes for a %s request', (status, expected) => {
    render(<MyRequestActions requestId="r1" status={status} />);

    expect(screen.getByRole('link', { name: 'تعديل' })).toHaveAttribute('href', '/parent/requests/r1/edit');
    expect(buttonNames()).toEqual(expected);
  });

  it('locks a request the admins removed and explains why', () => {
    render(<MyRequestActions requestId="r1" status="removed" />);

    expect(screen.getByText('مخفي بواسطة الإدارة')).toBeInTheDocument();
    expect(screen.getByText(/أخفت إدارة نبني هذا الطلب/)).toBeInTheDocument();
    expect(screen.queryByRole('link', { name: 'تعديل' })).not.toBeInTheDocument();
    expect(buttonNames()).toEqual([]);
  });

  it('closes the request and refreshes the list', async () => {
    render(<MyRequestActions requestId="r1" status="open" />);

    await userEvent.click(screen.getByRole('button', { name: 'إغلاق الطلب' }));

    await waitFor(() => expect(router.refresh).toHaveBeenCalled());
    expect(argsOf(mock.on('requests')[0], 'update')).toEqual([{ status: 'closed' }]);
  });

  it('shows why a change was refused', async () => {
    mock = createSupabaseMock(() => ({ data: [] }));
    render(<MyRequestActions requestId="r1" status="closed" />);

    await userEvent.click(screen.getByRole('button', { name: 'إعادة فتح' }));

    expect(await screen.findByText('لا يمكن تعديل هذا الطلب.')).toBeInTheDocument();
    expect(router.refresh).not.toHaveBeenCalled();
  });
});
