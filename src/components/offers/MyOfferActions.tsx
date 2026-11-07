'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Alert, Box, Button, Dialog, DialogActions, DialogContent, DialogContentText, DialogTitle } from '@mui/material';
import { offerErrorMessage, withdrawOffer } from '@/services/myOffers';

/** Edit / withdraw for a pending offer (other statuses have no actions). */
export default function MyOfferActions({ offerId }: { offerId: string }) {
  const router = useRouter();
  const [confirming, setConfirming] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function withdraw() {
    setSaving(true);
    setError(null);
    try {
      await withdrawOffer(offerId);
      setConfirming(false);
      router.refresh();
    } catch (err) {
      setError(offerErrorMessage(err));
    } finally {
      setSaving(false);
    }
  }

  return (
    <>
      {error && !confirming && <Alert severity="error" sx={{ mb: 1.5 }}>{error}</Alert>}
      <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
        <Button component={Link} href={`/teacher/offers/${offerId}/edit`} size="small" variant="outlined" disabled={saving}>
          تعديل العرض
        </Button>
        <Button size="small" variant="contained" color="warning" disabled={saving} onClick={() => setConfirming(true)}>
          سحب العرض
        </Button>
      </Box>

      <Dialog open={confirming} onClose={() => !saving && setConfirming(false)} fullWidth maxWidth="xs">
        <DialogTitle>سحب العرض؟</DialogTitle>
        <DialogContent>
          {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
          <DialogContentText>
            لن يرى ولي الأمر عرضك بعد سحبه. يمكنك تقديم عرض جديد ما دام الطلب مفتوحاً.
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => { setConfirming(false); setError(null); }} disabled={saving}>تراجع</Button>
          <Button variant="contained" color="warning" onClick={withdraw} disabled={saving}>سحب العرض</Button>
        </DialogActions>
      </Dialog>
    </>
  );
}
