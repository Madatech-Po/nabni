'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Alert, Box, Button, FormControl, FormHelperText, Grid, InputLabel, MenuItem, Select, TextField } from '@mui/material';
import { createOffer, offerErrorMessage, updateOffer } from '@/services/myOffers';
import type { PricingUnit } from '@/services/lookups';
import {
  EMPTY_OFFER_FORM, MAX_NOTES, toOfferInput, todayInCairo, validateOfferForm,
  type OfferFormErrors, type OfferFormValues,
} from './offerFormValues';

export default function OfferForm({
  requestId,
  educatorId,
  pricingUnits,
  offerId,
  initialValues = EMPTY_OFFER_FORM,
}: {
  requestId: string;
  educatorId: string;
  pricingUnits: PricingUnit[];
  /** Set when editing an existing pending offer. */
  offerId?: string;
  initialValues?: OfferFormValues;
}) {
  const router = useRouter();
  const [values, setValues] = useState(initialValues);
  const [errors, setErrors] = useState<OfferFormErrors>({});
  const [saving, setSaving] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const today = todayInCairo();

  function set<K extends keyof OfferFormValues>(key: K, value: OfferFormValues[K]) {
    setValues((v) => ({ ...v, [key]: value }));
    setErrors((e) => ({ ...e, [key]: undefined }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const found = validateOfferForm(values, today);
    setErrors(found);
    if (Object.keys(found).length > 0) return;

    setSaving(true);
    setSubmitError(null);
    try {
      const input = toOfferInput(values);
      if (offerId) await updateOffer(offerId, input);
      else await createOffer(requestId, educatorId, input);
      router.push('/teacher/offers');
      router.refresh();
    } catch (err) {
      setSubmitError(offerErrorMessage(err));
      setSaving(false);
    }
  }

  return (
    <Box component="form" noValidate onSubmit={handleSubmit}>
      {submitError && <Alert severity="error" sx={{ mb: 3 }}>{submitError}</Alert>}

      <Grid container spacing={3}>
        <Grid item xs={12} md={6}>
          <TextField
            label="السعر بالجنيه"
            type="number"
            required
            fullWidth
            value={values.price}
            onChange={(e) => set('price', e.target.value)}
            error={Boolean(errors.price)}
            helperText={errors.price}
            inputProps={{ min: 1 }}
            disabled={saving}
          />
        </Grid>
        <Grid item xs={12} md={6}>
          <FormControl fullWidth required error={Boolean(errors.pricingUnitId)} disabled={saving}>
            <InputLabel id="offer-pricing-unit">لكل</InputLabel>
            <Select
              labelId="offer-pricing-unit"
              label="لكل"
              value={values.pricingUnitId}
              onChange={(e) => set('pricingUnitId', e.target.value)}
            >
              {pricingUnits.map((u) => (
                <MenuItem key={u.id} value={String(u.id)}>{u.name_ar}</MenuItem>
              ))}
            </Select>
            {errors.pricingUnitId && <FormHelperText>{errors.pricingUnitId}</FormHelperText>}
          </FormControl>
        </Grid>

        <Grid item xs={12}>
          <TextField
            label="المواعيد المتاحة لك"
            required
            fullWidth
            multiline
            minRows={2}
            value={values.schedule}
            onChange={(e) => set('schedule', e.target.value)}
            error={Boolean(errors.schedule)}
            helperText={errors.schedule ?? 'مثلاً: السبت والثلاثاء من 5 إلى 7 مساءً'}
            disabled={saving}
          />
        </Grid>

        <Grid item xs={12} md={6}>
          <TextField
            label="تاريخ البدء المتوقع (اختياري)"
            type="date"
            fullWidth
            InputLabelProps={{ shrink: true }}
            inputProps={{ min: today }}
            value={values.startDate}
            onChange={(e) => set('startDate', e.target.value)}
            error={Boolean(errors.startDate)}
            helperText={errors.startDate}
            disabled={saving}
          />
        </Grid>

        <Grid item xs={12}>
          <TextField
            label="رسالة لولي الأمر (اختياري)"
            fullWidth
            multiline
            minRows={3}
            value={values.notes}
            onChange={(e) => set('notes', e.target.value)}
            error={Boolean(errors.notes)}
            helperText={errors.notes ?? `عرّف بنفسك وبطريقتك في التأسيس (${values.notes.trim().length}/${MAX_NOTES})`}
            disabled={saving}
          />
        </Grid>
      </Grid>

      <Alert severity="info" sx={{ mt: 3 }}>
        لا يرى المتخصصون الآخرون عرضك، ولن يظهر رقم هاتفك لولي الأمر إلا إذا قَبِل العرض.
      </Alert>

      <Box sx={{ display: 'flex', gap: 2, mt: 3 }}>
        <Button type="submit" variant="contained" size="large" disabled={saving}>
          {offerId ? 'حفظ التعديلات' : 'إرسال العرض'}
        </Button>
        <Button component={Link} href={offerId ? '/teacher/offers' : '/requests'} variant="text" size="large" disabled={saving}>
          إلغاء
        </Button>
      </Box>
    </Box>
  );
}
