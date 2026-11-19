import { beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

const resetPasswordForEmail = vi.fn();

vi.mock('@/utils/supabase/client', () => ({ createClient: () => ({ auth: { resetPasswordForEmail } }) }));

import ForgotPasswordForm, { RESET_REQUEST_FAILED, RESET_SENT } from './ForgotPasswordForm';

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

  it('shows the same message for a rate limit, which says nothing about the account', async () => {
    resetPasswordForEmail.mockResolvedValue({
      data: null,
      error: { code: 'over_email_send_rate_limit', message: 'email rate limit exceeded' },
    });
    render(<ForgotPasswordForm />);

    await submit('mona@example.com');

    expect(await screen.findByText(new RegExp(RESET_SENT))).toBeInTheDocument();
  });

  it('when the request throws, says so and keeps the form usable (NAB-140)', async () => {
    resetPasswordForEmail.mockRejectedValueOnce(new TypeError('Failed to fetch'));
    render(<ForgotPasswordForm />);

    await submit('mona@example.com');

    expect(await screen.findByText(RESET_REQUEST_FAILED)).toBeInTheDocument();
    expect(screen.queryByText(new RegExp(RESET_SENT))).not.toBeInTheDocument();
    const button = screen.getByRole('button', { name: 'أرسل رابط إعادة التعيين' });
    expect(button).toBeEnabled();
    expect(screen.getByLabelText(/البريد الإلكتروني/)).toBeEnabled();

    // Trying again once the connection is back sends the link.
    await userEvent.click(button);
    expect(await screen.findByText(new RegExp(RESET_SENT))).toBeInTheDocument();
    expect(resetPasswordForEmail).toHaveBeenCalledTimes(2);
  });

  it('when Supabase returns a network error, says so instead of "sent" (NAB-140)', async () => {
    resetPasswordForEmail.mockResolvedValue({
      data: null,
      error: { name: 'AuthRetryableFetchError', message: '{}', status: 0 },
    });
    render(<ForgotPasswordForm />);

    await submit('mona@example.com');

    expect(await screen.findByText(RESET_REQUEST_FAILED)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'أرسل رابط إعادة التعيين' })).toBeEnabled();
  });
});
