import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import ContactCard from './ContactCard';

describe('ContactCard', () => {
  it('shows the name, number, call and WhatsApp links (preferring the WhatsApp number)', () => {
    render(<ContactCard title="تواصل" contact={{ full_name: 'منى', phone: '01012345678', whatsapp_number: '01112345678' }} />);

    expect(screen.getByText('منى')).toBeInTheDocument();
    expect(screen.getByText('01012345678')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'اتصال' })).toHaveAttribute('href', 'tel:01012345678');
    expect(screen.getByRole('link', { name: 'واتساب' })).toHaveAttribute('href', 'https://wa.me/201112345678');
  });

  it('copes with a parent who has no phone yet', () => {
    render(<ContactCard title="تواصل" contact={{ full_name: 'أحمد', phone: null, whatsapp_number: null }} />);

    expect(screen.getByText('لم يضف رقم هاتف بعد.')).toBeInTheDocument();
    expect(screen.queryByRole('link')).not.toBeInTheDocument();
  });

  it('says so when no contact came back', () => {
    render(<ContactCard title="تواصل" contact={null} />);

    expect(screen.getByText('لا تتوفر بيانات تواصل حالياً.')).toBeInTheDocument();
  });
});
