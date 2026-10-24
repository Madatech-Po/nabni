import { beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

const router = { push: vi.fn() };
let params = new URLSearchParams();

vi.mock('next/navigation', () => ({
  useRouter: () => router,
  usePathname: () => '/admin/educators',
  useSearchParams: () => params,
}));

import EducatorReviewFilters from './EducatorReviewFilters';

beforeEach(() => {
  router.push.mockReset();
  params = new URLSearchParams();
});

describe('EducatorReviewFilters', () => {
  it('starts on the pending queue', () => {
    render(<EducatorReviewFilters />);

    expect(screen.getByRole('combobox')).toHaveTextContent('قيد المراجعة');
  });

  it('pushes the chosen status into the URL', async () => {
    render(<EducatorReviewFilters />);

    await userEvent.click(screen.getByRole('combobox'));
    await userEvent.click(within(screen.getByRole('listbox')).getByText('موثق'));

    expect(router.push).toHaveBeenCalledWith('/admin/educators?status=verified');
  });

  it('submits the trimmed search and keeps other filters', async () => {
    params = new URLSearchParams('status=rejected');
    render(<EducatorReviewFilters />);

    await userEvent.type(screen.getByLabelText('بحث بالاسم أو رقم الهاتف'), '  منى ');
    await userEvent.click(screen.getByRole('button', { name: 'بحث' }));

    expect(router.push).toHaveBeenCalledWith(`/admin/educators?status=rejected&q=${encodeURIComponent('منى')}`);
  });

  it('removes the search param when the box is cleared', async () => {
    params = new URLSearchParams('q=old');
    render(<EducatorReviewFilters />);

    await userEvent.clear(screen.getByLabelText('بحث بالاسم أو رقم الهاتف'));
    await userEvent.click(screen.getByRole('button', { name: 'بحث' }));

    expect(router.push).toHaveBeenCalledWith('/admin/educators?');
  });

  it('follows the URL after back/forward navigation (NAB-43)', () => {
    params = new URLSearchParams('q=first');
    const { rerender } = render(<EducatorReviewFilters />);
    expect(screen.getByLabelText('بحث بالاسم أو رقم الهاتف')).toHaveValue('first');

    params = new URLSearchParams('q=second');
    rerender(<EducatorReviewFilters />);

    expect(screen.getByLabelText('بحث بالاسم أو رقم الهاتف')).toHaveValue('second');
  });
});
