import { describe, expect, it } from 'vitest';
import { formatHours, formatNumber } from './pilotStatsFormat';

describe('formatNumber (NAB-125)', () => {
  it('uses Arabic digits and at most two decimals', () => {
    expect(formatNumber(12)).toBe('١٢');
    expect(formatNumber(1.5)).toBe('١٫٥');
    expect(formatNumber(2.333)).toBe('٢٫٣٣');
    expect(formatNumber(0)).toBe('٠');
  });

  it('shows a dash when there is no value yet', () => {
    expect(formatNumber(null)).toBe('—');
    expect(formatNumber(undefined)).toBe('—');
  });
});

describe('formatHours (NAB-125)', () => {
  it('shows minutes under an hour', () => {
    expect(formatHours(0.4)).toBe('٢٤ دقيقة');
    expect(formatHours(0)).toBe('٠ دقيقة');
  });

  it('shows hours with one decimal under two days', () => {
    expect(formatHours(1)).toBe('١ ساعة');
    expect(formatHours(5.55)).toBe('٥٫٦ ساعة');
    expect(formatHours(47.9)).toBe('٤٧٫٩ ساعة');
  });

  it('shows days after that', () => {
    expect(formatHours(72)).toBe('٣ يوم');
    expect(formatHours(60)).toBe('٢٫٥ يوم');
  });

  it('shows a dash when no request has an offer yet', () => {
    expect(formatHours(null)).toBe('—');
  });
});
