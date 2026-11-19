import { beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { CONTACT_MESSAGES } from './contactFormValues';

const submitContactMessage = vi.fn();
vi.mock('@/services/contact', () => ({ submitContactMessage: (v: unknown) => submitContactMessage(v) }));

import ContactForm, { CONTACT_SUCCESS } from './ContactForm';

async function fill({ name = 'منى', email = 'mona@example.com', phone = '', message = 'عندي سؤال عن التسجيل' } = {}) {
  const user = userEvent.setup();
  // Pasting instead of typing keeps these tests fast.
  const put = async (el: HTMLElement, text: string) => {
    await user.click(el);
    await user.paste(text);
  };
  if (name) await put(screen.getByLabelText(/الاسم/), name);
  if (email) await put(screen.getByLabelText('البريد الإلكتروني'), email);
  if (phone) await put(screen.getByLabelText('رقم الموبايل'), phone);
  if (message) await put(screen.getByLabelText(/الرسالة/), message);
  return user;
}

beforeEach(() => {
  submitContactMessage.mockReset();
  submitContactMessage.mockResolvedValue('m1');
});

describe('ContactForm (NAB-124)', () => {
  it('sends the message and thanks the sender', async () => {
    render(<ContactForm />);
    const user = await fill({ phone: '01001234567' });
    await user.click(screen.getByLabelText('الموضوع (اختياري)'));
    await user.paste('التسجيل');
    await user.click(screen.getByRole('button', { name: 'إرسال' }));

    expect(submitContactMessage).toHaveBeenCalledWith({
      name: 'منى', email: 'mona@example.com', phone: '01001234567', subject: 'التسجيل', message: 'عندي سؤال عن التسجيل',
    });
    expect(await screen.findByText(CONTACT_SUCCESS)).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'إرسال' })).not.toBeInTheDocument();
  });

  it('shows what is wrong in Arabic and sends nothing', async () => {
    render(<ContactForm />);
    const user = await fill({ email: '', message: 'قصيرة' });
    await user.click(screen.getByRole('button', { name: 'إرسال' }));

    expect(screen.getAllByText(CONTACT_MESSAGES.replyChannel)).toHaveLength(2);
    expect(screen.getByText(new RegExp(CONTACT_MESSAGES.message))).toBeInTheDocument();
    expect(submitContactMessage).not.toHaveBeenCalled();
  });

  it('accepts a phone without an email', async () => {
    render(<ContactForm />);
    const user = await fill({ email: '', phone: '+201001234567' });
    await user.click(screen.getByRole('button', { name: 'إرسال' }));

    expect(await screen.findByText(CONTACT_SUCCESS)).toBeInTheDocument();
  });

  it('puts a database validation error on its field', async () => {
    submitContactMessage.mockRejectedValue({ code: '23514', message: 'contact_email_invalid' });
    render(<ContactForm />);
    const user = await fill();
    await user.click(screen.getByRole('button', { name: 'إرسال' }));

    expect(await screen.findByText(CONTACT_MESSAGES.email)).toBeInTheDocument();
    expect(screen.queryByText(CONTACT_SUCCESS)).not.toBeInTheDocument();
  });

  it('explains the rate limit', async () => {
    submitContactMessage.mockRejectedValue({ code: 'PT429', message: 'contact_rate_limited' });
    render(<ContactForm />);
    const user = await fill();
    await user.click(screen.getByRole('button', { name: 'إرسال' }));

    expect(await screen.findByRole('alert')).toHaveTextContent(CONTACT_MESSAGES.rateLimited);
  });

  it('prefills the name and email of a signed-in user', () => {
    render(<ContactForm defaults={{ name: 'منى علي', email: 'mona@example.com' }} />);

    expect(screen.getByLabelText(/الاسم/)).toHaveValue('منى علي');
    expect(screen.getByLabelText('البريد الإلكتروني')).toHaveValue('mona@example.com');
  });

  it('can start another message after sending', async () => {
    render(<ContactForm />);
    const user = await fill();
    await user.click(screen.getByRole('button', { name: 'إرسال' }));
    await user.click(await screen.findByRole('button', { name: 'إرسال رسالة أخرى' }));

    expect(screen.getByLabelText(/الرسالة/)).toHaveValue('');
  });
});
