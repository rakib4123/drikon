'use client';

import Link from 'next/link';
import * as NavigationMenu from '@radix-ui/react-navigation-menu';
import { useLocale } from 'next-intl';
import { Menu, ChevronDown, ArrowRight } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { CategoryIcon } from '@/components/shop/category-icon';
import type { NavCategory, NavBrand } from '@/lib/catalog';
import { localize } from '@/lib/localize';
import type { Locale } from '@/i18n/request';

/**
 * The "All categories" trigger + panel that the black category bar owns.
 * A white card, two columns of categories (with icons) plus a brands column.
 * Radix NavigationMenu opens on pointer, focus and Enter/Space/ArrowDown
 * alike, moves focus into the panel, closes on Escape and returns focus to
 * the trigger.
 */
export function MegaMenu({
  categories = [],
  brands = [],
}: {
  categories?: NavCategory[];
  brands?: NavBrand[];
}) {
  const locale = useLocale() as Locale;
  const t = useTranslations('nav');

  const topLevel = (categories ?? []).filter((c) => !c.parentId);
  const mid = Math.ceil(topLevel.length / 2);
  const columns = [topLevel.slice(0, mid), topLevel.slice(mid)];

  return (
    <NavigationMenu.Root className="relative flex h-full">
      <NavigationMenu.List className="flex h-full list-none m-0 p-0 items-stretch">
        <NavigationMenu.Item className="flex">
          <NavigationMenu.Trigger className="group flex h-full items-center gap-2 px-4 text-sm font-semibold text-white outline-none hover:bg-white/10 data-[state=open]:bg-white/10 transition-colors">
            <Menu aria-hidden className="w-[18px] h-[18px]" />
            {t('allCategories')}
            <ChevronDown aria-hidden className="w-4 h-4 transition-transform duration-200 group-data-[state=open]:rotate-180" />
          </NavigationMenu.Trigger>

          <NavigationMenu.Content
            className="absolute left-0 top-full z-50 pt-2 text-[color:var(--fg)]
                       data-[motion=from-start]:animate-dk-fade-in data-[motion=from-end]:animate-dk-fade-in
                       data-[state=open]:animate-dk-fade-in data-[state=closed]:animate-dk-fade-out"
          >
            <div className="w-[min(94vw,760px)] rounded-[var(--radius-card)] bg-white border border-[color:var(--border)] shadow-[0_24px_48px_-20px_rgba(10,12,20,0.35)] overflow-hidden grid grid-cols-1 sm:grid-cols-[1fr_1fr_220px]">
              {topLevel.length === 0 ? (
                <div className="p-5 col-span-full">
                  <NavigationMenu.Link asChild>
                    <Link href="/products" className="text-sm text-[color:var(--accent)]">
                      {t('allProducts')} <ArrowRight className="inline w-3.5 h-3.5" />
                    </Link>
                  </NavigationMenu.Link>
                </div>
              ) : (
                columns.map((col, i) => (
                  <div
                    key={i}
                    className={`p-5 ${i === 0 ? 'border-b sm:border-b-0 sm:border-r border-[color:var(--border)]' : ''}`}
                  >
                    <h2 className="mb-3 text-xs font-bold uppercase tracking-wide text-[color:var(--accent)]">
                      {i === 0 ? t('categories') : ' '}
                    </h2>
                    <ul className="space-y-0.5 max-h-[52vh] overflow-y-auto">
                      {col.map((cat) => (
                        <li key={cat.id}>
                          <NavigationMenu.Link asChild>
                            <Link
                              href={`/products?category=${cat.slug}`}
                              className="flex items-center gap-3 rounded-[var(--radius-ctl)] px-2.5 py-2 text-sm font-medium text-[color:var(--fg)] hover:bg-[color:var(--bg-soft)] hover:text-[color:var(--accent)] transition-colors"
                            >
                              <CategoryIcon slug={cat.slug} className="w-[18px] h-[18px] shrink-0 opacity-80" />
                              <span className="flex-1 truncate">{localize(cat.name, cat.nameBn, locale)}</span>
                            </Link>
                          </NavigationMenu.Link>
                        </li>
                      ))}
                    </ul>
                  </div>
                ))
              )}

              {/* Top brands */}
              <div className="p-5 border-t sm:border-t-0 sm:border-l border-[color:var(--border)] bg-[color:var(--bg-soft)]">
                <h2 className="mb-3 text-xs font-bold uppercase tracking-wide text-[color:var(--accent)]">
                  {t('topBrands')}
                </h2>
                {brands.length === 0 ? (
                  <p className="text-sm text-[color:var(--fg-muted)]">{t('allProducts')}</p>
                ) : (
                  <ul className="space-y-0.5 max-h-[52vh] overflow-y-auto">
                    {brands.map((b) => (
                      <li key={b.id}>
                        <NavigationMenu.Link asChild>
                          <Link
                            href={`/products?brand=${b.slug}`}
                            className="block rounded-[var(--radius-ctl)] px-2.5 py-2 text-sm font-medium text-[color:var(--fg)] hover:bg-white hover:text-[color:var(--accent)] transition-colors"
                          >
                            {b.name}
                          </Link>
                        </NavigationMenu.Link>
                      </li>
                    ))}
                  </ul>
                )}
                <NavigationMenu.Link asChild>
                  <Link
                    href="/products"
                    className="mt-3 inline-flex items-center gap-1 text-sm font-semibold text-[color:var(--accent)] hover:gap-1.5 transition-all"
                  >
                    {t('allProducts')} <ArrowRight className="w-3.5 h-3.5" />
                  </Link>
                </NavigationMenu.Link>
              </div>
            </div>
          </NavigationMenu.Content>
        </NavigationMenu.Item>
      </NavigationMenu.List>
    </NavigationMenu.Root>
  );
}
