'use client';

import { useState } from 'react';
import { Alert, Box, Button, TextField } from '@mui/material';
import Link from 'next/link';
import { createClient } from '@/utils/supabase/client';
import { emailError } from '../register/registerFormValues';

// Shown whatever Supabase answers, so the page never reveals which emails have an account.
export const RESET_SENT = 'إذا كان البريد مسجلاً لدينا فستصلك رسالة لإعادة تعيين كلمة المرور';

const ltrInput = { dir: 'ltr' as const, style: { textAlign: 'left' as const } };

export default function ForgotPasswordForm() {
  const [email, setEmail] = useState('');
  const [error, setError] = useState<string | undefined>();
  const [sent, setSent] = useState(false);
  const [loading, setLoading] = useState(false);
  const supabase = createClient();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const found = emailError(email);
    setError(found);
    if (found) return;

    setLoading(true);
    try {
      // The recovery link goes through /auth/confirm, which starts a session and opens /reset-password.
      await supabase.auth.resetPasswordForEmail(email.trim(), {
        redirectTo: `${window.location.origin}/auth/confirm?type=recovery&next=/reset-password`,
      });
    } catch {
      // Ignored on purpose: the answer is the same either way.
    }
    setLoading(false);
    setSent(true);
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
