import { describe, expect, it } from 'vitest';
import {
  CONTACT_MESSAGES,
  EMPTY_CONTACT_FORM,
  MAX_MESSAGE,
  MAX_NAME,
  MAX_SUBJECT,
  contactErrorMessage,
  validateContactForm,
  type ContactFormValues,
} from './contactFormValues';

const valid: ContactFormValues = {
  ...EMPTY_CONTACT_FORM,
  name: 'منى',
  email: 'mona@example.com',
  message: 'عندي سؤال عن طريقة التسجيل',
};

describe('validateContactForm (NAB-124)', () => {
  it('accepts a complete message', () => {
    expect(validateContactForm(valid)).toEqual({});
  });

  it('accepts a phone instead of an email', () => {
    expect(validateContactForm({ ...valid, email: '', phone: '+20 100 123 4567' })).toEqual({});
  });

  it('requires a name of at most 100 characters', () => {
    expect(validateContactForm({ ...valid, name: '   ' }).name).toBe(CONTACT_MESSAGES.name);
    expect(validateContactForm({ ...valid, name: 'ا'.repeat(MAX_NAME + 1) }).name).toBe(CONTACT_MESSAGES.name);
    expect(validateContactForm({ ...valid, name: 'ا'.repeat(MAX_NAME) }).name).toBeUndefined();
  });

  it('requires an email or a phone to reply to', () => {
    const errors = validateContactForm({ ...valid, email: ' ', phone: '' });
    expect(errors.email).toBe(CONTACT_MESSAGES.replyChannel);
    expect(errors.phone).toBe(CONTACT_MESSAGES.replyChannel);
  });

  it('rejects a malformed email', () => {
    expect(validateContactForm({ ...valid, email: 'mona@example' }).email).toBe(CONTACT_MESSAGES.email);
    expect(validateContactForm({ ...valid, email: `${'a'.repeat(195)}@x.com` }).email).toBe(CONTACT_MESSAGES.email);
  });

  it('rejects a phone with letters or too few digits', () => {
    expect(validateContactForm({ ...valid, phone: '01abc23456' }).phone).toBe(CONTACT_MESSAGES.phone);
    expect(validateContactForm({ ...valid, phone: '12345' }).phone).toBe(CONTACT_MESSAGES.phone);
    expect(validateContactForm({ ...valid, phone: '1'.repeat(31) }).phone).toBe(CONTACT_MESSAGES.phone);
  });

  it('limits the optional subject to 150 characters', () => {
    expect(validateContactForm({ ...valid, subject: 'ا'.repeat(MAX_SUBJECT + 1) }).subject).toBe(CONTACT_MESSAGES.subject);
    expect(validateContactForm({ ...valid, subject: '' }).subject).toBeUndefined();
  });

  it('needs a message of 10 to 2000 characters, counting after trimming', () => {
    expect(validateContactForm({ ...valid, message: '  قصيرة  ' }).message).toContain(CONTACT_MESSAGES.message);
    expect(validateContactForm({ ...valid, message: 'ا'.repeat(MAX_MESSAGE + 1) }).message).toContain(CONTACT_MESSAGES.message);
    expect(validateContactForm({ ...valid, message: 'ا'.repeat(10) }).message).toBeUndefined();
  });
});

describe('contactErrorMessage (NAB-124)', () => {
  it.each([
    ['contact_name_invalid', 'name', CONTACT_MESSAGES.name],
    ['contact_email_invalid', 'email', CONTACT_MESSAGES.email],
    ['contact_phone_invalid', 'phone', CONTACT_MESSAGES.phone],
    ['contact_subject_invalid', 'subject', CONTACT_MESSAGES.subject],
    ['contact_message_invalid', 'message', CONTACT_MESSAGES.message],
    ['contact_reply_channel_required', 'email', CONTACT_MESSAGES.replyChannel],
  ])('maps %s to its field in Arabic', (key, field, text) => {
    expect(contactErrorMessage({ code: '23514', message: key })).toEqual({ field, text });
  });

  it('explains the rate limit', () => {
    expect(contactErrorMessage({ code: 'PT429', message: 'contact_rate_limited' })).toEqual({ text: CONTACT_MESSAGES.rateLimited });
    expect(contactErrorMessage({ code: 'PT429', message: 'Too Many Requests' })).toEqual({ text: CONTACT_MESSAGES.rateLimited });
  });

  it('explains a network failure', () => {
    expect(contactErrorMessage({ message: 'TypeError: Failed to fetch' })).toEqual({ text: CONTACT_MESSAGES.network });
  });

  it('falls back to a general message', () => {
    expect(contactErrorMessage({ code: 'XX000', message: 'boom' })).toEqual({ text: CONTACT_MESSAGES.unknown });
  });
});
