'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Alert, Box, Button, Chip } from '@mui/material';
import { setMyRequestStatus } from '@/services/myRequests';
import { REQUEST_STATUS_COLORS } from '@/components/admin/requestStatus';
import type { RequestStatus } from '@/types/database';

type OwnStatus = Exclude<RequestStatus, 'removed'>;

// The owner's view of each status (the admin labels say who cancelled; here it's always them).
export const MY_STATUS_LABELS: Record<RequestStatus, string> = {
  open: 'مفتوح — يظهر للمتخصصين',
  closed: 'مغلق',
  cancelled: 'ملغي',
  removed: 'مخفي بواسطة الإدارة',
};

const ACTIONS: Record<OwnStatus, { to: OwnStatus; label: string; color: 'primary' | 'success' | 'warning' }[]> = {
  open: [
    { to: 'closed', label: 'إغلاق الطلب', color: 'primary' },
    { to: 'cancelled', label: 'إلغاء الطلب', color: 'warning' },
  ],
  closed: [{ to: 'open', label: 'إعادة فتح', color: 'success' }],
  cancelled: [{ to: 'open', label: 'إعادة فتح', color: 'success' }],
};

export default function MyRequestActions({ requestId, status }: { requestId: string; status: RequestStatus }) {
  const router = useRouter();
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function change(to: OwnStatus) {
    setSaving(true);
    setError(null);
    try {
      await setMyRequestStatus(requestId, to);
      router.refresh();
    } catch (err) {
      setError((err as { message?: string })?.message || 'حدث خطأ، حاول مرة أخرى');
    } finally {
      setSaving(false);
    }
  }

  return (
    <>
      <Chip label={MY_STATUS_LABELS[status]} color={REQUEST_STATUS_COLORS[status]} size="small" sx={{ mb: 1.5 }} />

      {status === 'removed' ? (
        <Alert severity="error" variant="outlined">
          أخفت إدارة نبني هذا الطلب لمخالفته شروط المنصة، ولا يمكن تعديله أو إعادة نشره. تواصل معنا لو تعتقد أن هذا خطأ.
        </Alert>
      ) : (
        <>
          {error && <Alert severity="error" sx={{ mb: 1.5 }}>{error}</Alert>}
          <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
            <Button component={Link} href={`/parent/requests/${requestId}/edit`} size="small" variant="outlined" disabled={saving}>
              تعديل
            </Button>
            {ACTIONS[status].map((action) => (
              <Button
                key={action.to}
                size="small"
                variant="contained"
                color={action.color}
                disabled={saving}
                onClick={() => change(action.to)}
              >
                {action.label}
              </Button>
            ))}
          </Box>
        </>
      )}
    </>
  );
}
