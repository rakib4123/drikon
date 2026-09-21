'use client';

import { useState } from 'react';
import Link from 'next/link';
import * as NavigationMenu from '@radix-ui/react-navigation-menu';
import { useLocale } from 'next-intl';
import { ChevronDown, ChevronRight, ArrowRight, Menu } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { CategoryIcon } from '@/components/shop/category-icon';
import type { NavCategory } from '@/lib/catalog';
import { localize } from '@/lib/localize';
import type { Locale } from '@/i18n/request';

/**
 * Shop mega-menu.
 *
 * Previously this opened on `onMouseEnter` only. It rendered `aria-expanded`
 * but had no key handler at all, so keyboard and touch users could never reach
 * the category tree — the panel was mouse-only. Radix NavigationMenu opens on
 * pointer, focus and Enter/Space/ArrowDown alike, moves focus into the panel,
 * closes on Escape and returns focus to the trigger, and manages the open delay
 * that the old `setTimeout(120)` approximated.
 *
 * The right-hand pane follows the focused category as well as the hovered one,
 * so arrowing down the left list previews each category the same way hovering
 * does.
 */
export function MegaMenu({ categories = [] }: { categories?: NavCategory[] }) {
  const locale = useLocale() as Locale;
  const t = useTranslations('nav');
  const [activeId, setActiveId] = useState<string | null>(null);

  const list = categories ?? [];
  const topLevel = list.filter((c) => !c.parentId);
  const childrenOf = (id: string) => list.filter((c) => c.parentId === id);

  // Default the right pane to the first category until one is hovered/focused.
  const active = topLevel.find((c) => c.id === activeId) ?? topLevel[0];
  const activeChildren = active ? childrenOf(active.id) : [];
  const activeName = active ? localize(active.name, active.nameBn, locale) : '';

  return (
    <NavigationMenu.Root
      // Reset the preview when the menu closes so it reopens on the first
      // category rather than whatever was last hovered.
      onValueChange={(v) => {
        if (!v) setActiveId(null);
      }}
      className="relative flex"
    >
      <NavigationMenu.List className="flex h-full list-none m-0 p-0">
        <NavigationMenu.Item className="flex">
          {/* The megastore "All categories" block: navy, full bar height, a fixed
              width that lines up with the homepage category sidebar below it. */}
          <NavigationMenu.Trigger className="group flex w-[260px] items-center gap-3 bg-[color:var(--color-ink)] px-4 text-[13.5px] font-bold text-white outline-none hover:bg-[color:var(--color-ink-soft)] data-[state=open]:bg-[color:var(--color-ink-soft)] transition-colors">
            <Menu aria-hidden className="w-[18px] h-[18px]" />
            <span className="flex-1 text-left">{t('allCategories')}</span>
            <ChevronDown aria-hidden className="w-4 h-4 transition-transform duration-200 group-data-[state=open]:rotate-180" />
          </NavigationMenu.Trigger>

          <NavigationMenu.Content
            className="absolute left-0 top-full z-50 text-[color:var(--fg)]
                       data-[motion=from-start]:animate-dk-fade-in data-[motion=from-end]:animate-dk-fade-in
                       data-[state=open]:animate-dk-fade-in data-[state=closed]:animate-dk-fade-out"
          >
            {topLevel.length === 0 ? (
              <div className="w-[260px] rounded-b-[var(--radius-card)] bg-[color:var(--surface-solid)] border border-[color:var(--border)] shadow-2xl p-5">
                <NavigationMenu.Link asChild>
                  <Link href="/products" className="text-sm text-[color:var(--accent)]">
                    Browse all products →
                  </Link>
                </NavigationMenu.Link>
              </div>
            ) : (
              <div className="w-[min(94vw,860px)] rounded-b-[var(--radius-card)] bg-[color:var(--surface-solid)] border border-t-0 border-[color:var(--border)] shadow-[0_24px_48px_-20px_rgba(16,24,40,0.35)] overflow-hidden grid grid-cols-[260px_1fr]">
                {/* Left: category list */}
                <ul className="max-h-[62vh] overflow-y-auto border-r border-[color:var(--border)] py-2 list-none m-0 bg-[color:var(--bg-soft)]/60">
                  {topLevel.map((cat) => {
                    const isActive = active?.id === cat.id;
                    return (
                      <li key={cat.id}>
                        <NavigationMenu.Link asChild>
                          <Link
                            href={`/products?category=${cat.slug}`}
                            // Focus drives the preview too, so keyboard users see
                            // the same right-pane change a mouse user gets.
                            onMouseEnter={() => setActiveId(cat.id)}
                            onFocus={() => setActiveId(cat.id)}
                            className={`flex items-center gap-3 px-4 py-2.5 text-sm font-medium transition-colors ${
                              isActive
                                ? 'bg-[color:var(--bg-soft)] text-[color:var(--accent)] shadow-[inset_3px_0_0_var(--accent)]'
                                : 'text-[color:var(--fg)] hover:text-[color:var(--accent)]'
                            }`}
                          >
                            <CategoryIcon slug={cat.slug} className="w-[18px] h-[18px] shrink-0 opacity-80" />
                            <span className="flex-1 truncate">{localize(cat.name, cat.nameBn, locale)}</span>
                            <ChevronRight aria-hidden className="w-3.5 h-3.5 shrink-0 opacity-50" />
                          </Link>
                        </NavigationMenu.Link>
                      </li>
                    );
                  })}
                </ul>

                {/* Right: subcategories of the active category */}
                <div className="p-6 max-h-[62vh] overflow-y-auto">
                  <div className="flex items-center justify-between mb-4">
                    <NavigationMenu.Link asChild>
                      <Link
                        href={`/products?category=${active?.slug}`}
                        className="inline-flex items-center gap-2 text-sm font-semibold hover:text-[color:var(--accent)]"
                      >
                        {active && <CategoryIcon slug={active.slug} className="w-5 h-5 text-[color:var(--accent)]" />}
                        <span className="text-base font-extrabold">{activeName}</span>
                      </Link>
                    </NavigationMenu.Link>
                    <NavigationMenu.Link asChild>
                      <Link
                        href={`/products?category=${active?.slug}`}
                        className="text-xs text-[color:var(--accent)] inline-flex items-center gap-1 hover:gap-1.5 transition-all"
                      >
                        View all <ArrowRight className="w-3.5 h-3.5" />
                      </Link>
                    </NavigationMenu.Link>
                  </div>

                  {activeChildren.length > 0 ? (
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-x-5 gap-y-2.5">
                      {activeChildren.map((k) => (
                        <NavigationMenu.Link asChild key={k.id}>
                          <Link
                            href={`/products?category=${k.slug}`}
                            className="text-sm text-[color:var(--fg-muted)] hover:text-[color:var(--accent)] transition-colors py-1.5"
                          >
                            {localize(k.name, k.nameBn, locale)}
                          </Link>
                        </NavigationMenu.Link>
                      ))}
                    </div>
                  ) : (
                    <div className="text-sm text-[color:var(--fg-muted)]">
                      {active?.description
                        ? localize(active.description, active.descriptionBn, locale)
                        : `Explore ${active?._count?.products ?? 0} products in ${activeName}.`}
                      <div className="mt-3">
                        <NavigationMenu.Link asChild>
                          <Link href={`/products?category=${active?.slug}`} className="btn-ghost !py-2 !px-4 text-sm">
                            Shop {activeName} <ArrowRight className="w-4 h-4" />
                          </Link>
                        </NavigationMenu.Link>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}
          </NavigationMenu.Content>
        </NavigationMenu.Item>
      </NavigationMenu.List>
    </NavigationMenu.Root>
  );
}
