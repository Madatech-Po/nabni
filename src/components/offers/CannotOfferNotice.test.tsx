import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import CannotOfferNotice from './CannotOfferNotice';

describe('CannotOfferNotice', () => {
  it.each(['rejected', 'suspended'] as const)('shows the admin reason for a %s educator (NAB-97)', (reason) => {
    render(<CannotOfferNotice reason={reason} note="  الصورة غير واضحة  " />);

    expect(screen.getByText('سبب القرار:')).toBeInTheDocument();
    expect(screen.getByText(/الصورة غير واضحة/)).toBeInTheDocument();
  });

  it('falls back to the generic text without a reason', () => {
    render(<CannotOfferNotice reason="rejected" note={null} />);

    expect(screen.getByText('لم يتم توثيق ملفك')).toBeInTheDocument();
    expect(screen.queryByText('سبب القرار:')).not.toBeInTheDocument();
  });

  it('ignores a blank reason', () => {
    render(<CannotOfferNotice reason="suspended" note="   " />);

    expect(screen.queryByText('سبب القرار:')).not.toBeInTheDocument();
  });

  it('never shows a reason while pending, even if one is passed', () => {
    render(<CannotOfferNotice reason="pending" note="سبب سابق" />);

    expect(screen.getByText('ملفك قيد المراجعة')).toBeInTheDocument();
    expect(screen.queryByText(/سبب سابق/)).not.toBeInTheDocument();
  });

  it('sends a rejected educator to their profile and others to contact', () => {
    const { unmount } = render(<CannotOfferNotice reason="rejected" />);
    expect(screen.getByRole('link', { name: 'ملفي الشخصي' })).toHaveAttribute('href', '/teacher/profile');
    unmount();

    render(<CannotOfferNotice reason="suspended" />);
    expect(screen.getByRole('link', { name: 'تواصل معنا' })).toHaveAttribute('href', '/contact');
  });
});
