'use client';

import { useState } from 'react';
import { Alert, Box, Button, TextField } from '@mui/material';
import Link from 'next/link';
import { createClient } from '@/utils/supabase/client';
import { ltrInput } from '@/utils/ltrInput';
import { isAuthNetworkError } from '@/utils/authErrors';
import { emailError } from '../register/registerFormValues';

// Shown whatever Supabase answers about the account, so the page never reveals which emails have one.
export const RESET_SENT = 'إذا كان البريد مسجلاً لدينا فستصلك رسالة لإعادة تعيين كلمة المرور';
// Only when the request never reached Supabase (offline, blocked): says nothing about the account.
export const RESET_REQUEST_FAILED = 'تعذر إرسال الطلب، تحقق من اتصالك وحاول مرة أخرى';

export default function ForgotPasswordForm() {
  const [email, setEmail] = useState('');
  const [error, setError] = useState<string | undefined>();
  const [sent, setSent] = useState(false);
  const [failed, setFailed] = useState(false);
  const [loading, setLoading] = useState(false);
  const supabase = createClient();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const found = emailError(email);
    setError(found);
    if (found) return;

    setLoading(true);
    setFailed(false);
    try {
      // The recovery link goes through /auth/confirm, which starts a session and opens /reset-password.
      const { error: resetError } = await supabase.auth.resetPasswordForEmail(email.trim(), {
        redirectTo: `${window.location.origin}/auth/confirm?type=recovery&next=/reset-password`,
      });
      // Any other error (user not found etc.) gets the generic answer, like a success (NAB-140).
      if (resetError && isAuthNetworkError(resetError)) setFailed(true);
      else setSent(true);
    } catch {
      // The request failed outright (offline, blocked): let the user try again.
      setFailed(true);
    } finally {
      setLoading(false);
    }
  };

  if (sent) {
    return (
      <Alert severity="success">
        {RESET_SENT}. <Link href="/login">العودة لتسجيل الدخول</Link>
      </Alert>
    );
  }

  return (
    <Box component="form" noValidate onSubmit={handleSubmit} sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
      {failed && <Alert severity="error">{RESET_REQUEST_FAILED}</Alert>}
      <TextField
        label="البريد الإلكتروني"
        variant="outlined"
        type="email"
        autoComplete="email"
        fullWidth
        required
        value={email}
        onChange={(e) => {
          setEmail(e.target.value);
          if (error) setError(undefined);
        }}
        error={Boolean(error)}
        helperText={error}
        inputProps={ltrInput}
        disabled={loading}
      />
      <Button variant="contained" size="large" type="submit" fullWidth sx={{ mt: 2 }} disabled={loading}>
        {loading ? 'جاري الإرسال...' : 'أرسل رابط إعادة التعيين'}
      </Button>
    </Box>
  );
}
