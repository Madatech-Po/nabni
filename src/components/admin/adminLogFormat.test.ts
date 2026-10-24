import { describe, expect, it } from 'vitest';
import { describeChange, targetHref } from './adminLogFormat';

describe('describeChange', () => {
  it.each([
    ['educator.verification_status_changed', 'pending', 'verified', 'قيد المراجعة ← موثق'],
    ['profile.active_changed', true, false, 'نشط ← موقوف'],
    ['request.status_changed', 'open', 'removed', 'مفتوح ← مخفي بواسطة الإدارة'],
  ])('translates %s', (action, from, to, expected) => {
    expect(describeChange({ action, details: { from, to } })).toBe(expected);
  });

  it('falls back to the raw values and handles missing details', () => {
    expect(describeChange({ action: 'other', details: { from: 'a', to: 'b' } })).toBe('a ← b');
    expect(describeChange({ action: 'other', details: {} })).toBe('—');
  });
});

describe('targetHref', () => {
  it('links parents to their requests and educators to the review list', () => {
    expect(targetHref({ target_type: 'profile', target_id: 'p1' })).toBe('/admin/requests?parent=p1');
    expect(targetHref({ target_type: 'educator', target_id: 'e1' })).toBe('/admin/educators?status=all');
    expect(targetHref({ target_type: 'request', target_id: 'r1' })).toBeNull();
    expect(targetHref({ target_type: 'profile', target_id: null })).toBeNull();
  });
});
