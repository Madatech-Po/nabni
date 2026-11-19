// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { NextRequest } from 'next/server';

const verifyOtp = vi.fn();
const exchangeCodeForSession = vi.fn();

vi.mock('@/utils/supabase/server', () => ({
  createClient: async () => ({ auth: { verifyOtp, exchangeCodeForSession } }),
}));

import { GET } from './route';

async function visit(query: string) {
  const response = await GET(new NextRequest(`https://nabni.test/auth/confirm${query}`));
  return { status: response.status, location: response.headers.get('location') };
}

beforeEach(() => {
  verifyOtp.mockReset().mockResolvedValue({ data: {}, error: null });
  exchangeCodeForSession.mockReset().mockResolvedValue({ data: {}, error: null });
});

describe('GET /auth/confirm', () => {
  it('verifies a sign-up token and goes to the dashboard', async () => {
    const result = await visit('?token_hash=abc&type=signup');

    expect(verifyOtp).toHaveBeenCalledWith({ type: 'signup', token_hash: 'abc' });
    expect(result.status).toBe(307);
    expect(result.location).toBe('https://nabni.test/dashboard');
  });

  it('sends a recovery link to /reset-password by default', async () => {
    const result = await visit('?token_hash=abc&type=recovery');

    expect(result.location).toBe('https://nabni.test/reset-password');
  });

  it('follows an internal next path', async () => {
    const result = await visit('?token_hash=abc&type=signup&next=%2Frequests%2F5');

    expect(result.location).toBe('https://nabni.test/requests/5');
  });

  it('ignores a next that leaves the site', async () => {
    for (const next of ['https://evil.com', '//evil.com', '/\\evil.com']) {
      const result = await visit(`?token_hash=abc&type=signup&next=${encodeURIComponent(next)}`);
      expect(result.location).toBe('https://nabni.test/dashboard');
    }
  });

  it('exchanges a PKCE code', async () => {
    const result = await visit('?code=xyz&type=recovery&next=/reset-password');

    expect(exchangeCodeForSession).toHaveBeenCalledWith('xyz');
    expect(verifyOtp).not.toHaveBeenCalled();
    expect(result.location).toBe('https://nabni.test/reset-password');
  });

  it('sends an expired or used token to the login page with an error', async () => {
    verifyOtp.mockResolvedValue({ data: {}, error: { message: 'Token has expired or is invalid' } });

    const result = await visit('?token_hash=abc&type=signup');

    expect(result.location).toBe('https://nabni.test/login?error=link');
  });

  it('sends a failed code exchange to the login page with an error', async () => {
    exchangeCodeForSession.mockResolvedValue({ data: {}, error: { message: 'invalid flow state' } });

    const result = await visit('?code=xyz');

    expect(result.location).toBe('https://nabni.test/login?error=link');
  });

  it('rejects a link with nothing to verify or an unknown type', async () => {
    expect((await visit('')).location).toBe('https://nabni.test/login?error=link');
    expect((await visit('?error=access_denied&error_code=otp_expired')).location).toBe('https://nabni.test/login?error=link');
    expect((await visit('?token_hash=abc&type=bogus')).location).toBe('https://nabni.test/login?error=link');
    expect(verifyOtp).not.toHaveBeenCalled();
  });
});
