import type { EducatorVerificationStatus } from '@/types/database';

// Arabic labels match the verification_statuses lookup the owner seeded.
export const STATUS_LABELS: Record<EducatorVerificationStatus, string> = {
  pending: 'قيد المراجعة',
  verified: 'موثق',
  rejected: 'مرفوض',
  suspended: 'موقوف',
};

export const STATUS_COLORS: Record<EducatorVerificationStatus, 'warning' | 'success' | 'error' | 'default'> = {
  pending: 'warning',
  verified: 'success',
  rejected: 'error',
  suspended: 'default',
};
