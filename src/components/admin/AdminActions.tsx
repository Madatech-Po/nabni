'use client';

import { useState } from 'react';
import {
  Alert, Box, Button, Dialog, DialogActions, DialogContent, DialogTitle, TextField,
} from '@mui/material';
import { useRouter } from 'next/navigation';
import { createClient } from '@/utils/supabase/client';

export interface AdminAction<T extends string | boolean> {
  to: T;
  label: string;
  color: 'success' | 'error' | 'warning' | 'primary';
  needsReason: boolean;
}

type AdminRpc = 'set_educator_verification' | 'set_profile_active' | 'set_request_status';

// Buttons for one admin RPC. Every RPC checks is_admin() and writes admin_logs itself, so
// this only collects the reason and refreshes the page on success.
export default function AdminActions<T extends string | boolean>({
  actions,
  rpc,
  args,
  statusArg,
}: {
  actions: AdminAction<T>[];
  rpc: AdminRpc;
  /** The RPC's id argument, e.g. { p_user_id: id }. */
  args: Record<string, string>;
  /** Name of the RPC argument that receives `action.to`. */
  statusArg: string;
}) {
  const router = useRouter();
  const [pending, setPending] = useState<AdminAction<T> | null>(null);
  const [reason, setReason] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function apply(action: AdminAction<T>, reasonText: string) {
    setSaving(true);
    setError(null);
    const { error: rpcError } = await createClient().rpc(rpc, {
      ...args,
      [statusArg]: action.to,
      p_reason: reasonText.trim() || null,
    } as never);
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
      <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
        {actions.map((action) => (
          <Button
            key={String(action.to)}
            variant="contained"
            size="small"
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
