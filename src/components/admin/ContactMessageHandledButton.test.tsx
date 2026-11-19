import { beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

const markContactMessageHandled = vi.fn();
const router = { refresh: vi.fn() };
vi.mock('@/services/contact', () => ({ markContactMessageHandled: (id: string) => markContactMessageHandled(id) }));
vi.mock('next/navigation', () => ({ useRouter: () => router }));

import ContactMessageHandledButton from './ContactMessageHandledButton';

beforeEach(() => {
  markContactMessageHandled.mockReset();
  router.refresh.mockReset();
});

describe('ContactMessageHandledButton (NAB-124)', () => {
  it('marks the message handled and refreshes the list', async () => {
    markContactMessageHandled.mockResolvedValue('2026-11-12T10:00:00Z');
    render(<ContactMessageHandledButton messageId="m1" />);

    await userEvent.click(screen.getByRole('button', { name: 'تم التعامل' }));

    expect(markContactMessageHandled).toHaveBeenCalledWith('m1');
    expect(router.refresh).toHaveBeenCalled();
  });

  it('says so when saving fails, and keeps the list as it is', async () => {
    markContactMessageHandled.mockRejectedValue({ code: '42501', message: 'denied' });
    render(<ContactMessageHandledButton messageId="m1" />);

    await userEvent.click(screen.getByRole('button', { name: 'تم التعامل' }));

    expect(await screen.findByRole('alert')).toHaveTextContent('تعذّر حفظ التغيير');
    expect(router.refresh).not.toHaveBeenCalled();
  });
});
