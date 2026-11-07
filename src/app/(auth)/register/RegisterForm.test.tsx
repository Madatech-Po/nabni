import { beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

const signUp = vi.fn();
const router = { push: vi.fn(), refresh: vi.fn() };

vi.mock('@/utils/supabase/client', () => ({ createClient: () => ({ auth: { signUp } }) }));
vi.mock('next/navigation', () => ({
  useRouter: () => router,
  useSearchParams: () => new URLSearchParams(),
}));

import RegisterForm from './RegisterForm';

async function fill(email: string, password: string) {
  await userEvent.type(screen.getByLabelText(/الاسم الأول/), 'منى');
  await userEvent.type(screen.getByLabelText(/الاسم الأخير/), 'أحمد');
  await userEvent.type(screen.getByLabelText(/البريد الإلكتروني/), email);
  await userEvent.type(screen.getByLabelText(/كلمة المرور/), password);
  await userEvent.click(screen.getByRole('button', { name: 'إنشاء حساب' }));
}

beforeEach(() => {
  signUp.mockReset();
  router.push.mockReset();
  router.refresh.mockReset();
});

describe('RegisterForm', () => {
  it('shows Arabic messages under the fields and sends nothing', async () => {
    render(<RegisterForm />);

    await userEvent.click(screen.getByRole('button', { name: 'إنشاء حساب' }));

    expect(screen.getByText('اكتب الاسم الأول')).toBeInTheDocument();
    expect(screen.getByText('اكتب البريد الإلكتروني')).toBeInTheDocument();
    expect(screen.getByText('اكتب كلمة المرور')).toBeInTheDocument();
    expect(signUp).not.toHaveBeenCalled();
  });

  it('explains an email typed with the Arabic keyboard', async () => {
    render(<RegisterForm />);

    await fill('سشينشكينك', 'secret1');

    expect(screen.getByText(/البريد الإلكتروني مكتوب بحروف عربية/)).toBeInTheDocument();
    expect(signUp).not.toHaveBeenCalled();
  });

  it('keeps email and password left-to-right', () => {
    render(<RegisterForm />);

    expect(screen.getByLabelText(/البريد الإلكتروني/)).toHaveAttribute('dir', 'ltr');
    expect(screen.getByLabelText(/كلمة المرور/)).toHaveAttribute('dir', 'ltr');
  });

  it('shows Supabase errors in Arabic', async () => {
    signUp.mockResolvedValue({ data: {}, error: { code: 'user_already_exists', message: 'User already registered' } });
    render(<RegisterForm />);

    await fill('mona@example.com', 'secret1');

    expect(await screen.findByText(/هذا البريد مسجّل بالفعل/)).toBeInTheDocument();
    expect(router.push).not.toHaveBeenCalled();
  });

  it('asks to confirm the email when sign-up returns no session', async () => {
    signUp.mockResolvedValue({ data: { user: { id: 'u1' }, session: null }, error: null });
    render(<RegisterForm />);

    await fill(' mona@example.com ', 'secret1');

    expect(await screen.findByText(/أرسلنا رسالة تأكيد إلى mona@example.com/)).toBeInTheDocument();
    expect(signUp).toHaveBeenCalledWith(expect.objectContaining({ email: 'mona@example.com', password: 'secret1' }));
    expect(router.push).not.toHaveBeenCalled();
  });

  it('goes to the dashboard when sign-up logs the user in', async () => {
    signUp.mockResolvedValue({ data: { user: { id: 'u1' }, session: { access_token: 't' } }, error: null });
    render(<RegisterForm />);

    await fill('mona@example.com', 'secret1');

    await vi.waitFor(() => expect(router.push).toHaveBeenCalledWith('/dashboard'));
  });
});
