import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';

vi.mock('next/navigation', () => ({ useRouter: () => ({ push: vi.fn(), refresh: vi.fn() }) }));
vi.mock('@/utils/supabase/client', () => ({ createClient: () => ({ auth: { signOut: vi.fn() } }) }));

import AdminAccountActions from './AdminAccountActions';

describe('AdminAccountActions (NAB-104)', () => {
  it('links back to the public site and offers sign-out', () => {
    render(<AdminAccountActions />);

    expect(screen.getByRole('link', { name: 'الموقع' })).toHaveAttribute('href', '/');
    expect(screen.getByRole('button', { name: 'تسجيل الخروج' })).toBeEnabled();
  });
});
