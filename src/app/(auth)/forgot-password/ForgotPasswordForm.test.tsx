import { beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

const resetPasswordForEmail = vi.fn();

vi.mock('@/utils/supabase/client', () => ({ createClient: () => ({ auth: { resetPasswordForEmail } }) }));

import ForgotPasswordForm, { RESET_SENT } from './ForgotPasswordForm';

async function submit(email: string) {
  if (email) await userEvent.type(screen.getByLabelText(/البريد الإلكتروني/), email);
  await userEvent.click(screen.getByRole('button', { name: 'أرسل رابط إعادة التعيين' }));
}

beforeEach(() => {
  resetPasswordForEmail.mockReset().mockResolvedValue({ data: {}, error: null });
});

describe('ForgotPasswordForm', () => {
  it('keeps the email left-to-right (NAB-137)', () => {
    render(<ForgotPasswordForm />);

    expect(screen.getByLabelText(/البريد الإلكتروني/)).toHaveAttribute('dir', 'ltr');
  });

  it('asks for an email and sends nothing', async () => {
    render(<ForgotPasswordForm />);

    await submit('');

    expect(screen.getByText('اكتب البريد الإلكتروني')).toBeInTheDocument();
    expect(resetPasswordForEmail).not.toHaveBeenCalled();
  });

  it('explains a badly shaped or Arabic-keyboard email', async () => {
    render(<ForgotPasswordForm />);

    await submit('mona');
    expect(screen.getByText(/البريد الإلكتروني غير صحيح/)).toBeInTheDocument();

    await userEvent.clear(screen.getByLabelText(/البريد الإلكتروني/));
    await submit('سشينش');
    expect(screen.getByText(/مكتوب بحروف عربية/)).toBeInTheDocument();
    expect(resetPasswordForEmail).not.toHaveBeenCalled();
  });

  it('sends the reset link through /auth/confirm and shows the generic message', async () => {
    render(<ForgotPasswordForm />);

    await submit(' mona@example.com ');

    expect(await screen.findByText(new RegExp(RESET_SENT))).toBeInTheDocument();
    expect(resetPasswordForEmail).toHaveBeenCalledWith('mona@example.com', {
      redirectTo: `${window.location.origin}/auth/confirm?type=recovery&next=/reset-password`,
    });
  });

  it('shows the same message when Supabase returns an error', async () => {
    resetPasswordForEmail.mockResolvedValue({ data: null, error: { code: 'user_not_found', message: 'User not found' } });
    render(<ForgotPasswordForm />);

    await submit('nobody@example.com');

    expect(await screen.findByText(new RegExp(RESET_SENT))).toBeInTheDocument();
    expect(screen.queryByText(/not found/i)).not.toBeInTheDocument();
  });

  it('shows the same message when the request throws', async () => {
    resetPasswordForEmail.mockRejectedValue(new Error('network down'));
    render(<ForgotPasswordForm />);

    await submit('mona@example.com');

    expect(await screen.findByText(new RegExp(RESET_SENT))).toBeInTheDocument();
  });
});
