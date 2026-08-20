import { getRequestConfig } from 'next-intl/server';
import { cookies } from 'next/headers';

export const SUPPORTED_LOCALES = ['en', 'bn'] as const;
export type Locale = (typeof SUPPORTED_LOCALES)[number];
export const DEFAULT_LOCALE: Locale = 'en';
export const LOCALE_COOKIE = 'NEXT_LOCALE';

function resolveLocale(raw: string | undefined): Locale {
  return (SUPPORTED_LOCALES as readonly string[]).includes(raw ?? '') ? (raw as Locale) : DEFAULT_LOCALE;
}

export default getRequestConfig(async () => {
  const cookieStore = await cookies();
  const locale = resolveLocale(cookieStore.get(LOCALE_COOKIE)?.value);

  return {
    locale,
    messages: (await import(`../messages/${locale}.json`)).default,
  };
});
