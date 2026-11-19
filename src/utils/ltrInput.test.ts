import { describe, expect, it } from 'vitest';
import { ltrInput } from './ltrInput';

describe('ltrInput (NAB-137)', () => {
  it('sets left-to-right direction and alignment', () => {
    expect(ltrInput).toEqual({ dir: 'ltr', style: { textAlign: 'left' } });
  });
});
