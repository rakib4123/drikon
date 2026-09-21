'use client';

import { useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { SlidersHorizontal, X } from 'lucide-react';
import { Dialog, DialogClose, DialogContent, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { FilterPanel, type FilterBrand, type FilterCategory } from './filter-panel';

/** Below `lg` the filter sidebar becomes this drawer, which closes itself after each change. */
export function MobileFilters({ brands, categories }: { brands: FilterBrand[]; categories: FilterCategory[] }) {
  const [open, setOpen] = useState(false);
  const params = useSearchParams();
  const t = useTranslations('products');
  const active = ['category', 'brand', 'minPrice', 'maxPrice', 'inStock'].filter((k) => params.get(k)).length;

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <button type="button" className="lg:hidden btn-ghost !py-2 !px-3.5">
          <SlidersHorizontal aria-hidden className="w-4 h-4" />
          {t('filters')}
          {active > 0 && (
            <span className="min-w-[18px] h-[18px] px-1 rounded-full bg-[color:var(--accent)] text-white text-[10px] font-bold grid place-items-center">
              {active}
            </span>
          )}
        </button>
      </DialogTrigger>
      <DialogContent variant="drawer-left">
        <div className="flex items-center justify-between px-5 h-14 border-b border-[color:var(--border)] shrink-0">
          <DialogTitle className="text-base font-extrabold">{t('filters')}</DialogTitle>
          <DialogClose aria-label={t('close')} className="p-2 rounded-lg hover:bg-[color:var(--bg-soft)]">
            <X className="w-5 h-5" />
          </DialogClose>
        </div>
        <div className="flex-1 overflow-y-auto">
          <FilterPanel brands={brands} categories={categories} onApplied={() => setOpen(false)} />
        </div>
      </DialogContent>
    </Dialog>
  );
}
