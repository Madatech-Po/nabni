import { beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

const getUser = vi.fn();
const updateUser = vi.fn();
const router = { push: vi.fn(), refresh: vi.fn() };

vi.mock('@/utils/supabase/client', () => ({ createClient: () => ({ auth: { getUser, updateUser } }) }));
vi.mock('next/navigation', () => ({ useRouter: () => router }));

import ResetPasswordForm, { MISMATCH } from './ResetPasswordForm';

async function fill(password: string, confirm: string) {
  if (password) await userEvent.type(await screen.findByLabelText(/^كلمة المرور الجديدة/), password);
  if (confirm) await userEvent.type(screen.getByLabelText(/^تأكيد كلمة المرور/), confirm);
  await userEvent.click(screen.getByRole('button', { name: 'حفظ كلمة المرور' }));
}

beforeEach(() => {
  getUser.mockReset().mockResolvedValue({ data: { user: { id: 'u1' } }, error: null });
  updateUser.mockReset().mockResolvedValue({ data: { user: { id: 'u1' } }, error: null });
  router.push.mockReset();
  router.refresh.mockReset();
});

describe('ResetPasswordForm', () => {
  it('without a session, says to open the email link and offers a new one', async () => {
    getUser.mockResolvedValue({ data: { user: null }, error: { message: 'Auth session missing!' } });
    render(<ResetPasswordForm />);

    expect(await screen.findByText(/افتح الرابط من رسالة البريد/)).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'اطلب رابطاً جديداً' })).toHaveAttribute('href', '/forgot-password');
    expect(screen.queryByRole('button', { name: 'حفظ كلمة المرور' })).not.toBeInTheDocument();
  });

  it('refuses a short password', async () => {
    render(<ResetPasswordForm />);

    await fill('abc', 'abc');

    expect(screen.getByText(/كلمة المرور 6 أحرف على الأقل \(3\/6\)/)).toBeInTheDocument();
    expect(updateUser).not.toHaveBeenCalled();
  });

  it('refuses passwords that do not match', async () => {
    render(<ResetPasswordForm />);

    await fill('secret1', 'secret2');

    expect(screen.getByText(MISMATCH)).toBeInTheDocument();
    expect(updateUser).not.toHaveBeenCalled();
  });

  it('asks to repeat the password', async () => {
    render(<ResetPasswordForm />);

    await fill('secret1', '');

    expect(screen.getByText('أعد كتابة كلمة المرور')).toBeInTheDocument();
    expect(updateUser).not.toHaveBeenCalled();
  });

  it('saves the new password and goes to the dashboard', async () => {
    render(<ResetPasswordForm />);

    await fill('secret1', 'secret1');

    expect(updateUser).toHaveBeenCalledWith({ password: 'secret1' });
    await vi.waitFor(() => expect(router.push).toHaveBeenCalledWith('/dashboard'));
  });

  it('shows Supabase errors in Arabic and stays on the page', async () => {
    updateUser.mockResolvedValue({
      data: { user: null },
      error: { code: 'same_password', message: 'New password should be different from the old password.' },
    });
    render(<ResetPasswordForm />);

    await fill('secret1', 'secret1');

    expect(await screen.findByText(/يجب أن تختلف عن القديمة/)).toBeInTheDocument();
    expect(router.push).not.toHaveBeenCalled();
  });
});
