import { beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { argsOf, createSupabaseMock } from '@/test/supabaseMock';

let mock = createSupabaseMock();
let user: { id: string } | null = { id: 'p1' };
const redirect = vi.fn((url: string) => {
  throw new Error(`redirect:${url}`);
});

vi.mock('@/utils/supabase/server', () => ({
  createClient: () => ({ ...mock.client, auth: { getUser: async () => ({ data: { user } }) } }),
}));
vi.mock('next/navigation', () => ({ redirect: (url: string) => redirect(url) }));

import ParentLayout from './layout';

beforeEach(() => {
  user = { id: 'p1' };
  redirect.mockClear();
});

async function renderLayout() {
  render(await ParentLayout({ children: <p>dashboard</p> }));
}

describe('ParentLayout', () => {
  it('shows the page to an active parent', async () => {
    mock = createSupabaseMock(() => ({ data: { role: 'parent', is_active: true } }));
    await renderLayout();

    expect(screen.getByText('dashboard')).toBeInTheDocument();
    expect(argsOf(mock.on('profiles')[0], 'eq')).toEqual(['id', 'p1']);
  });

  it('shows the suspension notice instead of the page to a suspended parent', async () => {
    mock = createSupabaseMock(() => ({ data: { role: 'parent', is_active: false } }));
    await renderLayout();

    expect(screen.getByText('تم إيقاف حسابك')).toBeInTheDocument();
    expect(screen.queryByText('dashboard')).not.toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'تواصل معنا' })).toHaveAttribute('href', '/contact');
  });

  it('sends signed-out visitors to the login page', async () => {
    user = null;

    await expect(renderLayout()).rejects.toThrow('redirect:/login?redirectTo=/parent');
  });
});

describe('ParentLayout roles', () => {
  it.each(['educator', 'admin'])('sends a %s to their own dashboard', async (role) => {
    mock = createSupabaseMock(() => ({ data: { role, is_active: true } }));

    await expect(renderLayout()).rejects.toThrow('redirect:/dashboard');
  });
});
