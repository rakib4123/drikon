import {
  Smartphone,
  Headphones,
  ShieldCheck,
  BatteryCharging,
  Watch,
  Tablet,
  Laptop,
  Speaker,
  Cable,
  Camera,
  Gamepad2,
  LayoutGrid,
  type LucideIcon,
} from 'lucide-react';

/**
 * Icon for a catalogue category, matched on slug keywords rather than exact
 * slugs so admin-created categories ("gaming-headsets", "usb-cables") still get
 * a sensible icon. Falls back to a grid.
 */
const RULES: Array<[RegExp, LucideIcon]> = [
  [/phone|mobile|smartphone/, Smartphone],
  [/tablet|ipad/, Tablet],
  [/laptop|notebook|macbook/, Laptop],
  [/watch|wearable|band/, Watch],
  [/speaker/, Speaker],
  [/audio|headphone|earbud|earphone|sound/, Headphones],
  [/case|cover|protect|guard|glass/, ShieldCheck],
  [/power|charg|battery/, BatteryCharging],
  [/cable|adapter|hub/, Cable],
  [/camera|lens/, Camera],
  [/gam|console/, Gamepad2],
];

export function categoryIconFor(slug: string): LucideIcon {
  const s = slug.toLowerCase();
  return RULES.find(([re]) => re.test(s))?.[1] ?? LayoutGrid;
}

export function CategoryIcon({ slug, className }: { slug: string; className?: string }) {
  const Icon = categoryIconFor(slug);
  return <Icon aria-hidden className={className} />;
}
