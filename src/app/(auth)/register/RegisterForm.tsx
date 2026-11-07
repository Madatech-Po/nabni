'use client';

import { useState } from 'react';
import { Box, Button, TextField, Alert, FormControl, InputLabel, Select, MenuItem, SelectChangeEvent } from '@mui/material';
import { createClient } from '@/utils/supabase/client';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { authErrorMessage } from '@/utils/authErrors';
import {
  MIN_PASSWORD,
  validateRegisterForm,
  type RegisterFormErrors,
  type RegisterFormValues,
} from './registerFormValues';

// Emails and passwords are Latin text: keep them left-to-right inside the RTL page.
const ltrInput = { dir: 'ltr' as const, style: { textAlign: 'left' as const } };

export default function RegisterForm() {
  const [values, setValues] = useState<RegisterFormValues>({ firstName: '', lastName: '', email: '', password: '' });
  const [role, setRole] = useState('parent');
  const [errors, setErrors] = useState<RegisterFormErrors>({});
  const [error, setError] = useState<string | null>(null);
  const [confirmEmailSent, setConfirmEmailSent] = useState(false);
  const [loading, setLoading] = useState(false);
  const router = useRouter();
  const searchParams = useSearchParams();
  const supabase = createClient();
  const redirectTo = searchParams.get('redirectTo') || '/dashboard';

  const setField = (field: keyof RegisterFormValues) => (e: React.ChangeEvent<HTMLInputElement>) => {
    setValues((current) => ({ ...current, [field]: e.target.value }));
    if (errors[field]) setErrors((current) => ({ ...current, [field]: undefined }));
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    const found = validateRegisterForm(values);
    setErrors(found);
    if (Object.keys(found).length > 0) return;

    setLoading(true);
    const { data, error: signUpError } = await supabase.auth.signUp({
      email: values.email.trim(),
      password: values.password,
      options: {
        data: {
          full_name: `${values.firstName.trim()} ${values.lastName.trim()}`.trim(),
          role: role,
        },
      },
    });

    if (signUpError) {
      setError(authErrorMessage(signUpError));
      setLoading(false);
    } else if (!data.session) {
      // Email confirmation is on: there is no session until the link is clicked.
      setConfirmEmailSent(true);
      setLoading(false);
    } else {
      router.push(redirectTo);
      router.refresh();
    }
  };

  if (confirmEmailSent) {
    return (
      <Alert severity="success">
        تم إنشاء حسابك. أرسلنا رسالة تأكيد إلى {values.email.trim()} — افتحها واضغط على الرابط، ثم{' '}
        <Link href="/login">سجّل الدخول</Link>.
      </Alert>
    );
  }

  return (
    <Box component="form" noValidate onSubmit={handleRegister} sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
      {error && <Alert severity="error">{error}</Alert>}
      <Box sx={{ display: 'flex', gap: 2 }}>
        <TextField
          label="الاسم الأول"
          variant="outlined"
          fullWidth
          required
          value={values.firstName}
          onChange={setField('firstName')}
          error={Boolean(errors.firstName)}
          helperText={errors.firstName}
          disabled={loading}
        />
        <TextField
          label="الاسم الأخير"
          variant="outlined"
          fullWidth
          required
          value={values.lastName}
          onChange={setField('lastName')}
          error={Boolean(errors.lastName)}
          helperText={errors.lastName}
          disabled={loading}
        />
      </Box>
      <TextField
        label="البريد الإلكتروني"
        variant="outlined"
        type="email"
        autoComplete="email"
        fullWidth
        required
        value={values.email}
        onChange={setField('email')}
        error={Boolean(errors.email)}
        helperText={errors.email}
        inputProps={ltrInput}
        disabled={loading}
      />
      <TextField
        label="كلمة المرور"
        variant="outlined"
        type="password"
        autoComplete="new-password"
        fullWidth
        required
        value={values.password}
        onChange={setField('password')}
        error={Boolean(errors.password)}
        helperText={errors.password ?? `${MIN_PASSWORD} أحرف على الأقل، بحروف إنجليزية أو أرقام`}
        inputProps={ltrInput}
        disabled={loading}
      />
      <FormControl fullWidth>
        <InputLabel id="role-label">نوع الحساب</InputLabel>
        <Select
          labelId="role-label"
          label="نوع الحساب"
          value={role}
          onChange={(e: SelectChangeEvent) => setRole(e.target.value)}
          disabled={loading}
        >
          <MenuItem value="parent">ولي أمر</MenuItem>
          <MenuItem value="educator">معلم</MenuItem>
        </Select>
      </FormControl>
      <Button variant="contained" size="large" type="submit" fullWidth sx={{ mt: 2 }} disabled={loading}>
        {loading ? 'جاري التسجيل...' : 'إنشاء حساب'}
      </Button>
    </Box>
  );
}
