import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';

let pathname = '/admin/educators';
vi.mock('next/navigation', () => ({ usePathname: () => pathname }));

import AdminNav, { ADMIN_SECTIONS } from './AdminNav';

describe('AdminNav', () => {
  it('links to every admin section', () => {
    render(<AdminNav />);

    for (const { href, label } of ADMIN_SECTIONS) {
      expect(screen.getByRole('link', { name: label })).toHaveAttribute('href', href);
    }
  });

  it('marks only the current section, including its sub-pages', () => {
    pathname = '/admin/parents/123';
    render(<AdminNav />);

    expect(screen.getByRole('link', { name: 'أولياء الأمور' })).toHaveAttribute('aria-current', 'page');
    expect(screen.getAllByRole('link').filter((l) => l.hasAttribute('aria-current'))).toHaveLength(1);
  });
});
