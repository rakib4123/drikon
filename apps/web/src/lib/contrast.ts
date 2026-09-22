/**
 * WCAG-relative-luminance helpers for picking readable text on an
 * admin-supplied brand accent colour. Pure, no DOM — safe to call from a
 * Server Component (layout.tsx).
 */

const DARK_FG = '#03121a';
const LIGHT_FG = '#ffffff';

function srgbChannel(byte: number): number {
  const c = byte / 255;
  return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
}

/** WCAG relative luminance (0–1) of an sRGB colour. */
function relativeLuminance(r: number, g: number, b: number): number {
  return 0.2126 * srgbChannel(r) + 0.7152 * srgbChannel(g) + 0.0722 * srgbChannel(b);
}

/** WCAG contrast ratio (1–21) between two relative luminances. */
function contrastRatio(l1: number, l2: number): number {
  const lighter = Math.max(l1, l2);
  const darker = Math.min(l1, l2);
  return (lighter + 0.05) / (darker + 0.05);
}

/** Parses a 3- or 6-digit hex colour (with or without `#`) into 0–255 RGB, or null. */
function parseHex(hex: string): [number, number, number] | null {
  const match = /^#?([0-9a-f]{3}|[0-9a-f]{6})$/i.exec(hex.trim());
  if (!match) return null;
  const full = match[1].length === 3 ? match[1].replace(/./g, (c) => c + c) : match[1];
  const num = parseInt(full, 16);
  return [(num >> 16) & 0xff, (num >> 8) & 0xff, num & 0xff];
}

const DARK_FG_LUM = relativeLuminance(...(parseHex(DARK_FG) as [number, number, number]));
const LIGHT_FG_LUM = relativeLuminance(...(parseHex(LIGHT_FG) as [number, number, number]));

/**
 * Best-contrast foreground for an arbitrary accent background: whichever of
 * the two fixed foregrounds — near-black `#03121a` or `#ffffff` — has the
 * higher WCAG contrast ratio against it. Invalid input (not a hex colour)
 * defaults to the dark foreground.
 */
export function accentForeground(hex: string): typeof DARK_FG | typeof LIGHT_FG {
  const rgb = parseHex(hex);
  if (!rgb) return DARK_FG;
  const bgLuminance = relativeLuminance(...rgb);
  const withDark = contrastRatio(bgLuminance, DARK_FG_LUM);
  const withLight = contrastRatio(bgLuminance, LIGHT_FG_LUM);
  return withDark >= withLight ? DARK_FG : LIGHT_FG;
}

/** WCAG contrast ratio (1–21) between two hex colours. Invalid input → 1. */
export function contrastRatioHex(a: string, b: string): number {
  const ra = parseHex(a);
  const rb = parseHex(b);
  if (!ra || !rb) return 1;
  return contrastRatio(relativeLuminance(...ra), relativeLuminance(...rb));
}
