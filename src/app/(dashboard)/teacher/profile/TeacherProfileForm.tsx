'use client';

import { useState, useEffect } from 'react';
import {
  Box, Button, TextField, Typography, Alert, FormControl,
  InputLabel, Select, MenuItem, SelectChangeEvent,
  CircularProgress, Chip, OutlinedInput
} from '@mui/material';
import {
  getGovernorates, getServiceCategories, getEducationLevels,
  Governorate, ServiceCategory, EducationLevel
} from '@/services/lookups';
import { updateEducatorProfile, uploadAvatar } from '@/services/profile';
import type { EducatorGender } from '@/types/database';
import { useRouter } from 'next/navigation';

interface TeacherProfileFormProps {
  userId: string;
  defaultFullName: string;
}

const PHONE_PATTERN = /^01[0125]\d{8}$/;

function toIds(values: string[]): number[] {
  return values.map((v) => parseInt(v, 10));
}

export default function TeacherProfileForm({ userId, defaultFullName }: TeacherProfileFormProps) {
  const [fullName, setFullName] = useState(defaultFullName);
  const [phone, setPhone] = useState('');
  const [whatsapp, setWhatsapp] = useState('');
  const [gender, setGender] = useState<EducatorGender | ''>('');
  const [governorateId, setGovernorateId] = useState<string>('');
  const [locationIds, setLocationIds] = useState<string[]>([]);
  const [bio, setBio] = useState('');
  const [experience, setExperience] = useState<number | ''>('');
  const [subjectIds, setSubjectIds] = useState<string[]>([]);
  const [levelIds, setLevelIds] = useState<string[]>([]);
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  // Remember the last upload so retrying a failed save doesn't drop (or re-upload) the photo.
  const [uploadedAvatar, setUploadedAvatar] = useState<{ file: File; url: string } | null>(null);

  const [governoratesList, setGovernoratesList] = useState<Governorate[]>([]);
  const [categoriesList, setCategoriesList] = useState<ServiceCategory[]>([]);
  const [levelsList, setLevelsList] = useState<EducationLevel[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  useEffect(() => {
    async function loadData() {
      try {
        const [govData, catData, levelData] = await Promise.all([
          getGovernorates(),
          getServiceCategories(),
          getEducationLevels(),
        ]);
        setGovernoratesList(govData);
        setCategoriesList(catData);
        setLevelsList(levelData);
      } catch (err) {
        console.error(err);
        setError('فشل في تحميل البيانات الأساسية');
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, []);

  const handleMulti = (setter: (v: string[]) => void) => (event: SelectChangeEvent<string[]>) => {
    const { value } = event.target;
    setter(typeof value === 'string' ? value.split(',') : value);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!PHONE_PATTERN.test(phone)) {
      setError('رقم الهاتف غير صالح.');
      return;
    }
    if (whatsapp && !PHONE_PATTERN.test(whatsapp)) {
      setError('رقم الواتساب غير صالح.');
      return;
    }
    if (subjectIds.length === 0 || levelIds.length === 0) {
      setError('يرجى اختيار الخدمات والمراحل التي تدرّسها.');
      return;
    }

    setSaving(true);
    setError(null);

    try {
      let profileImage = uploadedAvatar?.url;
      if (avatarFile && avatarFile !== uploadedAvatar?.file) {
        profileImage = await uploadAvatar(userId, avatarFile);
        setUploadedAvatar({ file: avatarFile, url: profileImage });
      }
      // The home governorate always counts as a teaching location.
      const locations = Array.from(new Set([governorateId, ...locationIds]));

      await updateEducatorProfile(
        userId,
        {
          full_name: fullName.trim(),
          phone,
          whatsapp_number: whatsapp || null,
          governorate_id: parseInt(governorateId, 10),
          bio,
          experience_years: Number(experience),
          gender: gender || null,
          profile_image: profileImage,
        },
        {
          subjectIds: toIds(subjectIds),
          levelIds: toIds(levelIds),
          locationGovernorateIds: toIds(locations),
        }
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

  const nameById = <T extends { id: number; name_ar: string }>(list: T[], id: string) =>
    list.find((item) => item.id.toString() === id)?.name_ar ?? id;

  return (
    <Box component="form" onSubmit={handleSubmit} sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
      {error && <Alert severity="error">{error}</Alert>}

      <Typography variant="h6" color="primary">البيانات الأساسية</Typography>

      <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
        <Button variant="outlined" component="label">
          رفع صورة الملف الشخصي
          <input type="file" hidden accept="image/png, image/jpeg, image/webp" onChange={(e) => setAvatarFile(e.target.files?.[0] || null)} />
        </Button>
        {avatarFile && <Typography variant="body2">{avatarFile.name}</Typography>}
      </Box>

      <Box sx={{ display: 'flex', gap: 2, flexWrap: { xs: 'wrap', sm: 'nowrap' } }}>
        <TextField
          label="الاسم بالكامل"
          variant="outlined"
          fullWidth required
          value={fullName} onChange={(e) => setFullName(e.target.value)} disabled={saving}
        />
        <FormControl fullWidth disabled={saving}>
          <InputLabel id="gender-label">النوع</InputLabel>
          <Select labelId="gender-label" label="النوع" value={gender} onChange={(e) => setGender(e.target.value as EducatorGender | '')}>
            <MenuItem value="">بدون تحديد</MenuItem>
            <MenuItem value="male">معلم</MenuItem>
            <MenuItem value="female">معلمة</MenuItem>
          </Select>
        </FormControl>
      </Box>

      <Box sx={{ display: 'flex', gap: 2, flexWrap: { xs: 'wrap', sm: 'nowrap' } }}>
        <TextField
          label="رقم الهاتف"
          variant="outlined"
          fullWidth required
          helperText="لن يظهر للزوار، يُشارك فقط بعد قبول عرضك"
          value={phone} onChange={(e) => setPhone(e.target.value)} disabled={saving}
        />
        <TextField
          label="رقم الواتساب (اختياري)"
          variant="outlined"
          fullWidth
          value={whatsapp} onChange={(e) => setWhatsapp(e.target.value)} disabled={saving}
        />
      </Box>

      <Box sx={{ display: 'flex', gap: 2, flexWrap: { xs: 'wrap', sm: 'nowrap' } }}>
        <FormControl fullWidth required disabled={saving}>
          <InputLabel id="gov-label">محافظة الإقامة</InputLabel>
          <Select labelId="gov-label" label="محافظة الإقامة" value={governorateId} onChange={(e: SelectChangeEvent) => setGovernorateId(e.target.value)}>
            {governoratesList.map((gov) => (
              <MenuItem key={gov.id} value={gov.id.toString()}>{gov.name_ar}</MenuItem>
            ))}
          </Select>
        </FormControl>
        <FormControl fullWidth disabled={saving}>
          <InputLabel id="locations-label">محافظات أخرى تدرّس فيها</InputLabel>
          <Select
            labelId="locations-label"
            multiple
            value={locationIds}
            onChange={handleMulti(setLocationIds)}
            input={<OutlinedInput label="محافظات أخرى تدرّس فيها" />}
            renderValue={(selected) => (
              <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                {selected.map((value) => <Chip key={value} label={nameById(governoratesList, value)} />)}
              </Box>
            )}
          >
            {governoratesList.map((gov) => (
              <MenuItem key={gov.id} value={gov.id.toString()}>{gov.name_ar}</MenuItem>
            ))}
          </Select>
        </FormControl>
      </Box>

      <Typography variant="h6" color="primary" mt={2}>التخصص والخبرة</Typography>
      <FormControl fullWidth required disabled={saving}>
        <InputLabel id="subject-label">الخدمات التي تقدمها</InputLabel>
        <Select
          labelId="subject-label"
          multiple
          value={subjectIds}
          onChange={handleMulti(setSubjectIds)}
          input={<OutlinedInput label="الخدمات التي تقدمها" />}
          renderValue={(selected) => (
            <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
              {selected.map((value) => <Chip key={value} label={nameById(categoriesList, value)} />)}
            </Box>
          )}
        >
          {categoriesList.map((cat) => (
            <MenuItem key={cat.id} value={cat.id.toString()}>{cat.name_ar}</MenuItem>
          ))}
        </Select>
      </FormControl>

      <Box sx={{ display: 'flex', gap: 2, flexWrap: { xs: 'wrap', sm: 'nowrap' } }}>
        <FormControl fullWidth required disabled={saving}>
          <InputLabel id="level-label">المراحل التعليمية</InputLabel>
          <Select
            labelId="level-label"
            multiple
            value={levelIds}
            onChange={handleMulti(setLevelIds)}
            input={<OutlinedInput label="المراحل التعليمية" />}
            renderValue={(selected) => (
              <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                {selected.map((value) => <Chip key={value} label={nameById(levelsList, value)} />)}
              </Box>
            )}
          >
            {levelsList.map((level) => (
              <MenuItem key={level.id} value={level.id.toString()}>
                {level.name_ar} ({level.min_age}-{level.max_age} سنوات)
              </MenuItem>
            ))}
          </Select>
        </FormControl>

        <TextField
          label="سنوات الخبرة"
          type="number"
          variant="outlined"
          fullWidth required
          inputProps={{ min: 0 }}
          value={experience} onChange={(e) => setExperience(e.target.value === '' ? '' : Math.max(0, parseInt(e.target.value, 10) || 0))} disabled={saving}
        />
      </Box>

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
