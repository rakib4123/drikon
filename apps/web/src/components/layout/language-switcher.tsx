'use client';

import { useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { useLocale } from 'next-intl';
import { Globe } from 'lucide-react';
import { setLocale } from '@/lib/set-locale';
import type { Locale } from '@/i18n/request';

/** `tone="dark"` for the ink footer; `light` for cream surfaces like the header and the mobile drawer. */
export function LanguageSwitcher({ tone = 'light' }: { tone?: 'light' | 'dark' }) {
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
      className={`inline-flex items-center gap-1.5 px-2.5 py-1 min-h-[45px] rounded-full text-xs font-semibold transition-colors disabled:opacity-50 ${
        tone === 'dark'
          ? 'text-[color:var(--border-strong)] hover:text-[color:var(--surface-solid)] hover:bg-white/10'
          : 'text-[color:var(--fg-muted)] hover:bg-[color:var(--bg-soft)] hover:text-[color:var(--fg)]'
      }`}
    >
      <Globe aria-hidden className="w-3.5 h-3.5" />
      {locale === 'en' ? 'বাংলা' : 'English'}
    </button>
  );
}
