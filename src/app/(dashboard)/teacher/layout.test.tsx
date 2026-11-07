import { beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { createSupabaseMock } from '@/test/supabaseMock';

let mock = createSupabaseMock();
let user: { id: string } | null = { id: 'u1' };
const redirect = vi.fn((url: string) => {
  throw new Error(`redirect:${url}`);
});

vi.mock('@/utils/supabase/server', () => ({
  createClient: () => ({ ...mock.client, auth: { getUser: async () => ({ data: { user } }) } }),
}));
vi.mock('next/navigation', () => ({ redirect: (url: string) => redirect(url) }));

import TeacherLayout from './layout';

beforeEach(() => {
  user = { id: 'u1' };
  redirect.mockClear();
});

async function renderLayout() {
  render(await TeacherLayout({ children: <p>teacher page</p> }));
}

describe('TeacherLayout', () => {
  it('shows the page to an educator', async () => {
    mock = createSupabaseMock(() => ({ data: { role: 'educator' } }));
    await renderLayout();

    expect(screen.getByText('teacher page')).toBeInTheDocument();
  });

  it.each([
    ['a parent', () => ({ data: { role: 'parent' } })],
    ['an admin', () => ({ data: { role: 'admin' } })],
    ['a missing profile', () => ({ data: null })],
    ['a failed profile query', () => ({ error: { message: 'timeout' } })],
  ])('sends %s to /dashboard', async (_, respond) => {
    mock = createSupabaseMock(respond);

    await expect(renderLayout()).rejects.toThrow('redirect:/dashboard');
  });

  it('sends signed-out visitors to the login page', async () => {
    user = null;

    await expect(renderLayout()).rejects.toThrow('redirect:/login?redirectTo=/teacher');
  });
});
