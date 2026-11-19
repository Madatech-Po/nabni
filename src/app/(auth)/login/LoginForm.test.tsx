import { beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

let params = new URLSearchParams();
const signInWithPassword = vi.fn();
const resend = vi.fn();
const router = { push: vi.fn(), refresh: vi.fn() };

vi.mock('@/utils/supabase/client', () => ({ createClient: () => ({ auth: { signInWithPassword, resend } }) }));
vi.mock('next/navigation', () => ({
  useRouter: () => router,
  useSearchParams: () => params,
}));

import LoginForm, { LINK_ERROR, RESEND_LABEL, RESEND_SENT } from './LoginForm';
import { NETWORK_ERROR } from '@/utils/authErrors';

async function logIn(email = 'mona@example.com', password = 'secret1') {
  await userEvent.type(screen.getByLabelText(/البريد الإلكتروني/), email);
  await userEvent.type(screen.getByLabelText(/كلمة المرور/), password);
  await userEvent.click(screen.getByRole('button', { name: 'دخول' }));
}

function withRedirect(value: string) {
  params = new URLSearchParams();
  params.set('redirectTo', value);
}

beforeEach(() => {
  params = new URLSearchParams();
  signInWithPassword.mockReset().mockResolvedValue({ data: { session: { access_token: 't' } }, error: null });
  resend.mockReset().mockResolvedValue({ data: {}, error: null });
  router.push.mockReset();
  router.refresh.mockReset();
});

describe('LoginForm', () => {
  it('keeps email and password left-to-right (NAB-137)', () => {
    render(<LoginForm />);

    expect(screen.getByLabelText(/البريد الإلكتروني/)).toHaveAttribute('dir', 'ltr');
    expect(screen.getByLabelText(/كلمة المرور/)).toHaveAttribute('dir', 'ltr');
  });

  it('links to the forgot-password page', () => {
    render(<LoginForm />);

    expect(screen.getByRole('link', { name: 'نسيت كلمة المرور؟' })).toHaveAttribute('href', '/forgot-password');
  });

  it('explains a broken or expired email link', () => {
    params = new URLSearchParams('error=link');
    render(<LoginForm />);

    expect(screen.getByText(LINK_ERROR)).toBeInTheDocument();
  });

  it('shows no link message on a normal visit', () => {
    render(<LoginForm />);

    expect(screen.queryByText(LINK_ERROR)).not.toBeInTheDocument();
  });

  describe('redirectTo (NAB-126)', () => {
    it('goes to the dashboard by default', async () => {
      render(<LoginForm />);

      await logIn();

      await vi.waitFor(() => expect(router.push).toHaveBeenCalledWith('/dashboard'));
    });

    it('keeps a safe internal path', async () => {
      withRedirect('/parent/requests/5?tab=offers');
      render(<LoginForm />);

      await logIn();

      await vi.waitFor(() => expect(router.push).toHaveBeenCalledWith('/parent/requests/5?tab=offers'));
    });

    for (const unsafe of ['//evil.com', 'https://evil.com', '/\\evil.com', '/\t/evil.com', '/\n/evil.com', 'javascript:alert(1)']) {
      it(`stays on the site for ${JSON.stringify(unsafe)}`, async () => {
        withRedirect(unsafe);
        render(<LoginForm />);

        await logIn();

        await vi.waitFor(() => expect(router.push).toHaveBeenCalledWith('/dashboard'));
      });
    }
  });

  describe('errors in Arabic (NAB-126)', () => {
    it('explains wrong credentials without showing the English message', async () => {
      signInWithPassword.mockResolvedValue({
        data: {},
        error: { code: 'invalid_credentials', message: 'Invalid login credentials' },
      });
      render(<LoginForm />);

      await logIn();

      expect(await screen.findByText('البريد الإلكتروني أو كلمة المرور غير صحيحة')).toBeInTheDocument();
      expect(screen.queryByText(/Invalid login credentials/)).not.toBeInTheDocument();
      expect(screen.queryByRole('button', { name: RESEND_LABEL })).not.toBeInTheDocument();
      expect(router.push).not.toHaveBeenCalled();
    });

    it('asks to wait after too many attempts', async () => {
      signInWithPassword.mockResolvedValue({
        data: {},
        error: { code: 'over_request_rate_limit', message: 'Request rate limit reached' },
      });
      render(<LoginForm />);

      await logIn();

      expect(await screen.findByText(/انتظر قليلاً/)).toBeInTheDocument();
    });

    it('explains a network failure', async () => {
      signInWithPassword.mockResolvedValue({
        data: {},
        error: { name: 'AuthRetryableFetchError', message: 'Failed to fetch' },
      });
      render(<LoginForm />);

      await logIn();

      expect(await screen.findByText(NETWORK_ERROR)).toBeInTheDocument();
    });

    it('recovers when sign-in throws instead of returning an error (NAB-136)', async () => {
      signInWithPassword.mockRejectedValue(new TypeError('Failed to fetch'));
      render(<LoginForm />);

      await logIn();

      expect(await screen.findByText(NETWORK_ERROR)).toBeInTheDocument();
      expect(screen.getByRole('button', { name: 'دخول' })).toBeEnabled();
      expect(screen.getByLabelText(/البريد الإلكتروني/)).toBeEnabled();
      expect(router.push).not.toHaveBeenCalled();
    });

    it('shows the network message for a non-error throw (NAB-136)', async () => {
      signInWithPassword.mockRejectedValue('offline');
      render(<LoginForm />);

      await logIn();

      expect(await screen.findByText(NETWORK_ERROR)).toBeInTheDocument();
      expect(screen.getByRole('button', { name: 'دخول' })).toBeEnabled();
    });
  });

  describe('unconfirmed email (NAB-126)', () => {
    beforeEach(() => {
      signInWithPassword.mockResolvedValue({
        data: {},
        error: { code: 'email_not_confirmed', message: 'Email not confirmed' },
      });
    });

    it('tells them to open the confirmation email', async () => {
      render(<LoginForm />);

      await logIn();

      expect(await screen.findByText(/افتح رسالة التأكيد/)).toBeInTheDocument();
      expect(screen.getByRole('button', { name: RESEND_LABEL })).toBeInTheDocument();
    });

    it('resends the confirmation email through /auth/confirm', async () => {
      render(<LoginForm />);

      await logIn(' mona@example.com ');
      await userEvent.click(await screen.findByRole('button', { name: RESEND_LABEL }));

      expect(await screen.findByText(RESEND_SENT)).toBeInTheDocument();
      expect(resend).toHaveBeenCalledWith({
        type: 'signup',
        email: 'mona@example.com',
        options: { emailRedirectTo: `${window.location.origin}/auth/confirm` },
      });
    });

    it('shows a resend failure in Arabic', async () => {
      resend.mockResolvedValue({ data: null, error: { code: 'over_email_send_rate_limit', message: 'email rate limit exceeded' } });
      render(<LoginForm />);

      await logIn();
      await userEvent.click(await screen.findByRole('button', { name: RESEND_LABEL }));

      expect(await screen.findByText(/انتظر قليلاً/)).toBeInTheDocument();
      expect(screen.queryByText(RESEND_SENT)).not.toBeInTheDocument();
    });

    it('recovers when the resend throws (NAB-136)', async () => {
      resend.mockRejectedValue(new TypeError('Failed to fetch'));
      render(<LoginForm />);

      await logIn();
      await userEvent.click(await screen.findByRole('button', { name: RESEND_LABEL }));

      expect(await screen.findByText(NETWORK_ERROR)).toBeInTheDocument();
      expect(screen.getByRole('button', { name: RESEND_LABEL })).toBeEnabled();
      expect(screen.queryByText(RESEND_SENT)).not.toBeInTheDocument();
    });
  });
});
