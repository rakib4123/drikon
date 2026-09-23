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


describe('megastore palette contrast (spec §1)', () => {
  const pairs: [string, string, string, number][] = [
    ['white on red', '#ffffff', '#e11d2a', 4.5],
    ['dark on orange', '#12141a', '#ff7a1a', 4.5],
    ['text on white', '#12141a', '#ffffff', 4.5],
    ['muted on white', '#5b6170', '#ffffff', 4.5],
    ['red price on white', '#e11d2a', '#ffffff', 4.5],
    ['white on ink', '#ffffff', '#0a0a0a', 4.5],
    ['muted white on ink', '#c9ced8', '#0a0a0a', 4.5],
    ['orange on ink', '#ff7a1a', '#0a0a0a', 4.5],
    ['success on white', '#0d7d43', '#ffffff', 4.5],
    ['focus ring on white', '#e11d2a', '#ffffff', 3],
  ];
  it.each(pairs)('%s meets its minimum', (_label, fg, bg, min) => {
    expect(contrastRatioHex(fg, bg)).toBeGreaterThanOrEqual(min);
  });
  it('rejects white text on orange, which must use dark text', () => {
    expect(contrastRatioHex('#ffffff', '#ff7a1a')).toBeLessThan(4.5);
  });
});
