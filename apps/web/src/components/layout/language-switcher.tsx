'use client';

import { useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { useLocale } from 'next-intl';
import { setLocale } from '@/lib/set-locale';
import type { Locale } from '@/i18n/request';

export function LanguageSwitcher() {
  const locale = useLocale() as Locale;
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  const toggle = () => {
    const next: Locale = locale === 'en' ? 'bn' : 'en';
    startTransition(async () => {
      await setLocale(next);
      router.refresh();
    });
  };

  return (
    <button
      type="button"
      onClick={toggle}
      disabled={isPending}
      aria-label={locale === 'en' ? 'বাংলায় দেখুন' : 'View in English'}
      className="px-2.5 py-1.5 rounded-lg text-xs font-medium text-[color:var(--fg-muted)] hover:bg-[color:var(--bg-soft)] hover:text-[color:var(--fg)] transition-colors disabled:opacity-50"
    >
      {locale === 'en' ? 'বাংলা' : 'EN'}
    </button>
  );
}
