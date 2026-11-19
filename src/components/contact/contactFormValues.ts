// The contact form (NAB-124). Same limits and patterns as submit_contact_message() in
// migration 023, so the server only rejects what the form already flags.

export interface ContactFormValues {
  name: string;
  email: string;
  phone: string;
  subject: string;
  message: string;
}

export const EMPTY_CONTACT_FORM: ContactFormValues = { name: '', email: '', phone: '', subject: '', message: '' };

export const MAX_NAME = 100;
export const MAX_EMAIL = 200;
export const MAX_PHONE = 30;
export const MAX_SUBJECT = 150;
export const MIN_MESSAGE = 10;
export const MAX_MESSAGE = 2000;

const EMAIL_RE = /^[^@\s]+@[^@\s]+\.[^@\s]+$/;
const PHONE_RE = /^\+?[0-9 ()-]{6,30}$/;

export type ContactFormErrors = Partial<Record<keyof ContactFormValues, string>>;

export const CONTACT_MESSAGES = {
  name: `اكتب اسمك (حتى ${MAX_NAME} حرف)`,
  email: 'البريد الإلكتروني غير صحيح',
  phone: 'رقم الموبايل غير صحيح — أرقام فقط، ويمكن أن يبدأ بـ +',
  replyChannel: 'اكتب البريد الإلكتروني أو رقم الموبايل لنتمكن من الرد عليك',
  subject: `الموضوع حتى ${MAX_SUBJECT} حرف`,
  message: `اكتب رسالتك من ${MIN_MESSAGE} إلى ${MAX_MESSAGE} حرف`,
  rateLimited: 'أرسلت رسائل كثيرة خلال ساعة — انتظر قليلاً ثم حاول مرة أخرى',
  network: 'تعذّر الاتصال بالخادم — تحقّق من اتصالك بالإنترنت ثم حاول مرة أخرى',
  unknown: 'تعذّر إرسال الرسالة — حاول مرة أخرى',
} as const;

export function validateContactForm(values: ContactFormValues): ContactFormErrors {
  const errors: ContactFormErrors = {};
  const name = values.name.trim();
  const email = values.email.trim();
  const phone = values.phone.trim();
  const message = values.message.trim();

  if (!name || name.length > MAX_NAME) errors.name = CONTACT_MESSAGES.name;
  if (email && (email.length > MAX_EMAIL || !EMAIL_RE.test(email))) errors.email = CONTACT_MESSAGES.email;
  if (phone && !PHONE_RE.test(phone)) errors.phone = CONTACT_MESSAGES.phone;
  if (!email && !phone) {
    errors.email = CONTACT_MESSAGES.replyChannel;
    errors.phone = CONTACT_MESSAGES.replyChannel;
  }
  if (values.subject.trim().length > MAX_SUBJECT) errors.subject = CONTACT_MESSAGES.subject;
  if (message.length < MIN_MESSAGE || message.length > MAX_MESSAGE) {
    errors.message = `${CONTACT_MESSAGES.message} (${message.length}/${MAX_MESSAGE})`;
  }

  return errors;
}

type DbError = { code?: string; message: string };

// Error keys raised by submit_contact_message(), with the form field each one belongs to.
const BY_DB_MESSAGE: Record<string, { field?: keyof ContactFormValues; text: string }> = {
  contact_name_invalid: { field: 'name', text: CONTACT_MESSAGES.name },
  contact_email_invalid: { field: 'email', text: CONTACT_MESSAGES.email },
  contact_phone_invalid: { field: 'phone', text: CONTACT_MESSAGES.phone },
  contact_subject_invalid: { field: 'subject', text: CONTACT_MESSAGES.subject },
  contact_message_invalid: { field: 'message', text: CONTACT_MESSAGES.message },
  contact_reply_channel_required: { field: 'email', text: CONTACT_MESSAGES.replyChannel },
  contact_rate_limited: { text: CONTACT_MESSAGES.rateLimited },
};

/** The Arabic text for a failed submit, and the field to show it on when there is one. */
export function contactErrorMessage(error: DbError): { field?: keyof ContactFormValues; text: string } {
  const known = BY_DB_MESSAGE[error.message];
  if (known) return known;
  if (error.code === 'PT429') return { text: CONTACT_MESSAGES.rateLimited };
  if (/failed to fetch|fetch failed|networkerror|network request failed|load failed/i.test(error.message)) {
    return { text: CONTACT_MESSAGES.network };
  }
  return { text: CONTACT_MESSAGES.unknown };
}
