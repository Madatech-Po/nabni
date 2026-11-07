// Form state keeps every field as a string (what the inputs give us); toOfferInput converts.
export interface OfferFormValues {
  price: string;
  pricingUnitId: string;
  schedule: string;
  startDate: string;
  notes: string;
}

export const EMPTY_OFFER_FORM: OfferFormValues = {
  price: '',
  pricingUnitId: '',
  schedule: '',
  startDate: '',
  notes: '',
};

// Same limits as the offers table's CHECK constraints.
export const MIN_SCHEDULE = 5;
export const MAX_SCHEDULE = 500;
export const MAX_NOTES = 1000;

export type OfferFormErrors = Partial<Record<keyof OfferFormValues, string>>;

/** `today` is YYYY-MM-DD; passed in so the check doesn't depend on the clock in tests. */
export function validateOfferForm(values: OfferFormValues, today: string): OfferFormErrors {
  const errors: OfferFormErrors = {};

  const price = Number(values.price);
  if (!values.price.trim() || !Number.isFinite(price) || price <= 0) {
    errors.price = 'اكتب سعراً أكبر من صفر';
  }
  if (!values.pricingUnitId) errors.pricingUnitId = 'اختر وحدة السعر';

  const schedule = values.schedule.trim();
  if (schedule.length < MIN_SCHEDULE) errors.schedule = 'اكتب المواعيد المتاحة لك (مثلاً: السبت والثلاثاء مساءً)';
  else if (schedule.length > MAX_SCHEDULE) errors.schedule = `المواعيد ${MAX_SCHEDULE} حرف على الأكثر`;

  if (values.startDate && values.startDate < today) errors.startDate = 'تاريخ البدء لا يمكن أن يكون في الماضي';
  if (values.notes.trim().length > MAX_NOTES) errors.notes = `الملاحظات ${MAX_NOTES} حرف على الأكثر`;

  return errors;
}

export interface OfferInput {
  price: number;
  pricing_unit_id: number;
  schedule: string;
  start_date: string | null;
  notes: string | null;
}

/** Call only after validateOfferForm returned no errors. */
export function toOfferInput(values: OfferFormValues): OfferInput {
  return {
    price: Number(values.price),
    pricing_unit_id: Number(values.pricingUnitId),
    schedule: values.schedule.trim(),
    start_date: values.startDate || null,
    notes: values.notes.trim() || null,
  };
}

/** The reverse, for prefilling the edit form. */
export function toOfferFormValues(offer: OfferInput): OfferFormValues {
  return {
    price: String(offer.price),
    pricingUnitId: String(offer.pricing_unit_id),
    schedule: offer.schedule,
    startDate: offer.start_date ?? '',
    notes: offer.notes ?? '',
  };
}

/** Today's date in Egypt, as YYYY-MM-DD. */
export function todayInCairo(now: Date = new Date()): string {
  return new Intl.DateTimeFormat('en-CA', { timeZone: 'Africa/Cairo' }).format(now);
}
