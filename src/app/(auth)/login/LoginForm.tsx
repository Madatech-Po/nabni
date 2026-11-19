'use client';

import { useState } from 'react';
import { Box, Button, TextField, Typography, Alert } from '@mui/material';
import { createClient } from '@/utils/supabase/client';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';

// Set by /auth/confirm when an email link is expired, already used or broken.
export const LINK_ERROR = 'الرابط غير صالح أو انتهت صلاحيته، اطلب رابطاً جديداً';

export default function LoginForm() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const router = useRouter();
  const searchParams = useSearchParams();
  const redirectTo = searchParams.get('redirectTo') || '/dashboard';
  const linkError = searchParams.get('error') === 'link';
  const supabase = createClient();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const { error: signInError } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (signInError) {
      setError(signInError.message);
    } else {
      router.push(redirectTo);
      router.refresh();
    }
    setLoading(false);
  };

  return (
    <Box component="form" onSubmit={handleLogin} sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
      {linkError && !error && <Alert severity="warning">{LINK_ERROR}</Alert>}
      {error && <Alert severity="error">{error}</Alert>}
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
