import { describe, expect, it } from 'vitest';
import { formatDate, formatDateTime } from './formatDate';

describe('formatDate', () => {
  it('uses Egypt time, not the server time zone', () => {
    // 22:30 UTC on Oct 23 is already Oct 24 in Cairo (UTC+3 in summer time).
    const cairo = formatDate('2026-10-23T22:30:00Z');
    expect(cairo).toBe(new Date('2026-10-24T12:00:00Z').toLocaleDateString('ar-EG', { timeZone: 'Africa/Cairo' }));
    expect(cairo).not.toBe(new Date('2026-10-23T12:00:00Z').toLocaleDateString('ar-EG', { timeZone: 'Africa/Cairo' }));
  });
});

describe('formatDateTime', () => {
  it('shows the Cairo clock time', () => {
    expect(formatDateTime('2026-10-23T22:30:00Z')).toBe(
      new Date('2026-10-23T22:30:00Z').toLocaleString('ar-EG', {
        timeZone: 'Africa/Cairo',
        dateStyle: 'medium',
        timeStyle: 'short',
      })
    );
    expect(formatDateTime('2026-10-23T22:30:00Z')).not.toBe(
      new Date('2026-10-23T22:30:00Z').toLocaleString('ar-EG', { timeZone: 'UTC', dateStyle: 'medium', timeStyle: 'short' })
    );
  });
});
