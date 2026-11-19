// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { NextRequest } from 'next/server';

const getUser = vi.fn();

vi.mock('@supabase/ssr', () => ({
  createServerClient: () => ({ auth: { getUser } }),
}));

import { isProtectedPath, updateSession } from './middleware';

function signedIn(yes: boolean) {
  getUser.mockResolvedValue({ data: { user: yes ? { id: 'u1' } : null }, error: null });
}

async function visit(path: string) {
  const response = await updateSession(new NextRequest(`https://nabni.test${path}`));
  return response.headers.get('location');
}

beforeEach(() => getUser.mockReset());

describe('isProtectedPath', () => {
  it('protects the notifications page (NAB-115)', () => {
    expect(isProtectedPath('/notifications')).toBe(true);
  });

  it('keeps the existing protected areas', () => {
    for (const path of ['/dashboard', '/parent/requests', '/teacher', '/admin/users', '/requests/new', '/profile/edit', '/requests/3/proposal']) {
      expect(isProtectedPath(path)).toBe(true);
    }
  });

  it('leaves public and email-link pages open', () => {
    for (const path of ['/', '/login', '/register', '/forgot-password', '/reset-password', '/auth/confirm', '/requests/3']) {
      expect(isProtectedPath(path)).toBe(false);
    }
  });
});

describe('updateSession', () => {
  it('sends a signed-out visitor of /notifications to login', async () => {
    signedIn(false);

    expect(await visit('/notifications')).toBe('https://nabni.test/login?redirectTo=%2Fnotifications');
  });

  it('lets a just-recovered (signed-in) user stay on /reset-password', async () => {
    signedIn(true);

    expect(await visit('/reset-password')).toBeNull();
  });

  it('lets a signed-out visitor see /reset-password and /auth/confirm', async () => {
    signedIn(false);

    expect(await visit('/reset-password')).toBeNull();
    expect(await visit('/auth/confirm?token_hash=abc&type=recovery')).toBeNull();
  });

  it('only writes internal paths into redirectTo (NAB-126)', async () => {
    signedIn(false);

    const location = await visit('//evil.com/proposal');

    expect(location).not.toBeNull();
    const url = new URL(location!);
    expect(url.origin).toBe('https://nabni.test');
    expect(url.pathname).toBe('/login');
    expect(url.searchParams.has('redirectTo')).toBe(false);
  });

  it('sends a signed-in visitor of /login to a safe redirectTo', async () => {
    signedIn(true);

    expect(await visit('/login?redirectTo=%2Fparent%2Frequests')).toBe('https://nabni.test/parent/requests');
    expect(await visit('/login')).toBe('https://nabni.test/dashboard');
  });

  it('keeps a signed-in visitor on the site for an unsafe redirectTo (NAB-126)', async () => {
    signedIn(true);

    for (const unsafe of ['//evil.com', 'https://evil.com', '/\\evil.com', '/\t/evil.com', '/\n/evil.com']) {
      const location = await visit(`/login?redirectTo=${encodeURIComponent(unsafe)}`);
      expect(location, unsafe).toBe('https://nabni.test/dashboard');
    }
  });
});
