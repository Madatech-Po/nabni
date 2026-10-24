import { beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

const router = { push: vi.fn() };
let params = new URLSearchParams();

vi.mock('next/navigation', () => ({
  useRouter: () => router,
  usePathname: () => '/admin/parents',
  useSearchParams: () => params,
}));

import AdminPagination from './AdminPagination';

beforeEach(() => {
  router.push.mockReset();
  params = new URLSearchParams();
});

describe('AdminPagination', () => {
  it('shows the total and hides page buttons when everything fits', () => {
    render(<AdminPagination total={5} pageSize={20} />);

    expect(screen.getByText('الإجمالي: 5')).toBeInTheDocument();
    expect(screen.queryByRole('navigation')).not.toBeInTheDocument();
  });

  it('keeps the filters when moving to another page', async () => {
    params = new URLSearchParams('status=suspended');
    render(<AdminPagination total={45} pageSize={20} />);

    await userEvent.click(screen.getByRole('button', { name: 'Go to page 3' }));

    expect(router.push).toHaveBeenCalledWith('/admin/parents?status=suspended&page=3');
  });

  it('drops the page param when going back to page 1', async () => {
    params = new URLSearchParams('page=2');
    render(<AdminPagination total={45} pageSize={20} />);

    await userEvent.click(screen.getByRole('button', { name: 'Go to page 1' }));

    expect(router.push).toHaveBeenCalledWith('/admin/parents?');
  });
});
