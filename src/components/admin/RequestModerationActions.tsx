'use client';

import AdminActions, { type AdminAction } from './AdminActions';
import type { RequestStatus } from '@/types/database';

const REMOVE: AdminAction<RequestStatus> = { to: 'removed', label: 'إخفاء', color: 'error', needsReason: true };

// A cancelled request was withdrawn by its parent, so admins don't reopen it. Un-hiding
// restores a request as closed; the admin can reopen it from there if that was right.
const ACTIONS: Record<RequestStatus, AdminAction<RequestStatus>[]> = {
  open: [{ to: 'closed', label: 'إغلاق', color: 'primary', needsReason: false }, REMOVE],
  closed: [{ to: 'open', label: 'إعادة الفتح', color: 'success', needsReason: false }, REMOVE],
  cancelled: [REMOVE],
  removed: [{ to: 'closed', label: 'إلغاء الإخفاء', color: 'success', needsReason: false }],
};

export default function RequestModerationActions({ requestId, status }: { requestId: string; status: RequestStatus }) {
  return (
    <AdminActions
      actions={ACTIONS[status]}
      rpc="set_request_status"
      args={{ p_request_id: requestId }}
      statusArg="p_status"
    />
  );
}
