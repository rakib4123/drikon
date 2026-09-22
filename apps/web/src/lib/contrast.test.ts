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

import { contrastRatioHex } from './contrast';

describe('warm palette contrast (spec §1)', () => {
  const pairs: [string, string, string, number][] = [
    ['body text on page', '#1c1917', '#f5f1ea', 4.5],
    ['muted text on page', '#57534e', '#f5f1ea', 4.5],
    ['body text on card', '#1c1917', '#fffdf9', 4.5],
    ['muted text on card', '#57534e', '#fffdf9', 4.5],
    ['button text on black', '#fffdf9', '#1c1917', 4.5],
    ['bronze link on card', '#b45309', '#fffdf9', 4.5],
    ['white on sale badge', '#ffffff', '#b91c1c', 4.5],
    ['in-stock green on card', '#15803d', '#fffdf9', 4.5],
    ['cream text on ink band', '#fffdf9', '#1c1917', 4.5],
    ['focus ring vs page', '#b45309', '#f5f1ea', 3],
  ];
  it.each(pairs)('%s meets its minimum', (_label, fg, bg, min) => {
    expect(contrastRatioHex(fg, bg)).toBeGreaterThanOrEqual(min);
  });
  it('is symmetric and 21 for black/white', () => {
    expect(contrastRatioHex('#000000', '#ffffff')).toBeCloseTo(21, 1);
    expect(contrastRatioHex('#ffffff', '#000000')).toBeCloseTo(21, 1);
  });
});
