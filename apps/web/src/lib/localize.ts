import type { Locale } from '@/i18n/request';

/**
 * Picks the display string for the current locale, falling back to English
 * whenever a Bangla translation hasn't been written yet — a missing
 * translation must never render as blank text.
 */
export function localize(en: string, bn: string | null | undefined, locale: Locale): string {
  return locale === 'bn' && bn ? bn : en;
}
