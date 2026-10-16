'use client';

import { useState } from 'react';
import {
  Alert, Box, Button, Dialog, DialogActions, DialogContent, DialogTitle, TextField,
} from '@mui/material';
import { useRouter } from 'next/navigation';
import { createClient } from '@/utils/supabase/client';
import type { EducatorVerificationStatus } from '@/types/database';

interface Action {
  to: EducatorVerificationStatus;
  label: string;
  color: 'success' | 'error' | 'warning';
  needsReason: boolean;
}

const ACTIONS: Record<EducatorVerificationStatus, Action[]> = {
  pending: [
    { to: 'verified', label: 'توثيق', color: 'success', needsReason: false },
    { to: 'rejected', label: 'رفض', color: 'error', needsReason: true },
  ],
  verified: [{ to: 'suspended', label: 'إيقاف', color: 'warning', needsReason: true }],
  rejected: [{ to: 'verified', label: 'توثيق', color: 'success', needsReason: false }],
  suspended: [{ to: 'verified', label: 'إعادة التفعيل', color: 'success', needsReason: false }],
};

export default function EducatorReviewActions({
  educatorId,
  status,
}: {
  educatorId: string;
  status: EducatorVerificationStatus;
}) {
  const router = useRouter();
  const [pending, setPending] = useState<Action | null>(null);
  const [reason, setReason] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function apply(action: Action, reasonText: string) {
    setSaving(true);
    setError(null);
    // The database checks the caller is an admin and writes admin_logs (NAB-37).
    const { error: rpcError } = await createClient().rpc('set_educator_verification', {
      p_educator_id: educatorId,
      p_status: action.to,
      p_reason: reasonText.trim() || null,
    });
    setSaving(false);
    if (rpcError) {
      setError(rpcError.message);
      return;
    }
    setPending(null);
    setReason('');
    router.refresh();
  }

  return (
    <>
      {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
      <Box sx={{ display: 'flex', gap: 1 }}>
        {ACTIONS[status].map((action) => (
          <Button
            key={action.to}
            variant="contained"
            color={action.color}
            disabled={saving}
            onClick={() => (action.needsReason ? setPending(action) : apply(action, ''))}
          >
            {action.label}
          </Button>
        ))}
      </Box>

      <Dialog open={Boolean(pending)} onClose={() => !saving && setPending(null)} fullWidth maxWidth="sm">
        <DialogTitle>{pending?.label}</DialogTitle>
        <DialogContent>
          <TextField
            label="السبب (يُسجل في سجل الإدارة)"
            multiline
            rows={3}
            fullWidth
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            sx={{ mt: 1 }}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setPending(null)} disabled={saving}>إلغاء</Button>
          <Button
            variant="contained"
            color={pending?.color}
            disabled={saving}
            onClick={() => pending && apply(pending, reason)}
          >
            تأكيد
          </Button>
        </DialogActions>
      </Dialog>
    </>
  );
}
