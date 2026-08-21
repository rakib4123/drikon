'use client';

import { useRef, useState } from 'react';
import Link from 'next/link';
import { AnimatePresence, motion } from 'motion/react';
import { useLocale } from 'next-intl';
import { ChevronDown, ChevronRight, ArrowRight, LayoutGrid } from 'lucide-react';
import type { NavCategory } from '@/lib/catalog';
import { localize } from '@/lib/localize';
import type { Locale } from '@/i18n/request';

export function MegaMenu({ categories = [] }: { categories?: NavCategory[] }) {
  const locale = useLocale() as Locale;
  const [open, setOpen] = useState(false);
  const [activeId, setActiveId] = useState<string | null>(null);
  const closeTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const list = categories ?? [];
  const topLevel = list.filter((c) => !c.parentId);
  const childrenOf = (id: string) => list.filter((c) => c.parentId === id);

  // Default the right pane to the first category until one is hovered.
  const active = topLevel.find((c) => c.id === activeId) ?? topLevel[0];
  const activeChildren = active ? childrenOf(active.id) : [];

  const openNow = () => {
    if (closeTimer.current) clearTimeout(closeTimer.current);
    setOpen(true);
  };
  const closeSoon = () => {
    if (closeTimer.current) clearTimeout(closeTimer.current);
    closeTimer.current = setTimeout(() => setOpen(false), 120);
  };

  return (
    <div className="relative" onMouseEnter={openNow} onMouseLeave={closeSoon}>
      <button
        type="button"
        className="inline-flex items-center gap-1 hover:text-[color:var(--accent)] transition-colors"
        aria-expanded={open}
        onClick={() => setOpen((o) => !o)}
      >
        Shop
        <ChevronDown className={`w-3.5 h-3.5 transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 6 }}
            transition={{ duration: 0.16, ease: 'easeOut' }}
            className="absolute left-0 top-full pt-3 z-50"
          >
            {topLevel.length === 0 ? (
              <div className="rounded-2xl glass border border-[color:var(--border)] shadow-2xl p-5">
                <Link href="/products" className="text-sm text-[color:var(--accent)]">Browse all products →</Link>
              </div>
            ) : (
              <div className="w-[min(94vw,780px)] rounded-2xl glass border border-[color:var(--border)] shadow-2xl overflow-hidden grid grid-cols-[230px_1fr]">
                {/* Left: category list */}
                <ul className="max-h-[62vh] overflow-y-auto border-r border-[color:var(--border)] p-2">
                  {topLevel.map((cat) => {
                    const isActive = active?.id === cat.id;
                    return (
                      <li key={cat.id} onMouseEnter={() => setActiveId(cat.id)}>
                        <Link
                          href={`/products?category=${cat.slug}`}
                          className={`flex items-center justify-between gap-2 rounded-lg px-3 py-2 text-sm transition-colors ${
                            isActive
                              ? 'bg-[color:var(--accent)]/12 text-[color:var(--accent)] font-medium'
                              : 'text-[color:var(--fg-muted)] hover:text-[color:var(--fg)]'
                          }`}
                        >
                          <span className="truncate">{localize(cat.name, cat.nameBn, locale)}</span>
                          <ChevronRight className="w-3.5 h-3.5 shrink-0" />
                        </Link>
                      </li>
                    );
                  })}
                </ul>

                {/* Right: subcategories of the active category */}
                <div className="p-5 max-h-[62vh] overflow-y-auto">
                  <div className="flex items-center justify-between mb-4">
                    <Link
                      href={`/products?category=${active?.slug}`}
                      className="inline-flex items-center gap-2 text-sm font-semibold hover:text-[color:var(--accent)]"
                    >
                      <span className="w-6 h-6 rounded-md bg-[color:var(--accent)]/10 grid place-items-center text-[color:var(--accent)]">
                        <LayoutGrid className="w-3.5 h-3.5" />
                      </span>
                      {active ? localize(active.name, active.nameBn, locale) : ''}
                    </Link>
                    <Link href={`/products?category=${active?.slug}`} className="text-xs text-[color:var(--accent)] inline-flex items-center gap-1 hover:gap-1.5 transition-all">
                      View all <ArrowRight className="w-3.5 h-3.5" />
                    </Link>
                  </div>

                  {activeChildren.length > 0 ? (
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-x-5 gap-y-2.5">
                      {activeChildren.map((k) => (
                        <Link
                          key={k.id}
                          href={`/products?category=${k.slug}`}
                          className="text-sm text-[color:var(--fg-muted)] hover:text-[color:var(--accent)] transition-colors border-b border-[color:var(--border)] py-1.5"
                        >
                          {localize(k.name, k.nameBn, locale)}
                        </Link>
                      ))}
                    </div>
                  ) : (
                    <div className="text-sm text-[color:var(--fg-muted)]">
                      {active?.description || `Explore ${active?._count?.products ?? 0} products in ${active?.name}.`}
                      <div className="mt-3">
                        <Link href={`/products?category=${active?.slug}`} className="btn-ghost !py-2 !px-4 text-sm">
                          Shop {active ? localize(active.name, active.nameBn, locale) : ''} <ArrowRight className="w-4 h-4" />
                        </Link>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
