'use client';

import { useState, type FormEvent } from 'react';
import { Alert, Box, Button, Paper, Stack, TextField, Typography } from '@mui/material';
import { submitContactMessage } from '@/services/contact';
import {
  EMPTY_CONTACT_FORM,
  MAX_EMAIL,
  MAX_MESSAGE,
  MAX_NAME,
  MAX_PHONE,
  MAX_SUBJECT,
  contactErrorMessage,
  validateContactForm,
  type ContactFormErrors,
  type ContactFormValues,
} from './contactFormValues';

export const CONTACT_SUCCESS = 'وصلتنا رسالتك، هنرد عليك قريباً';

/** The "تواصل معنا" form (NAB-124). `defaults` prefills the name and email of a signed-in user. */
export default function ContactForm({ defaults }: { defaults?: Partial<Pick<ContactFormValues, 'name' | 'email'>> }) {
  const initial: ContactFormValues = { ...EMPTY_CONTACT_FORM, name: defaults?.name ?? '', email: defaults?.email ?? '' };
  const [values, setValues] = useState<ContactFormValues>(initial);
  const [errors, setErrors] = useState<ContactFormErrors>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);

  function set(field: keyof ContactFormValues, value: string) {
    setValues((v) => ({ ...v, [field]: value }));
  }

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setFormError(null);
    const found = validateContactForm(values);
    setErrors(found);
    if (Object.keys(found).length > 0) return;

    setSending(true);
    try {
      await submitContactMessage(values);
      setSent(true);
    } catch (err) {
      const { field, text } = contactErrorMessage(err as { code?: string; message: string });
      if (field) setErrors({ [field]: text });
      else setFormError(text);
    } finally {
      setSending(false);
    }
  }

  if (sent) {
    return (
      <Paper variant="outlined" sx={{ p: 4, textAlign: 'center' }}>
        <Alert severity="success" sx={{ mb: 3, justifyContent: 'center' }}>{CONTACT_SUCCESS}</Alert>
        <Button
          variant="outlined"
          onClick={() => {
            setValues(initial);
            setErrors({});
            setSent(false);
          }}
        >
          إرسال رسالة أخرى
        </Button>
      </Paper>
    );
  }

  const field = (name: keyof ContactFormValues) => ({
    value: values[name],
    onChange: (e: { target: { value: string } }) => set(name, e.target.value),
    error: Boolean(errors[name]),
    helperText: errors[name],
    fullWidth: true,
  });

  return (
    <Paper component="form" variant="outlined" noValidate onSubmit={onSubmit} sx={{ p: { xs: 3, md: 4 } }}>
      <Stack spacing={3}>
        {formError && <Alert severity="error">{formError}</Alert>}
        <TextField label="الاسم" required autoComplete="name" inputProps={{ maxLength: MAX_NAME }} {...field('name')} />
        <Box>
          <Typography variant="body2" color="text.secondary" mb={1.5}>
            اكتب البريد الإلكتروني أو رقم الموبايل (واحد منهما على الأقل) لنرد عليك.
          </Typography>
          <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
            <TextField
              label="البريد الإلكتروني"
              type="email"
              autoComplete="email"
              inputProps={{ maxLength: MAX_EMAIL, dir: 'ltr' }}
              {...field('email')}
            />
            <TextField
              label="رقم الموبايل"
              type="tel"
              autoComplete="tel"
              inputProps={{ maxLength: MAX_PHONE, dir: 'ltr' }}
              {...field('phone')}
            />
          </Stack>
        </Box>
        <TextField label="الموضوع (اختياري)" inputProps={{ maxLength: MAX_SUBJECT }} {...field('subject')} />
        <TextField
          label="الرسالة"
          required
          multiline
          minRows={5}
          inputProps={{ maxLength: MAX_MESSAGE }}
          {...field('message')}
        />
        <Box>
          <Button type="submit" variant="contained" size="large" disabled={sending} sx={{ px: 6 }}>
            {sending ? 'جارٍ الإرسال...' : 'إرسال'}
          </Button>
        </Box>
      </Stack>
    </Paper>
  );
}
