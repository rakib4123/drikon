'use client';

import { useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { SlidersHorizontal, X } from 'lucide-react';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Checkbox, Switch } from '@/components/ui/checkbox';

export interface FilterBrand {
  id: string;
  name: string;
  slug: string;
}

/**
 * Filter panel for the product catalogue.
 *
 * The API has supported `brand`, `minPrice`, `maxPrice` and `inStock` since the
 * catalogue shipped, but nothing in the storefront exposed them — this is the UI
 * for filters that already existed server-side.
 *
 * Filters live in the URL rather than component state so a filtered view is
 * shareable, survives a reload, and lets the server render the right products.
 */
export function ProductFilters({ brands }: { brands: FilterBrand[] }) {
  const router = useRouter();
  const params = useSearchParams();
  const t = useTranslations('products');
  const [open, setOpen] = useState(false);

  const activeBrand = params.get('brand');
  const minPrice = params.get('minPrice') ?? '';
  const maxPrice = params.get('maxPrice') ?? '';
  const inStock = params.get('inStock') === 'true';

  const [draftMin, setDraftMin] = useState(minPrice);
  const [draftMax, setDraftMax] = useState(maxPrice);

  const activeCount =
    (activeBrand ? 1 : 0) + (minPrice ? 1 : 0) + (maxPrice ? 1 : 0) + (inStock ? 1 : 0);

  const commit = (mutate: (next: URLSearchParams) => void) => {
    const next = new URLSearchParams(params.toString());
    mutate(next);
    // Any filter change invalidates the current page offset.
    next.delete('page');
    router.push(`/products?${next.toString()}`);
  };

  const setParam = (key: string, value: string | null) =>
    commit((next) => (value ? next.set(key, value) : next.delete(key)));

  const clearAll = () => {
    setDraftMin('');
    setDraftMax('');
    commit((next) => {
      next.delete('brand');
      next.delete('minPrice');
      next.delete('maxPrice');
      next.delete('inStock');
    });
  };

  const applyPrice = () => {
    commit((next) => {
      if (draftMin) next.set('minPrice', draftMin);
      else next.delete('minPrice');
      if (draftMax) next.set('maxPrice', draftMax);
      else next.delete('maxPrice');
    });
    setOpen(false);
  };

  return (
    <div className="flex items-center gap-2 flex-wrap">
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <button
            type="button"
            className="inline-flex items-center gap-2 rounded-[10px] px-3.5 py-2.5 text-sm font-semibold
                       border border-[color:var(--border)] bg-[color:var(--bg-soft)]
                       hover:border-[color:var(--accent)] transition-colors
                       data-[state=open]:border-[color:var(--accent)]"
          >
            <SlidersHorizontal className="w-4 h-4" />
            {t('filters')}
            {activeCount > 0 && (
              <span className="min-w-[18px] h-[18px] px-1.5 rounded-full bg-[color:var(--accent)] text-white text-[10px] font-bold inline-flex items-center justify-center">
                {activeCount}
              </span>
            )}
          </button>
        </PopoverTrigger>

        <PopoverContent className="w-[17rem]">
          <div className="space-y-5">
            {brands.length > 0 && (
              <fieldset className="space-y-2.5">
                <legend className="text-[11px] font-mono uppercase tracking-[0.2em] text-[color:var(--fg-muted)] mb-2">
                  {t('brand')}
                </legend>
                {brands.map((b) => {
                  const checked = activeBrand === b.slug;
                  return (
                    <label key={b.id} className="flex items-center gap-2.5 text-sm cursor-pointer">
                      <Checkbox
                        checked={checked}
                        // Single-select against the API's one `brand` param:
                        // ticking a brand replaces the current one.
                        onCheckedChange={(v) => setParam('brand', v ? b.slug : null)}
                      />
                      {b.name}
                    </label>
                  );
                })}
              </fieldset>
            )}

            <div className="space-y-2">
              <div className="text-[11px] font-mono uppercase tracking-[0.2em] text-[color:var(--fg-muted)]">
                {t('priceRange')}
              </div>
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
                  className="input !py-2 !text-sm"
                />
                <span className="text-[color:var(--fg-muted)] shrink-0">–</span>
                <input
                  type="number"
                  inputMode="numeric"
                  min="0"
                  value={draftMax}
                  onChange={(e) => setDraftMax(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && applyPrice()}
                  placeholder={t('max')}
                  aria-label={t('maxPrice')}
                  className="input !py-2 !text-sm"
                />
              </div>
            </div>

            <label className="flex items-center justify-between gap-3 text-sm cursor-pointer">
              {t('inStockOnly')}
              <Switch
                checked={inStock}
                onCheckedChange={(v) => setParam('inStock', v ? 'true' : null)}
                aria-label={t('inStockOnly')}
              />
            </label>

            <div className="flex gap-2 pt-1">
              <button type="button" onClick={clearAll} className="btn-ghost flex-1 !py-2 !text-sm">
                {t('clear')}
              </button>
              <button type="button" onClick={applyPrice} className="btn-primary flex-1 !py-2 !text-sm">
                {t('apply')}
              </button>
            </div>
          </div>
        </PopoverContent>
      </Popover>

      {/* Active filters, each individually removable. */}
      {activeBrand && (
        <FilterChip label={brands.find((b) => b.slug === activeBrand)?.name ?? activeBrand} onRemove={() => setParam('brand', null)} />
      )}
      {minPrice && <FilterChip label={`${t('min')} ${minPrice}`} onRemove={() => { setDraftMin(''); setParam('minPrice', null); }} />}
      {maxPrice && <FilterChip label={`${t('max')} ${maxPrice}`} onRemove={() => { setDraftMax(''); setParam('maxPrice', null); }} />}
      {inStock && <FilterChip label={t('inStockOnly')} onRemove={() => setParam('inStock', null)} />}
    </div>
  );
}

function FilterChip({ label, onRemove }: { label: string; onRemove: () => void }) {
  return (
    <button
      type="button"
      onClick={onRemove}
      className="inline-flex items-center gap-1.5 h-8 pl-3 pr-2 rounded-full text-xs
                 border border-[color:var(--border)] bg-[color:var(--bg-soft)]
                 hover:border-[color:var(--accent)] transition-colors"
    >
      {label}
      <X className="w-3.5 h-3.5 text-[color:var(--fg-muted)]" />
    </button>
  );
}
