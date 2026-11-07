import { describe, expect, it } from 'vitest';
import {
  EMPTY_OFFER_FORM, toOfferFormValues, toOfferInput, todayInCairo, validateOfferForm, type OfferFormValues,
} from './offerFormValues';

const today = '2026-11-07';
const valid: OfferFormValues = { ...EMPTY_OFFER_FORM, price: '200', pricingUnitId: '1', schedule: 'السبت والثلاثاء مساءً' };

describe('validateOfferForm', () => {
  it('accepts a complete offer with optional fields empty', () => {
    expect(validateOfferForm(valid, today)).toEqual({});
  });

  it('requires price, unit and schedule', () => {
    expect(Object.keys(validateOfferForm(EMPTY_OFFER_FORM, today)).sort()).toEqual(['price', 'pricingUnitId', 'schedule']);
  });

  it.each(['0', '-5', 'abc', ' '])('rejects price %j', (price) => {
    expect(validateOfferForm({ ...valid, price }, today).price).toBeDefined();
  });

  it('counts the schedule without surrounding spaces and caps its length', () => {
    expect(validateOfferForm({ ...valid, schedule: '   abc   ' }, today).schedule).toBeDefined();
    expect(validateOfferForm({ ...valid, schedule: 'x'.repeat(501) }, today).schedule).toContain('500');
  });

  it('refuses a start date in the past but accepts today', () => {
    expect(validateOfferForm({ ...valid, startDate: '2026-11-06' }, today).startDate).toBeDefined();
    expect(validateOfferForm({ ...valid, startDate: today }, today)).toEqual({});
  });

  it('caps the notes', () => {
    expect(validateOfferForm({ ...valid, notes: 'x'.repeat(1001) }, today).notes).toBeDefined();
  });
});

describe('toOfferInput / toOfferFormValues', () => {
  it('converts to table values, trimming and nulling empties', () => {
    expect(toOfferInput({ ...valid, schedule: '  Sat  ', notes: '  ' })).toEqual({
      price: 200, pricing_unit_id: 1, schedule: 'Sat', start_date: null, notes: null,
    });
  });

  it('round-trips through the edit form', () => {
    const input = toOfferInput({ ...valid, startDate: '2026-11-20', notes: 'خبرة 5 سنوات' });
    expect(toOfferInput(toOfferFormValues(input))).toEqual(input);
  });
});

describe('todayInCairo', () => {
  it('uses the Egyptian date, which can differ from UTC', () => {
    // 23:30 UTC on Nov 6 is already Nov 7 in Cairo (UTC+2).
    expect(todayInCairo(new Date('2026-11-06T23:30:00Z'))).toBe('2026-11-07');
  });
});
