import { beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

const push = vi.fn();
let params = new URLSearchParams();
vi.mock('next/navigation', () => ({
  useRouter: () => ({ push }),
  usePathname: () => '/educators',
  useSearchParams: () => params,
}));
vi.mock('@/services/lookups', () => ({
  getGovernorates: async () => [{ id: 2, name_ar: 'الجيزة' }],
  getServiceCategories: async () => [{ id: 7, name_ar: 'تخاطب', slug: 'speech-therapy' }],
}));

import TutorFilters from './TutorFilters';

beforeEach(() => {
  push.mockReset();
  params = new URLSearchParams();
});

describe('TutorFilters search term (NAB-130)', () => {
  it('shows the search term from the URL', () => {
    params = new URLSearchParams({ q: 'منى' });
    render(<TutorFilters />);

    expect(screen.getByText('البحث: منى')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'مسح الفلاتر' })).toBeInTheDocument();
  });

  it('removes only the search term and keeps the other filters', async () => {
    params = new URLSearchParams({ q: 'منى', subject: '7' });
    render(<TutorFilters />);

    await userEvent.click(screen.getByTestId('CancelIcon'));

    expect(push).toHaveBeenCalledWith('/educators?subject=7');
  });

  it('goes back to the plain directory when the term was the only filter', async () => {
    params = new URLSearchParams({ q: 'منى' });
    render(<TutorFilters />);

    await userEvent.click(screen.getByTestId('CancelIcon'));

    expect(push).toHaveBeenCalledWith('/educators');
  });

  it('shows no term and no clear button without filters', () => {
    render(<TutorFilters />);

    expect(screen.queryByText(/البحث:/)).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'مسح الفلاتر' })).not.toBeInTheDocument();
  });
});
