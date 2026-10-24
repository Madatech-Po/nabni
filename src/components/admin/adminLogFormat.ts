import type { AdminLogItem } from '@/services/admin';
import type { EducatorVerificationStatus, RequestStatus } from '@/types/database';
import { STATUS_LABELS } from './verificationStatus';
import { REQUEST_STATUS_LABELS } from './requestStatus';

export const ACTION_LABELS: Record<string, string> = {
  'educator.verification_status_changed': 'توثيق معلم',
  'profile.active_changed': 'حساب ولي أمر',
  'request.status_changed': 'حالة طلب',
};

// Turns the stored from/to values into Arabic for each kind of action.
function valueLabel(action: string, value: unknown): string {
  if (action === 'educator.verification_status_changed') {
    return STATUS_LABELS[value as EducatorVerificationStatus] ?? String(value);
  }
  if (action === 'profile.active_changed') {
    return value === true ? 'نشط' : value === false ? 'موقوف' : String(value);
  }
  if (action === 'request.status_changed') {
    return REQUEST_STATUS_LABELS[value as RequestStatus] ?? String(value);
  }
  return String(value);
}

export function describeChange(item: Pick<AdminLogItem, 'action' | 'details'>): string {
  const { from, to } = item.details;
  if (from === undefined && to === undefined) return '—';
  return `${valueLabel(item.action, from)} ← ${valueLabel(item.action, to)}`;
}

/** Where to look at the target in the admin pages, if there is a useful place. */
export function targetHref(item: Pick<AdminLogItem, 'target_type' | 'target_id'>): string | null {
  if (!item.target_id) return null;
  if (item.target_type === 'profile') return `/admin/requests?parent=${item.target_id}`;
  if (item.target_type === 'educator') return '/admin/educators?status=all';
  return null;
}
