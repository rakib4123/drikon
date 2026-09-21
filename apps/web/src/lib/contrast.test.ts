import { describe, expect, it } from 'vitest';
import { accentForeground } from './contrast';

describe('accentForeground', () => {
  it.each<[string, string]>([
    ['#22e5ff', '#03121a'], // bright cyan — dark text reads better
    ['#0b57d0', '#ffffff'], // saturated blue — white text reads better
    ['#ffffff', '#03121a'], // white background — dark text
    ['#000000', '#ffffff'], // black background — white text
  ])('picks the higher-contrast foreground for %s', (hex, expected) => {
    expect(accentForeground(hex)).toBe(expected);
  });

  it('defaults to the dark foreground on invalid input', () => {
    expect(accentForeground('not-a-color')).toBe('#03121a');
    expect(accentForeground('')).toBe('#03121a');
    expect(accentForeground('#12345')).toBe('#03121a');
  });

  it('accepts hex without a leading #', () => {
    expect(accentForeground('22e5ff')).toBe('#03121a');
  });
});
