import type { OfferStatus } from '@/types/database';

// Formatting for the pilot stats page (NAB-125). Numbers use Arabic digits, as dates do.

/** "١٢" or "١٫٥"; an em dash when there is no value yet. */
export function formatNumber(value: number | null | undefined, maxFractionDigits = 2): string {
  if (value == null || !Number.isFinite(value)) return '—';
  return value.toLocaleString('ar-EG', { maximumFractionDigits: maxFractionDigits });
}

/**
 * A duration given in hours, in the unit that reads best: minutes under an hour ("٢٤ دقيقة"),
 * hours under two days ("٥٫٥ ساعة"), days after that ("٣٫٢ يوم").
 */
export function formatHours(hours: number | null | undefined): string {
  if (hours == null || !Number.isFinite(hours)) return '—';
  if (hours < 1) return `${formatNumber(Math.round(hours * 60))} دقيقة`;
  if (hours < 48) return `${formatNumber(hours, 1)} ساعة`;
  return `${formatNumber(hours / 24, 1)} يوم`;
}

// How an admin reads each offer status (the educator-facing labels are worded for the educator).
export const ADMIN_OFFER_STATUS_LABELS: Record<OfferStatus, string> = {
  pending: 'بانتظار رد ولي الأمر',
  accepted: 'مقبول',
  declined: 'مرفوض من ولي الأمر',
  withdrawn: 'سحبه المتخصص',
  archived: 'أُغلق الطلب قبل الرد',
  removed: 'أزالته الإدارة',
};
