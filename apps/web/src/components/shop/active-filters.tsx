'use client';

import { useSearchParams } from 'next/navigation';
import { useLocale, useTranslations } from 'next-intl';
import { X } from 'lucide-react';
import { useFilterNavigation, type FilterBrand, type FilterCategory } from './filter-panel';
import { localize } from '@/lib/localize';
import type { Locale } from '@/i18n/request';

/** The applied filters as removable chips, plus "clear all". Renders nothing when unfiltered. */
export function ActiveFilters({ brands, categories }: { brands: FilterBrand[]; categories: FilterCategory[] }) {
  const params = useSearchParams();
  const t = useTranslations('products');
  const locale = useLocale() as Locale;
  const navigate = useFilterNavigation();

  const chips: { key: string; label: string }[] = [];
  const cat = params.get('category');
  if (cat) {
    const c = categories.find((x) => x.slug === cat);
    chips.push({ key: 'category', label: c ? localize(c.name, c.nameBn, locale) : cat });
  }
  const brand = params.get('brand');
  if (brand) chips.push({ key: 'brand', label: brands.find((b) => b.slug === brand)?.name ?? brand });
  const min = params.get('minPrice');
  if (min) chips.push({ key: 'minPrice', label: `${t('min')} ৳${min}` });
  const max = params.get('maxPrice');
  if (max) chips.push({ key: 'maxPrice', label: `${t('max')} ৳${max}` });
  if (params.get('inStock') === 'true') chips.push({ key: 'inStock', label: t('inStockOnly') });

  if (chips.length === 0) return null;

  return (
    <div className="flex flex-wrap items-center gap-2">
      {chips.map((c) => (
        <button
          key={c.key}
          type="button"
          onClick={() => navigate((next) => next.delete(c.key))}
          aria-label={t('removeFilter', { filter: c.label })}
          className="inline-flex items-center gap-1.5 h-8 pl-3 pr-2 rounded-full text-xs font-semibold
                     bg-[color:var(--accent)]/10 text-[color:var(--accent)] hover:bg-[color:var(--accent)] hover:text-white transition-colors"
        >
          {c.label}
          <X aria-hidden className="w-3.5 h-3.5" />
        </button>
      ))}
      <button
        type="button"
        onClick={() =>
          navigate((next) => {
            for (const k of ['category', 'brand', 'minPrice', 'maxPrice', 'inStock']) next.delete(k);
          })
        }
        className="text-xs font-bold text-[color:var(--fg-muted)] hover:text-[color:var(--color-sale)] underline underline-offset-4"
      >
        {t('clearAll')}
      </button>
    </div>
  );
}
