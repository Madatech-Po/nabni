import { describe, expect, it } from 'vitest';
import { STATUS_LABELS } from '@/components/admin/verificationStatus';

describe('test setup', () => {
  it('resolves the @/ alias', () => {
    expect(STATUS_LABELS.verified).toBe('موثق');
  });
});
