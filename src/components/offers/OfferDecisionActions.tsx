'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Alert, Box, Button, Dialog, DialogActions, DialogContent, DialogContentText, DialogTitle } from '@mui/material';
import { createClient } from '@/utils/supabase/client';
import { offerErrorMessage } from '@/services/myOffers';

type Decision = 'accept' | 'decline';

const COPY: Record<Decision, { title: string; body: string; confirm: string }> = {
  accept: {
    title: 'قبول هذا العرض؟',
    body: 'سيُغلق الطلب، وتُرفض باقي العروض تلقائياً، وسيظهر لك رقم المتخصص ويظهر له رقمك للتواصل.',
    confirm: 'قبول العرض',
  },
  decline: {
    title: 'رفض هذا العرض؟',
    body: 'سيعرف المتخصص أن عرضه لم يتم اختياره. يبقى طلبك مفتوحاً لباقي العروض.',
    confirm: 'رفض العرض',
  },
};

/** Accept / decline a pending offer on the parent's open request. */
export default function OfferDecisionActions({ offerId }: { offerId: string }) {
  const router = useRouter();
  const [pending, setPending] = useState<Decision | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function decide(decision: Decision) {
    setSaving(true);
    setError(null);
    // accept_offer also declines the other pending offers and closes the request (NAB-80).
    const { error: rpcError } = await createClient().rpc(decision === 'accept' ? 'accept_offer' : 'decline_offer', {
      p_offer_id: offerId,
    });
    setSaving(false);
    if (rpcError) {
      setError(offerErrorMessage(rpcError));
      return;
    }
    setPending(null);
    router.refresh();
  }

  function close() {
    setPending(null);
    setError(null);
  }

  return (
    <>
      <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
        <Button variant="contained" color="success" disabled={saving} onClick={() => setPending('accept')}>
          قبول العرض
        </Button>
        <Button variant="outlined" color="inherit" disabled={saving} onClick={() => setPending('decline')}>
          رفض
        </Button>
      </Box>

      <Dialog open={Boolean(pending)} onClose={() => !saving && close()} fullWidth maxWidth="xs">
        {pending && (
          <>
            <DialogTitle>{COPY[pending].title}</DialogTitle>
            <DialogContent>
              {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
              <DialogContentText>{COPY[pending].body}</DialogContentText>
            </DialogContent>
            <DialogActions>
              <Button onClick={close} disabled={saving}>تراجع</Button>
              <Button
                variant="contained"
                color={pending === 'accept' ? 'success' : 'warning'}
                onClick={() => decide(pending)}
                disabled={saving}
              >
                {COPY[pending].confirm}
              </Button>
            </DialogActions>
          </>
        )}
      </Dialog>
    </>
  );
}
