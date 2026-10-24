'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  Alert, Box, Button, FormControl, FormHelperText, Grid, InputLabel, MenuItem, Select, TextField,
} from '@mui/material';
import { createRequest, updateRequest } from '@/services/myRequests';
import type { EducationLevel, Governorate, PricingUnit, ServiceCategory, TeachingPlace } from '@/services/lookups';
import {
  EMPTY_REQUEST_FORM, MAX_AGE, MIN_AGE, MIN_DESCRIPTION, toRequestInput, validateRequestForm,
  type RequestFormErrors, type RequestFormValues,
} from './requestFormValues';

export interface RequestFormLookups {
  services: ServiceCategory[];
  levels: EducationLevel[];
  places: TeachingPlace[];
  governorates: Governorate[];
  pricingUnits: PricingUnit[];
}

type Option = { value: string; label: string };

const toOptions = (rows: { id: number; name_ar: string }[]): Option[] =>
  rows.map((r) => ({ value: String(r.id), label: r.name_ar }));

// Supabase errors are plain objects ({ code, message }), not Error instances.
function saveErrorMessage(err: unknown): string {
  const { code, message } = (err ?? {}) as { code?: string; message?: string };
  // RLS refused the row: not a parent, or the account was suspended meanwhile.
  if (code === '42501') return 'لا يمكن حفظ الطلب. تأكد أن حسابك حساب ولي أمر مفعّل.';
  return message || 'حدث خطأ أثناء الحفظ';
}

const GENDER_OPTIONS: Option[] = [
  { value: 'female', label: 'معلمة' },
  { value: 'male', label: 'معلم' },
];

export default function RequestForm({
  lookups,
  parentId,
  requestId,
  initialValues = EMPTY_REQUEST_FORM,
}: {
  lookups: RequestFormLookups;
  parentId: string;
  /** Set when editing an existing request. */
  requestId?: string;
  initialValues?: RequestFormValues;
}) {
  const router = useRouter();
  const [values, setValues] = useState(initialValues);
  const [errors, setErrors] = useState<RequestFormErrors>({});
  const [saving, setSaving] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  function set<K extends keyof RequestFormValues>(key: K, value: RequestFormValues[K]) {
    setValues((v) => ({ ...v, [key]: value }));
    setErrors((e) => ({ ...e, [key]: undefined }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const found = validateRequestForm(values);
    setErrors(found);
    if (Object.keys(found).length > 0) return;

    setSaving(true);
    setSubmitError(null);
    try {
      const input = toRequestInput(values);
      if (requestId) await updateRequest(requestId, input);
      else await createRequest(parentId, input);
      router.push('/parent/requests');
      router.refresh();
    } catch (err) {
      setSubmitError(saveErrorMessage(err));
      setSaving(false);
    }
  }

  function select(key: keyof RequestFormValues, label: string, options: Option[], required: boolean, emptyLabel?: string) {
    const id = `request-${key}`;
    return (
      <FormControl fullWidth required={required} error={Boolean(errors[key])} disabled={saving}>
        <InputLabel id={id}>{label}</InputLabel>
        <Select
          labelId={id}
          label={label}
          value={values[key]}
          onChange={(e) => set(key, e.target.value as never)}
        >
          {emptyLabel && <MenuItem value="">{emptyLabel}</MenuItem>}
          {options.map((o) => (
            <MenuItem key={o.value} value={o.value}>{o.label}</MenuItem>
          ))}
        </Select>
        {errors[key] && <FormHelperText>{errors[key]}</FormHelperText>}
      </FormControl>
    );
  }

  const descriptionLength = values.description.trim().length;

  return (
    <Box component="form" noValidate onSubmit={handleSubmit}>
      {submitError && <Alert severity="error" sx={{ mb: 3 }}>{submitError}</Alert>}

      <Grid container spacing={3}>
        <Grid item xs={12} md={6}>{select('serviceCategoryId', 'الخدمة المطلوبة', toOptions(lookups.services), true)}</Grid>
        <Grid item xs={12} md={6}>
          {select('educationLevelId', 'المرحلة', toOptions(lookups.levels), false, 'غير محدد')}
        </Grid>

        <Grid item xs={12} md={6}>
          <TextField
            label="عمر الطفل (بالسنوات)"
            type="number"
            required
            fullWidth
            value={values.studentAge}
            onChange={(e) => set('studentAge', e.target.value)}
            error={Boolean(errors.studentAge)}
            helperText={errors.studentAge}
            inputProps={{ min: MIN_AGE, max: MAX_AGE }}
            disabled={saving}
          />
        </Grid>
        <Grid item xs={12} md={6}>
          {select('preferredGender', 'تفضيل المتخصص', GENDER_OPTIONS, false, 'لا يوجد تفضيل')}
        </Grid>

        <Grid item xs={12} md={6}>{select('teachingPlaceId', 'مكان التدريس', toOptions(lookups.places), true)}</Grid>
        <Grid item xs={12} md={6}>{select('governorateId', 'المحافظة', toOptions(lookups.governorates), true)}</Grid>

        <Grid item xs={12}>
          <TextField
            label="المنطقة / الحي (اختياري)"
            fullWidth
            value={values.area}
            onChange={(e) => set('area', e.target.value)}
            disabled={saving}
          />
        </Grid>

        <Grid item xs={12}>
          <TextField
            label="وصف الطلب"
            required
            fullWidth
            multiline
            minRows={4}
            value={values.description}
            onChange={(e) => set('description', e.target.value)}
            error={Boolean(errors.description)}
            helperText={errors.description ?? `${descriptionLength}/${MIN_DESCRIPTION} حرف على الأقل — اذكر احتياجات طفلك والمواعيد المناسبة`}
            disabled={saving}
          />
        </Grid>

        <Grid item xs={12} md={6}>
          <TextField
            label="الميزانية بالجنيه (اختياري)"
            type="number"
            fullWidth
            value={values.budget}
            onChange={(e) => set('budget', e.target.value)}
            error={Boolean(errors.budget)}
            helperText={errors.budget ?? 'اتركها فارغة لو قابلة للتفاوض'}
            inputProps={{ min: 1 }}
            disabled={saving}
          />
        </Grid>
        <Grid item xs={12} md={6}>
          {select('pricingUnitId', 'لكل', toOptions(lookups.pricingUnits), values.budget.trim() !== '', 'اختر الوحدة')}
        </Grid>
      </Grid>

      <Box sx={{ display: 'flex', gap: 2, mt: 4 }}>
        <Button type="submit" variant="contained" size="large" disabled={saving}>
          {requestId ? 'حفظ التعديلات' : 'نشر الطلب'}
        </Button>
        <Button component={Link} href="/parent/requests" variant="text" size="large" disabled={saving}>
          إلغاء
        </Button>
      </Box>
    </Box>
  );
}
