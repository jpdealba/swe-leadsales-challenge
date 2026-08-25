import { Lead } from '../src/domain/entities/Lead';

describe('a lead', () => {
  it('keeps only the digits of its phone number', () => {
    expect(new Lead('+52 55 1234 5678', 'Ana', 'new').phone).toBe('525512345678');
  });

  it('rejects a phone number with no digits in it', () => {
    for (const phone of ['', '   ', 'abc', '+++', '()-']) {
      expect(() => new Lead(phone, 'Ana', 'new')).toThrow();
    }
  });

  it('rejects a blank name', () => {
    expect(() => new Lead('5512345678', '', 'new')).toThrow();
    expect(() => new Lead('5512345678', '   ', 'new')).toThrow();
  });

  it('rejects a blank stage', () => {
    expect(() => new Lead('5512345678', 'Ana', '')).toThrow();
  });
});
