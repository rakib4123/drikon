'use client';

import { useRouter, useSearchParams } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

/**
 * Sort control for the product catalogue.
 *
 * Was a horizontal row of links: nothing announced which option was current
 * beyond a background colour, there was no typeahead, and on a narrow screen the
 * options scrolled off behind an invisible overflow. A listbox announces the
 * selected option, supports typeahead and arrow keys, and stays one control wide.
 */
export function ProductSort({ current }: { current: string }) {
  const router = useRouter();
  const params = useSearchParams();
  const t = useTranslations('products');

  const options = [
    { value: 'newest', label: t('sortNewest') },
    { value: 'popular', label: t('sortPopular') },
    { value: 'price_asc', label: t('sortPriceAsc') },
    { value: 'price_desc', label: t('sortPriceDesc') },
    { value: 'rating', label: t('sortRating') },
  ];

  const onChange = (value: string) => {
    const next = new URLSearchParams(params.toString());
    next.set('sort', value);
    // Re-sorting invalidates the current page offset.
    next.delete('page');
    router.push(`/products?${next.toString()}`);
  };

  return (
    <div className="flex items-center gap-2">
      <span className="text-sm text-[color:var(--fg-muted)] shrink-0">{t('sortLabel')}</span>
      <Select value={current} onValueChange={onChange}>
        <SelectTrigger aria-label={t('sortLabel')} className="min-w-[11rem]">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {options.map((o) => (
            <SelectItem key={o.value} value={o.value}>
              {o.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}
