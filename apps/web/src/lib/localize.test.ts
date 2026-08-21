import { describe, expect, it } from 'vitest';
import { localize } from './localize';

describe('localize', () => {
  it('returns the Bangla string when locale is bn and bn is present', () => {
    expect(localize('Hello', 'হ্যালো', 'bn')).toBe('হ্যালো');
  });

  it('falls back to English when locale is bn but bn is null', () => {
    expect(localize('Hello', null, 'bn')).toBe('Hello');
  });

  it('falls back to English when locale is bn but bn is undefined', () => {
    expect(localize('Hello', undefined, 'bn')).toBe('Hello');
  });

  it('falls back to English when locale is bn but bn is an empty string', () => {
    expect(localize('Hello', '', 'bn')).toBe('Hello');
  });

  it('returns English when locale is en, even if bn is present', () => {
    expect(localize('Hello', 'হ্যালো', 'en')).toBe('Hello');
  });
});
