'use client';

import { useState } from 'react';
import { Alert, Box, Button } from '@mui/material';
import { useRouter } from 'next/navigation';
import { markContactMessageHandled } from '@/services/contact';

// "تم التعامل" on one contact message (NAB-124). The RPC checks is_admin() and logs the action;
// the page reloads its list on success.
export default function ContactMessageHandledButton({ messageId }: { messageId: string }) {
  const router = useRouter();
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function markHandled() {
    setSaving(true);
    setError(null);
    try {
      await markContactMessageHandled(messageId);
      router.refresh();
    } catch {
      setError('تعذّر حفظ التغيير — حاول مرة أخرى');
    } finally {
      setSaving(false);
    }
  }

  return (
    <Box>
      {error && <Alert severity="error" sx={{ mb: 1 }}>{error}</Alert>}
      <Button variant="contained" size="small" color="success" disabled={saving} onClick={markHandled}>
        تم التعامل
      </Button>
    </Box>
  );
}
