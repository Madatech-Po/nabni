'use client';

import AdminActions, { type AdminAction } from './AdminActions';
import type { EducatorVerificationStatus } from '@/types/database';

const ACTIONS: Record<EducatorVerificationStatus, AdminAction<EducatorVerificationStatus>[]> = {
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
  return (
    <AdminActions
      actions={ACTIONS[status]}
      rpc="set_educator_verification"
      args={{ p_educator_id: educatorId }}
      statusArg="p_status"
    />
  );
}
