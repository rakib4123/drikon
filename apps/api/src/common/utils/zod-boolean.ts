import { z } from 'zod';

/**
 * A boolean read from text (env vars, query strings).
 *
 * `z.coerce.boolean()` is `Boolean(value)`, so every non-empty string — including
 * "false" and "0" — became `true`. That made COOKIE_SECURE=false mean secure
 * cookies, and `?featured=false` return only featured products. This accepts the
 * spellings people actually write and rejects anything else loudly.
 */
export const booleanFromString = z.preprocess((value) => {
  if (typeof value === 'boolean') return value;
  if (typeof value !== 'string') return value;
  const v = value.trim().toLowerCase();
  if (['true', '1', 'yes', 'on'].includes(v)) return true;
  if (['false', '0', 'no', 'off', ''].includes(v)) return false;
  return value; // falls through to z.boolean() and fails with a clear message
}, z.boolean());
