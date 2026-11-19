import { beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';

let params = new URLSearchParams();

vi.mock('@/utils/supabase/client', () => ({ createClient: () => ({ auth: { signInWithPassword: vi.fn() } }) }));
vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: vi.fn(), refresh: vi.fn() }),
  useSearchParams: () => params,
}));

import LoginForm, { LINK_ERROR } from './LoginForm';

beforeEach(() => {
  params = new URLSearchParams();
});

describe('LoginForm', () => {
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
});
