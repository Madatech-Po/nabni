import { beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen, within } from '@testing-library/react';

const getContactMessages = vi.fn();
vi.mock('@/services/admin', () => ({
  ADMIN_PAGE_SIZE: 20,
  getContactMessages: (filters: unknown) => getContactMessages(filters),
}));
vi.mock('@/services/contact', () => ({ markContactMessageHandled: vi.fn() }));
vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: vi.fn(), refresh: vi.fn() }),
  usePathname: () => '/admin/messages',
  useSearchParams: () => new URLSearchParams(),
}));

import AdminMessagesPage from './page';

const unhandled = {
  id: 'm2', name: 'منى', email: 'mona@example.com', phone: null, subject: 'سؤال عن التسجيل',
  message: 'كيف أسجل كمتخصصة؟', handled_at: null, created_at: '2026-11-12T09:00:00Z',
};
const handled = {
  id: 'm1', name: 'أحمد', email: null, phone: '01001234567', subject: null,
  message: 'شكراً على المنصة', handled_at: '2026-11-11T12:00:00Z', created_at: '2026-11-11T10:00:00Z',
};

beforeEach(() => {
  getContactMessages.mockReset();
});

describe('AdminMessagesPage (NAB-124)', () => {
  it('lists messages with sender, contact, subject, text and date', async () => {
    getContactMessages.mockResolvedValue({ items: [unhandled, handled], total: 2 });
    render(await AdminMessagesPage({ searchParams: Promise.resolve({}) }));

    expect(getContactMessages).toHaveBeenCalledWith({ page: 1 });
    expect(screen.getByRole('heading', { name: 'الرسائل' })).toBeInTheDocument();

    const first = screen.getByRole('article', { name: 'رسالة من منى' });
    expect(within(first).getByText('سؤال عن التسجيل')).toBeInTheDocument();
    expect(within(first).getByText('كيف أسجل كمتخصصة؟')).toBeInTheDocument();
    expect(within(first).getByRole('link', { name: 'mona@example.com' })).toHaveAttribute('href', 'mailto:mona@example.com');
    expect(within(first).getByText('جديدة')).toBeInTheDocument();
    expect(within(first).getByRole('button', { name: 'تم التعامل' })).toBeInTheDocument();

    const second = screen.getByRole('article', { name: 'رسالة من أحمد' });
    expect(within(second).getByText('بدون موضوع')).toBeInTheDocument();
    expect(within(second).getByRole('link', { name: '01001234567' })).toHaveAttribute('href', 'tel:01001234567');
    expect(within(second).queryByRole('button', { name: 'تم التعامل' })).not.toBeInTheDocument();
    expect(within(second).getByText(/^تم التعامل في/)).toBeInTheDocument();
  });

  it('keeps the order the service gives (newest first)', async () => {
    getContactMessages.mockResolvedValue({ items: [unhandled, handled], total: 2 });
    render(await AdminMessagesPage({ searchParams: Promise.resolve({}) }));

    const names = screen.getAllByRole('article').map((a) => a.getAttribute('aria-label'));
    expect(names).toEqual(['رسالة من منى', 'رسالة من أحمد']);
  });

  it('passes the page number on', async () => {
    getContactMessages.mockResolvedValue({ items: [], total: 0 });
    render(await AdminMessagesPage({ searchParams: Promise.resolve({ page: '3' }) }));

    expect(getContactMessages).toHaveBeenCalledWith({ page: 3 });
  });

  it('says so when there are no messages', async () => {
    getContactMessages.mockResolvedValue({ items: [], total: 0 });
    render(await AdminMessagesPage({ searchParams: Promise.resolve({}) }));

    expect(screen.getByText('لا توجد رسائل.')).toBeInTheDocument();
  });
});
