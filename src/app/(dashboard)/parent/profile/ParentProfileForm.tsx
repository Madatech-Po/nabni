'use client';

import { useState, useEffect } from 'react';
import { Box, Button, TextField, Typography, Alert, FormControl, InputLabel, Select, MenuItem, SelectChangeEvent, CircularProgress } from '@mui/material';
import { getGovernorates, Governorate } from '@/services/lookups';
import { updateParentProfile } from '@/services/profile';
import { useRouter } from 'next/navigation';

interface ParentProfileFormProps {
  userId: string;
}

export default function ParentProfileForm({ userId }: ParentProfileFormProps) {
  const [phone, setPhone] = useState('');
  const [governorateId, setGovernorateId] = useState<string>('');
  const [area, setArea] = useState('');
  const [governorates, setGovernorates] = useState<Governorate[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  useEffect(() => {
    async function loadData() {
      try {
        const data = await getGovernorates();
        setGovernorates(data);
      } catch (err) {
        console.error(err);
        setError('فشل في تحميل المحافظات');
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!phone.match(/^01[0-2,5]\d{8}$/)) {
      setError('رقم الهاتف غير صالح. يجب أن يكون رقم مصري من 11 رقماً.');
      return;
    }
    
    setSaving(true);
    setError(null);

    try {
      await updateParentProfile(userId, {
        phone,
        governorate_id: parseInt(governorateId),
        area,
        is_profile_complete: true,
      });
      router.push('/parent');
      router.refresh();
    } catch (err: any) {
      setError(err.message || 'حدث خطأ أثناء الحفظ');
      setSaving(false);
    }
  };

  if (loading) {
    return <Box sx={{ display: 'flex', justifyContent: 'center', p: 4 }}><CircularProgress /></Box>;
  }

  return (
    <Box component="form" onSubmit={handleSubmit} sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
      {error && <Alert severity="error">{error}</Alert>}
      
      <TextField
        label="رقم الهاتف"
        variant="outlined"
        fullWidth
        required
        value={phone}
        onChange={(e) => setPhone(e.target.value)}
        disabled={saving}
        placeholder="مثال: 01012345678"
      />

      <FormControl fullWidth required disabled={saving}>
        <InputLabel id="gov-label">المحافظة</InputLabel>
        <Select
          labelId="gov-label"
          label="المحافظة"
          value={governorateId}
          onChange={(e: SelectChangeEvent) => setGovernorateId(e.target.value)}
        >
          {governorates.map((gov) => (
            <MenuItem key={gov.id} value={gov.id.toString()}>{gov.name}</MenuItem>
          ))}
        </Select>
      </FormControl>

      <TextField
        label="المنطقة / الحي"
        variant="outlined"
        fullWidth
        required
        value={area}
        onChange={(e) => setArea(e.target.value)}
        disabled={saving}
        placeholder="مثال: مدينة نصر، المعادي"
      />

      <Button variant="contained" size="large" type="submit" disabled={saving}>
        {saving ? 'جاري الحفظ...' : 'حفظ وإكمال البيانات'}
      </Button>
    </Box>
  );
}
