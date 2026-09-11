'use client';

import { useState, useEffect } from 'react';
import { 
  Box, Button, TextField, Typography, Alert, FormControl, 
  InputLabel, Select, MenuItem, SelectChangeEvent, 
  CircularProgress, Chip, OutlinedInput 
} from '@mui/material';
import { getGovernorates, getSubjects, Governorate, Subject } from '@/services/lookups';
import { updateTeacherProfile, uploadAvatar } from '@/services/profile';
import { useRouter } from 'next/navigation';

interface TeacherProfileFormProps {
  userId: string;
}

const TEACHING_METHODS = ['حضوري', 'أونلاين', 'الاثنين معاً'];

export default function TeacherProfileForm({ userId }: TeacherProfileFormProps) {
  const [phone, setPhone] = useState('');
  const [governorateId, setGovernorateId] = useState<string>('');
  const [areas, setAreas] = useState('');
  const [bio, setBio] = useState('');
  const [experience, setExperience] = useState<number | ''>('');
  const [methods, setMethods] = useState<string[]>([]);
  const [selectedSubjects, setSelectedSubjects] = useState<string[]>([]);
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  
  const [governoratesList, setGovernoratesList] = useState<Governorate[]>([]);
  const [subjectsList, setSubjectsList] = useState<Subject[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  useEffect(() => {
    async function loadData() {
      try {
        const [govData, subData] = await Promise.all([getGovernorates(), getSubjects()]);
        setGovernoratesList(govData);
        setSubjectsList(subData);
      } catch (err) {
        console.error(err);
        setError('فشل في تحميل البيانات الأساسية');
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, []);

  const handleMethodChange = (event: SelectChangeEvent<typeof methods>) => {
    const { target: { value } } = event;
    setMethods(typeof value === 'string' ? value.split(',') : value);
  };

  const handleSubjectChange = (event: SelectChangeEvent<typeof selectedSubjects>) => {
    const { target: { value } } = event;
    setSelectedSubjects(typeof value === 'string' ? value.split(',') : value);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!phone.match(/^01[0-2,5]\d{8}$/)) {
      setError('رقم الهاتف غير صالح.');
      return;
    }
    if (methods.length === 0 || selectedSubjects.length === 0) {
      setError('يرجى اختيار المواد وطرق التدريس.');
      return;
    }
    
    setSaving(true);
    setError(null);

    try {
      if (avatarFile) {
        await uploadAvatar(userId, avatarFile);
      }

      await updateTeacherProfile(
        userId, 
        {
          phone,
          governorate_id: parseInt(governorateId),
          area: areas, // Storing primary areas as a comma-separated string for simplicity in base profile
          is_profile_complete: true,
        },
        {
          bio,
          years_experience: Number(experience),
          teaching_methods: methods,
          areas_covered: areas.split(',').map(s => s.trim())
        },
        selectedSubjects.map(id => parseInt(id))
      );
      router.push('/teacher');
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
      
      <Typography variant="h6" color="primary">البيانات الأساسية</Typography>
      
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
        <Button variant="outlined" component="label">
          رفع صورة الملف الشخصي
          <input type="file" hidden accept="image/png, image/jpeg" onChange={(e) => setAvatarFile(e.target.files?.[0] || null)} />
        </Button>
        {avatarFile && <Typography variant="body2">{avatarFile.name}</Typography>}
      </Box>

      <Box sx={{ display: 'flex', gap: 2, flexWrap: { xs: 'wrap', sm: 'nowrap' } }}>
        <TextField
          label="رقم الهاتف"
          variant="outlined"
          fullWidth required
          value={phone} onChange={(e) => setPhone(e.target.value)} disabled={saving}
        />
        <FormControl fullWidth required disabled={saving}>
          <InputLabel id="gov-label">المحافظة</InputLabel>
          <Select labelId="gov-label" label="المحافظة" value={governorateId} onChange={(e: SelectChangeEvent) => setGovernorateId(e.target.value)}>
            {governoratesList.map((gov) => (
              <MenuItem key={gov.id} value={gov.id.toString()}>{gov.name}</MenuItem>
            ))}
          </Select>
        </FormControl>
      </Box>

      <Typography variant="h6" color="primary" mt={2}>التخصص والخبرة</Typography>
      <FormControl fullWidth required disabled={saving}>
        <InputLabel id="subject-label">المواد التي تدرسها</InputLabel>
        <Select
          labelId="subject-label"
          multiple
          value={selectedSubjects}
          onChange={handleSubjectChange}
          input={<OutlinedInput label="المواد التي تدرسها" />}
          renderValue={(selected) => (
            <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
              {selected.map((value) => {
                const sub = subjectsList.find(s => s.id.toString() === value);
                return <Chip key={value} label={sub ? `${sub.name} (${sub.level})` : value} />;
              })}
            </Box>
          )}
        >
          {subjectsList.map((sub) => (
            <MenuItem key={sub.id} value={sub.id.toString()}>{sub.name} - {sub.level}</MenuItem>
          ))}
        </Select>
      </FormControl>

      <Box sx={{ display: 'flex', gap: 2, flexWrap: { xs: 'wrap', sm: 'nowrap' } }}>
        <FormControl fullWidth required disabled={saving}>
          <InputLabel id="method-label">طرق التدريس</InputLabel>
          <Select
            labelId="method-label"
            multiple
            value={methods}
            onChange={handleMethodChange}
            input={<OutlinedInput label="طرق التدريس" />}
            renderValue={(selected) => (
              <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                {selected.map((value) => <Chip key={value} label={value} />)}
              </Box>
            )}
          >
            {TEACHING_METHODS.map((name) => (
              <MenuItem key={name} value={name}>{name}</MenuItem>
            ))}
          </Select>
        </FormControl>

        <TextField
          label="سنوات الخبرة"
          type="number"
          variant="outlined"
          fullWidth required
          value={experience} onChange={(e) => setExperience(parseInt(e.target.value) || '')} disabled={saving}
        />
      </Box>

      <TextField
        label="المناطق التي تغطيها"
        variant="outlined"
        fullWidth required
        helperText="افصل بين المناطق بفاصلة، مثال: المعادي، المهندسين"
        value={areas} onChange={(e) => setAreas(e.target.value)} disabled={saving}
      />

      <TextField
        label="نبذة عنك (Bio)"
        variant="outlined"
        multiline
        rows={4}
        fullWidth required
        value={bio} onChange={(e) => setBio(e.target.value)} disabled={saving}
      />

      <Button variant="contained" size="large" type="submit" disabled={saving} sx={{ mt: 2 }}>
        {saving ? 'جاري الحفظ...' : 'حفظ الملف الشخصي'}
      </Button>
    </Box>
  );
}
