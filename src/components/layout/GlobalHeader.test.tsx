import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';

const push = vi.fn();
const refresh = vi.fn();
const signOut = vi.fn<(opts?: unknown) => Promise<{ error: Error | null }>>(async () => ({ error: null }));

vi.mock('next/navigation', () => ({ useRouter: () => ({ push, refresh }) }));
vi.mock('@/utils/supabase/client', () => ({ createClient: () => ({ auth: { signOut } }) }));

import GlobalHeader from './GlobalHeader';

beforeEach(() => {
  push.mockClear();
  refresh.mockClear();
  signOut.mockClear();
});

describe('GlobalHeader (NAB-93)', () => {
  it('offers login and register to visitors', () => {
    render(<GlobalHeader />);

    expect(screen.getByRole('link', { name: 'تسجيل الدخول' })).toHaveAttribute('href', '/login');
    expect(screen.getByRole('link', { name: 'إنشاء حساب' })).toHaveAttribute('href', '/register');
    expect(screen.queryByRole('link', { name: 'لوحتي' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'تسجيل الخروج' })).not.toBeInTheDocument();
  });

  it('offers the dashboard and sign-out to signed-in users', () => {
    render(<GlobalHeader signedIn />);

    expect(screen.getByRole('link', { name: 'لوحتي' })).toHaveAttribute('href', '/dashboard');
    expect(screen.getByRole('button', { name: 'تسجيل الخروج' })).toBeInTheDocument();
    expect(screen.queryByRole('link', { name: 'تسجيل الدخول' })).not.toBeInTheDocument();
    expect(screen.queryByRole('link', { name: 'إنشاء حساب' })).not.toBeInTheDocument();
  });

  it('always links home from the logo', () => {
    render(<GlobalHeader signedIn />);

    expect(screen.getByRole('link', { name: 'Nabni' })).toHaveAttribute('href', '/');
  });

  it('signs out and goes home', async () => {
    render(<GlobalHeader signedIn />);
    fireEvent.click(screen.getByRole('button', { name: 'تسجيل الخروج' }));

    await waitFor(() => expect(push).toHaveBeenCalledWith('/'));
    expect(signOut).toHaveBeenCalledWith({ scope: 'local' });
    expect(refresh).toHaveBeenCalled();
  });

  it.each([
    ['returns an error', async () => ({ error: new Error('network') })],
    ['throws', async () => { throw new Error('offline'); }],
  ])('stays put and re-enables the button when sign-out %s (NAB-94)', async (_case, impl) => {
    signOut.mockImplementationOnce(impl);
    render(<GlobalHeader signedIn />);
    const button = screen.getByRole('button', { name: 'تسجيل الخروج' });
    fireEvent.click(button);

    await waitFor(() => expect(button).toBeEnabled());
    expect(signOut).toHaveBeenCalledTimes(1);
    expect(push).not.toHaveBeenCalled();
  });
});
