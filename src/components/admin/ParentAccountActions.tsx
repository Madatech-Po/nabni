'use client';

import AdminActions from './AdminActions';

// Suspending needs a reason for the log; reactivating doesn't.
export default function ParentAccountActions({ userId, active }: { userId: string; active: boolean }) {
  return (
    <AdminActions
      actions={
        active
          ? [{ to: false, label: 'إيقاف الحساب', color: 'warning', needsReason: true }]
          : [{ to: true, label: 'إعادة التفعيل', color: 'success', needsReason: false }]
      }
      rpc="set_profile_active"
      args={{ p_user_id: userId }}
      statusArg="p_active"
    />
  );
}
