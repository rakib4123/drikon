'use client';

import Link from 'next/link';
import * as NavigationMenu from '@radix-ui/react-navigation-menu';
import { useLocale } from 'next-intl';
import { ChevronDown, ArrowRight } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { CategoryIcon } from '@/components/shop/category-icon';
import type { NavCategory, NavBrand } from '@/lib/catalog';
import { localize } from '@/lib/localize';
import type { Locale } from '@/i18n/request';

/**
 * The "Shop ▾" panel: a solid cream card with two columns — categories (with
 * icons) on the left, top brands on the right. It replaces the old
 * full-width accent category bar and its hover-following subcategory preview
 * entirely.
 *
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

  return (
    <NavigationMenu.Root className="relative flex">
      <NavigationMenu.List className="flex h-full list-none m-0 p-0 items-center">
        <NavigationMenu.Item className="flex">
          <NavigationMenu.Trigger className="group flex items-center gap-1.5 rounded-full px-3 py-2 text-sm font-semibold text-[color:var(--fg)] hover:text-[color:var(--accent-2)] hover:bg-[color:var(--bg-soft)] data-[state=open]:text-[color:var(--accent-2)] data-[state=open]:bg-[color:var(--bg-soft)] transition-colors">
            {t('shop')}
            <ChevronDown aria-hidden className="w-4 h-4 transition-transform duration-200 group-data-[state=open]:rotate-180" />
          </NavigationMenu.Trigger>

          <NavigationMenu.Content
            className="absolute left-0 top-full z-50 pt-3 text-[color:var(--fg)]
                       data-[motion=from-start]:animate-dk-fade-in data-[motion=from-end]:animate-dk-fade-in
                       data-[state=open]:animate-dk-fade-in data-[state=closed]:animate-dk-fade-out"
          >
            <div className="w-[min(90vw,600px)] rounded-[var(--radius-card)] bg-[color:var(--surface-solid)] border border-[color:var(--border)] shadow-[0_24px_48px_-20px_rgba(28,25,23,0.25)] overflow-hidden grid grid-cols-2">
              {/* Categories */}
              <div className="p-5 border-r border-[color:var(--border)]">
                <h2 className="mb-3 text-2xs font-bold uppercase tracking-wide text-[color:var(--fg-muted)]">
                  {t('categories')}
                </h2>
                {topLevel.length === 0 ? (
                  <NavigationMenu.Link asChild>
                    <Link href="/products" className="text-sm text-[color:var(--accent-2)]">
                      {t('allProducts')} <ArrowRight className="inline w-3.5 h-3.5" />
                    </Link>
                  </NavigationMenu.Link>
                ) : (
                  <ul className="space-y-0.5 max-h-[52vh] overflow-y-auto">
                    {topLevel.map((cat) => (
                      <li key={cat.id}>
                        <NavigationMenu.Link asChild>
                          <Link
                            href={`/products?category=${cat.slug}`}
                            className="flex items-center gap-3 rounded-[var(--radius-ctl)] px-2.5 py-2 text-sm font-medium text-[color:var(--fg)] hover:bg-[color:var(--bg-soft)] hover:text-[color:var(--accent-2)] transition-colors"
                          >
                            <CategoryIcon slug={cat.slug} className="w-[18px] h-[18px] shrink-0 opacity-80" />
                            <span className="flex-1 truncate">{localize(cat.name, cat.nameBn, locale)}</span>
                          </Link>
                        </NavigationMenu.Link>
                      </li>
                    ))}
                  </ul>
                )}
              </div>

              {/* Top brands */}
              <div className="p-5">
                <h2 className="mb-3 text-2xs font-bold uppercase tracking-wide text-[color:var(--fg-muted)]">
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
                            className="block rounded-[var(--radius-ctl)] px-2.5 py-2 text-sm font-medium text-[color:var(--fg)] hover:bg-[color:var(--bg-soft)] hover:text-[color:var(--accent-2)] transition-colors"
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
                    className="mt-3 inline-flex items-center gap-1 text-sm font-semibold text-[color:var(--accent-2)] hover:gap-1.5 transition-all"
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
