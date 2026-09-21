import { z } from 'zod';
import { booleanFromString } from './zod-boolean';

describe('booleanFromString', () => {
  it('reads "false"-like strings as false — z.coerce.boolean() read them as true', () => {
    for (const v of ['false', 'FALSE', '0', 'no', 'off', '']) expect(booleanFromString.parse(v)).toBe(false);
  });

  it('reads "true"-like strings as true', () => {
    for (const v of ['true', 'True', '1', 'yes', 'on']) expect(booleanFromString.parse(v)).toBe(true);
  });

  it('passes real booleans through', () => {
    expect(booleanFromString.parse(true)).toBe(true);
    expect(booleanFromString.parse(false)).toBe(false);
  });

  it('rejects anything else instead of guessing', () => {
    expect(booleanFromString.safeParse('maybe').success).toBe(false);
  });

  it('keeps optional/default behaviour when the value is absent', () => {
    expect(booleanFromString.optional().parse(undefined)).toBeUndefined();
    expect(z.object({ x: booleanFromString.default(false) }).parse({}).x).toBe(false);
  });
});
