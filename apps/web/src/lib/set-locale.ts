'use server';

import { cookies } from 'next/headers';
import { LOCALE_COOKIE, type Locale } from '@/i18n/request';

const ONE_YEAR_SECONDS = 60 * 60 * 24 * 365;

export async function setLocale(locale: Locale) {
  const cookieStore = await cookies();
  cookieStore.set(LOCALE_COOKIE, locale, { maxAge: ONE_YEAR_SECONDS, path: '/' });
}
