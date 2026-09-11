'use client';

import { useState } from 'react';
import { Box, Button, TextField, Typography, Alert, FormControl, InputLabel, Select, MenuItem, SelectChangeEvent } from '@mui/material';
import { createClient } from '@/utils/supabase/client';
import { useRouter, useSearchParams } from 'next/navigation';

export default function RegisterForm() {
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState('parent');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const router = useRouter();
  const searchParams = useSearchParams();
  const supabase = createClient();
  const redirectTo = searchParams.get('redirectTo') || '/dashboard';

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const { error: signUpError } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          first_name: firstName,
          last_name: lastName,
          role: role,
        },
      },
    });

    if (signUpError) {
      setError(signUpError.message);
      setLoading(false);
    } else {
      router.push(redirectTo);
      router.refresh();
    }
  };

  return (
    <Box component="form" onSubmit={handleRegister} sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
      {error && <Alert severity="error">{error}</Alert>}
      <Box sx={{ display: 'flex', gap: 2 }}>
        <TextField
          label="الاسم الأول"
          variant="outlined"
          fullWidth
          required
          value={firstName}
          onChange={(e) => setFirstName(e.target.value)}
          disabled={loading}
        />
        <TextField
          label="الاسم الأخير"
          variant="outlined"
          fullWidth
          required
          value={lastName}
          onChange={(e) => setLastName(e.target.value)}
          disabled={loading}
        />
      </Box>
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
          <MenuItem value="teacher">معلم</MenuItem>
        </Select>
      </FormControl>
      <Button variant="contained" size="large" type="submit" fullWidth sx={{ mt: 2 }} disabled={loading}>
        {loading ? 'جاري التسجيل...' : 'إنشاء حساب'}
      </Button>
    </Box>
  );
}
