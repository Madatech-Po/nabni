import type { OfferStatus } from '@/types/database';

// How the educator sees each status of their own offer.
export const MY_OFFER_STATUS_LABELS: Record<OfferStatus, string> = {
  pending: 'بانتظار رد ولي الأمر',
  accepted: 'تم قبول عرضك',
  declined: 'لم يتم اختيار عرضك',
  withdrawn: 'سحبت العرض',
  archived: 'أُغلق الطلب قبل الرد',
  removed: 'أزالته الإدارة',
};

export const OFFER_STATUS_COLORS: Record<OfferStatus, 'warning' | 'success' | 'default' | 'error'> = {
  pending: 'warning',
  accepted: 'success',
  declined: 'default',
  withdrawn: 'default',
  archived: 'default',
  removed: 'error',
};
