import type { RequestStatus } from '@/types/database';

export const REQUEST_STATUS_LABELS: Record<RequestStatus, string> = {
  open: 'مفتوح',
  closed: 'مغلق',
  cancelled: 'ألغاه ولي الأمر',
  removed: 'مخفي بواسطة الإدارة',
};

export const REQUEST_STATUS_COLORS: Record<RequestStatus, 'success' | 'default' | 'warning' | 'error'> = {
  open: 'success',
  closed: 'default',
  cancelled: 'warning',
  removed: 'error',
};
