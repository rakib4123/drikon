import Link from 'next/link';
import { getTranslations, getLocale } from 'next-intl/server';
import { BrandMark } from '@/components/layout/brand-mark';
import { BrandWatermark } from '@/components/layout/brand-watermark';
import type { BrandInfo } from '@/lib/settings';
import type { NavCategory } from '@/lib/catalog';
import { localize } from '@/lib/localize';
import type { Locale } from '@/i18n/request';

export async function Footer({ brand, categories = [], note }: { brand: BrandInfo; categories?: NavCategory[]; note?: string }) {
  const t = await getTranslations('nav');
  const locale = (await getLocale()) as Locale;
  const topCats = categories.filter((c) => !c.parentId).slice(0, 5);
  return (
    <footer className="relative mt-24 border-t border-[color:var(--border)] overflow-hidden">
      <BrandWatermark text={brand.siteName?.toUpperCase() || 'DRIKON'} />
      <div className="relative z-10 max-w-7xl mx-auto px-6 py-14 grid gap-10 md:grid-cols-5">
        <div className="md:col-span-2">
          <div className="mb-3">
            <BrandMark brand={brand} href={null} showTagline />
          </div>
          <p className="text-sm text-[color:var(--fg-muted)] max-w-sm">
            {brand.tagline || 'A modern marketplace built around taste, performance, and trust.'}
          </p>
        </div>

        <div>
          <div className="text-sm font-semibold mb-3">{t('shop')}</div>
          <ul className="space-y-2 text-sm text-[color:var(--fg-muted)]">
            <li><Link href="/products" className="hover:text-[color:var(--fg)]">{t('allProducts')}</Link></li>
            {topCats.map((c) => (
              <li key={c.id}>
                <Link href={`/products?category=${c.slug}`} className="hover:text-[color:var(--fg)]">
                  {localize(c.name, c.nameBn, locale)}
                </Link>
              </li>
            ))}
          </ul>
        </div>

        <div>
          <div className="text-sm font-semibold mb-3">{t('company')}</div>
          <ul className="space-y-2 text-sm text-[color:var(--fg-muted)]">
            <li><Link href="/about" className="hover:text-[color:var(--fg)]">{t('about')}</Link></li>
            <li><Link href="/contact" className="hover:text-[color:var(--fg)]">{t('contact')}</Link></li>
          </ul>
        </div>

        <div>
          <div className="text-sm font-semibold mb-3">{t('legal')}</div>
          <ul className="space-y-2 text-sm text-[color:var(--fg-muted)]">
            <li><Link href="/shipping-returns" className="hover:text-[color:var(--fg)]">{t('shippingReturns')}</Link></li>
            <li><Link href="/terms" className="hover:text-[color:var(--fg)]">{t('termsOfService')}</Link></li>
            <li><Link href="/privacy" className="hover:text-[color:var(--fg)]">{t('privacyPolicy')}</Link></li>
          </ul>
        </div>
      </div>
      <div className="relative z-10 border-t border-[color:var(--border)] py-6">
        <div className="max-w-7xl mx-auto px-6 flex flex-col sm:flex-row justify-between gap-2 text-xs text-[color:var(--fg-muted)]">
          <span>© {new Date().getFullYear()} {brand.siteName}. {t('allRightsReserved')}</span>
          {note && <span>{note}</span>}
        </div>
      </div>
    </footer>
  );
}
