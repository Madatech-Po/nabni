import { describe, expect, it } from 'vitest';
import { toWhatsAppNumber, whatsAppLink } from './contactLinks';

describe('toWhatsAppNumber', () => {
  it.each([
    ['01012345678', '201012345678'],
    ['010 1234 5678', '201012345678'],
    ['+201012345678', '201012345678'],
    ['201012345678', '201012345678'],
  ])('turns %s into %s', (phone, expected) => {
    expect(toWhatsAppNumber(phone)).toBe(expected);
  });

  it.each(['', '12345', '0101234567', '0201012345678'])('rejects %j', (phone) => {
    expect(toWhatsAppNumber(phone)).toBeNull();
  });
});

describe('whatsAppLink', () => {
  it('builds a wa.me link, or nothing for an unusable number', () => {
    expect(whatsAppLink('01012345678')).toBe('https://wa.me/201012345678');
    expect(whatsAppLink('abc')).toBeNull();
  });
});
