'use client';

import { useState } from 'react';
import { Box, Button, TextField, Typography, Alert } from '@mui/material';
import { createClient } from '@/utils/supabase/client';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { authErrorMessage, isEmailNotConfirmed } from '@/utils/authErrors';
import { safeNextPath } from '@/utils/safeRedirect';

// Set by /auth/confirm when an email link is expired, already used or broken.
export const LINK_ERROR = 'الرابط غير صالح أو انتهت صلاحيته، اطلب رابطاً جديداً';
export const RESEND_LABEL = 'إعادة إرسال رسالة التأكيد';
export const RESEND_SENT = 'أرسلنا رسالة تأكيد جديدة — افتحها واضغط على الرابط لتفعيل حسابك والدخول مباشرة';

export default function LoginForm() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [unconfirmed, setUnconfirmed] = useState(false);
  const [resendState, setResendState] = useState<'idle' | 'sending' | 'sent'>('idle');
  const router = useRouter();
  const searchParams = useSearchParams();
  // Only follow internal paths: ?redirectTo=//evil.com must not send the user off the site.
  const redirectTo = safeNextPath(searchParams.get('redirectTo'), '/dashboard');
  const linkError = searchParams.get('error') === 'link';
  const supabase = createClient();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setUnconfirmed(false);
    setResendState('idle');

    const { error: signInError } = await supabase.auth.signInWithPassword({
      email: email.trim(),
      password,
    });

    if (signInError) {
      setError(authErrorMessage(signInError));
      setUnconfirmed(isEmailNotConfirmed(signInError));
    } else {
      router.push(redirectTo);
      router.refresh();
    }
    setLoading(false);
  };

  const handleResend = async () => {
    setResendState('sending');
    const { error: resendError } = await supabase.auth.resend({
      type: 'signup',
      email: email.trim(),
      options: { emailRedirectTo: `${window.location.origin}/auth/confirm` },
    });
    if (resendError) {
      setError(authErrorMessage(resendError));
      setResendState('idle');
    } else {
      setResendState('sent');
    }
  };

  return (
    <Box component="form" onSubmit={handleLogin} sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
      {linkError && !error && <Alert severity="warning">{LINK_ERROR}</Alert>}
      {error && resendState !== 'sent' && (
        <Alert
          severity="error"
          action={
            unconfirmed ? (
              <Button color="inherit" size="small" onClick={handleResend} disabled={resendState === 'sending'}>
                {RESEND_LABEL}
              </Button>
            ) : undefined
          }
        >
          {error}
        </Alert>
      )}
      {resendState === 'sent' && <Alert severity="success">{RESEND_SENT}</Alert>}
      <TextField
        label="البريد الإلكتروني"
        variant="outlined"
        type="email"
        fullWidth
        required
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        disabled={loading}
      />
      <TextField
        label="كلمة المرور"
        variant="outlined"
        type="password"
        fullWidth
        required
        value={password}
        onChange={(e) => setPassword(e.target.value)}
        disabled={loading}
      />
      <Typography variant="body2" sx={{ textAlign: 'start' }}>
        <Link href="/forgot-password" style={{ color: '#0d9488', textDecoration: 'none' }}>
          نسيت كلمة المرور؟
        </Link>
      </Typography>
      <Button variant="contained" size="large" type="submit" fullWidth sx={{ mt: 2 }} disabled={loading}>
        {loading ? 'جاري الدخول...' : 'دخول'}
      </Button>
    </Box>
  );
}
