'use client';

import { useEffect, useState } from 'react';
import { Alert, Box, Button, CircularProgress, TextField } from '@mui/material';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { createClient } from '@/utils/supabase/client';
import { authErrorMessage } from '@/utils/authErrors';
import { MIN_PASSWORD, passwordError } from '../register/registerFormValues';

export const MISMATCH = 'كلمتا المرور غير متطابقتين';

const ltrInput = { dir: 'ltr' as const, style: { textAlign: 'left' as const } };

interface Errors {
  password?: string;
  confirm?: string;
}

// The recovery email link (via /auth/confirm) signs the user in; this form then sets the new password.
export default function ResetPasswordForm() {
  const [hasSession, setHasSession] = useState<boolean | null>(null);
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [errors, setErrors] = useState<Errors>({});
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const router = useRouter();
  const [supabase] = useState(createClient);

  useEffect(() => {
    let active = true;
    supabase.auth.getUser().then(({ data }) => {
      if (active) setHasSession(Boolean(data.user));
    });
    return () => {
      active = false;
    };
  }, [supabase]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    const found: Errors = {};
    const bad = passwordError(password);
    if (bad) found.password = bad;
    if (!confirm) found.confirm = 'أعد كتابة كلمة المرور';
    else if (!bad && confirm !== password) found.confirm = MISMATCH;
    setErrors(found);
    if (Object.keys(found).length > 0) return;

    setLoading(true);
    const { error: updateError } = await supabase.auth.updateUser({ password });
    if (updateError) {
      setError(authErrorMessage(updateError));
      setLoading(false);
      return;
    }
    router.push('/dashboard');
    router.refresh();
  };

  if (hasSession === null) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', py: 2 }}>
        <CircularProgress size={28} aria-label="جاري التحميل" />
      </Box>
    );
  }

  if (!hasSession) {
    return (
      <Alert severity="info">
        افتح الرابط من رسالة البريد لتعيين كلمة مرور جديدة. لم تصلك رسالة؟{' '}
        <Link href="/forgot-password">اطلب رابطاً جديداً</Link>
      </Alert>
    );
  }

  return (
    <Box component="form" noValidate onSubmit={handleSubmit} sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
      {error && <Alert severity="error">{error}</Alert>}
      <TextField
        label="كلمة المرور الجديدة"
        variant="outlined"
        type="password"
        autoComplete="new-password"
        fullWidth
        required
        value={password}
        onChange={(e) => {
          setPassword(e.target.value);
          if (errors.password) setErrors((current) => ({ ...current, password: undefined }));
        }}
        error={Boolean(errors.password)}
        helperText={errors.password ?? `${MIN_PASSWORD} أحرف على الأقل، بحروف إنجليزية أو أرقام`}
        inputProps={ltrInput}
        disabled={loading}
      />
      <TextField
        label="تأكيد كلمة المرور الجديدة"
        variant="outlined"
        type="password"
        autoComplete="new-password"
        fullWidth
        required
        value={confirm}
        onChange={(e) => {
          setConfirm(e.target.value);
          if (errors.confirm) setErrors((current) => ({ ...current, confirm: undefined }));
        }}
        error={Boolean(errors.confirm)}
        helperText={errors.confirm}
        inputProps={ltrInput}
        disabled={loading}
      />
      <Button variant="contained" size="large" type="submit" fullWidth sx={{ mt: 2 }} disabled={loading}>
        {loading ? 'جاري الحفظ...' : 'حفظ كلمة المرور'}
      </Button>
    </Box>
  );
}
