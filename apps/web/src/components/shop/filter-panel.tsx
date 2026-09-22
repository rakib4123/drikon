'use client';

import { useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useLocale, useTranslations } from 'next-intl';
import { Checkbox, Switch } from '@/components/ui/checkbox';
import { CategoryIcon } from './category-icon';
import { localize } from '@/lib/localize';
import type { Locale } from '@/i18n/request';

export interface FilterBrand {
  id: string;
  name: string;
  slug: string;
}

export interface FilterCategory {
  id: string;
  name: string;
  nameBn?: string | null;
  slug: string;
  parentId?: string | null;
  _count?: { products: number };
}

/** Writes a mutation to the URL. Any filter change resets pagination. */
export function useFilterNavigation() {
  const router = useRouter();
  const params = useSearchParams();
  return (mutate: (next: URLSearchParams) => void) => {
    const next = new URLSearchParams(params.toString());
    mutate(next);
    next.delete('page');
    const qs = next.toString();
    router.push(qs ? `/products?${qs}` : '/products');
  };
}

/**
 * The catalogue filters: category, brand, price range, availability.
 *
 * Filters live in the URL, not component state — a filtered view is shareable,
 * survives a reload, and the server renders the right products. The API has
 * supported every one of these params; this is the UI for them.
 *
 * Used twice: in the desktop sidebar and inside the mobile filter drawer.
 * `onApplied` lets the drawer close itself after a change.
 */
export function FilterPanel({
  brands,
  categories,
  onApplied,
}: {
  brands: FilterBrand[];
  categories: FilterCategory[];
  onApplied?: () => void;
}) {
  const params = useSearchParams();
  const t = useTranslations('products');
  const locale = useLocale() as Locale;
  const navigate = useFilterNavigation();

  const activeCategory = params.get('category');
  const activeBrand = params.get('brand');
  const minPrice = params.get('minPrice') ?? '';
  const maxPrice = params.get('maxPrice') ?? '';
  const inStock = params.get('inStock') === 'true';

  const [draftMin, setDraftMin] = useState(minPrice);
  const [draftMax, setDraftMax] = useState(maxPrice);
  // Keep the price inputs in step when a chip or "clear all" changes the URL.
  useEffect(() => setDraftMin(minPrice), [minPrice]);
  useEffect(() => setDraftMax(maxPrice), [maxPrice]);

  const set = (key: string, value: string | null) => {
    navigate((next) => (value ? next.set(key, value) : next.delete(key)));
    onApplied?.();
  };

  const applyPrice = () => {
    navigate((next) => {
      if (draftMin) next.set('minPrice', draftMin);
      else next.delete('minPrice');
      if (draftMax) next.set('maxPrice', draftMax);
      else next.delete('maxPrice');
    });
    onApplied?.();
  };

  const topCats = categories.filter((c) => !c.parentId);

  return (
    <div className="divide-y divide-[color:var(--border)]">
      {topCats.length > 0 && (
        <FilterSection title={t('categories')}>
          <ul className="space-y-0.5 -mx-2">
            <li>
              <CategoryOption active={!activeCategory} onClick={() => set('category', null)}>
                <span className="flex-1">{t('all')}</span>
              </CategoryOption>
            </li>
            {topCats.map((c) => (
              <li key={c.id}>
                <CategoryOption active={activeCategory === c.slug} onClick={() => set('category', c.slug)}>
                  <CategoryIcon slug={c.slug} className="w-4 h-4 shrink-0 opacity-70" />
                  <span className="flex-1 truncate">{localize(c.name, c.nameBn, locale)}</span>
                  {c._count?.products !== undefined && (
                    <span className="text-xs text-[color:var(--fg-muted)] tabular-nums">{c._count.products}</span>
                  )}
                </CategoryOption>
              </li>
            ))}
          </ul>
        </FilterSection>
      )}

      {brands.length > 0 && (
        <FilterSection title={t('brand')}>
          <div className="space-y-2.5">
            {brands.map((b) => (
              <label key={b.id} className="flex items-center gap-2.5 text-sm cursor-pointer hover:text-[color:var(--accent)]">
                <Checkbox
                  checked={activeBrand === b.slug}
                  // Single-select against the API's one `brand` param:
                  // ticking a brand replaces the current one.
                  onCheckedChange={(v) => set('brand', v ? b.slug : null)}
                />
                {b.name}
              </label>
            ))}
          </div>
        </FilterSection>
      )}

      <FilterSection title={t('priceRange')}>
        <div className="flex items-center gap-2">
          <input
            type="number"
            inputMode="numeric"
            min="0"
            value={draftMin}
            onChange={(e) => setDraftMin(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && applyPrice()}
            placeholder={t('min')}
            aria-label={t('minPrice')}
            className="input !py-2"
          />
          <span aria-hidden className="text-[color:var(--fg-muted)] shrink-0">–</span>
          <input
            type="number"
            inputMode="numeric"
            min="0"
            value={draftMax}
            onChange={(e) => setDraftMax(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && applyPrice()}
            placeholder={t('max')}
            aria-label={t('maxPrice')}
            className="input !py-2"
          />
        </div>
        <button type="button" onClick={applyPrice} className="btn-dark w-full mt-3 !py-2">
          {t('apply')}
        </button>
      </FilterSection>

      <FilterSection title={t('availability')}>
        <label className="flex items-center justify-between gap-3 text-sm cursor-pointer">
          {t('inStockOnly')}
          <Switch
            checked={inStock}
            onCheckedChange={(v) => set('inStock', v ? 'true' : null)}
            aria-label={t('inStockOnly')}
          />
        </label>
      </FilterSection>
    </div>
  );
}

function FilterSection({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="p-5">
      <h2 className="font-display text-base mb-3.5">{title}</h2>
      {children}
    </section>
  );
}

function CategoryOption({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={`w-full flex items-center gap-2.5 px-2 py-1.5 rounded-md text-sm text-left transition-colors ${
        active
          ? 'bg-[color:var(--accent)]/10 text-[color:var(--accent)] font-bold'
          : 'hover:bg-[color:var(--bg-soft)] hover:text-[color:var(--accent)]'
      }`}
    >
      {children}
    </button>
  );
}
