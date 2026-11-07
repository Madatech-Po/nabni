import { describe, expect, it } from 'vitest';
import { getInitial } from './initials';

describe('getInitial (NAB-98)', () => {
  it.each([
    ['أحمد محمد', 'أ'],
    ['[E2E] متخصص', 'E'],
    ['  سارة', 'س'],
    ['"نور"', 'ن'],
    ['mona', 'M'],
    ['123 علي', 'ع'],
  ])('%s -> %s', (name, initial) => {
    expect(getInitial(name)).toBe(initial);
  });

  it.each([[''], ['123'], ['[ ]'], [null], [undefined]])('has no letter for %j', (name) => {
    expect(getInitial(name)).toBeUndefined();
  });
});
