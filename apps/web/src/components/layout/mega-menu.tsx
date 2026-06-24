'use client';

import { useRef, useState } from 'react';
import Link from 'next/link';
import { AnimatePresence, motion } from 'motion/react';
import { ChevronDown, ArrowRight, LayoutGrid } from 'lucide-react';
import type { NavCategory } from '@/lib/catalog';

export function MegaMenu({ categories = [] }: { categories?: NavCategory[] }) {
  const [open, setOpen] = useState(false);
  const closeTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const list = categories ?? [];
  const topLevel = list.filter((c) => !c.parentId);
  const childrenOf = (id: string) => list.filter((c) => c.parentId === id);

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
            <div className="w-[min(92vw,720px)] rounded-2xl glass border border-[color:var(--border)] shadow-2xl p-5">
              {topLevel.length === 0 ? (
                <Link href="/products" className="text-sm text-[color:var(--accent)]">
                  Browse all products →
                </Link>
              ) : (
                <>
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-x-6 gap-y-5">
                    {topLevel.map((cat) => {
                      const kids = childrenOf(cat.id);
                      return (
                        <div key={cat.id}>
                          <Link
                            href={`/products?category=${cat.slug}`}
                            className="flex items-center gap-2 text-sm font-semibold hover:text-[color:var(--accent)] transition-colors mb-2"
                          >
                            <span className="w-6 h-6 rounded-md bg-[color:var(--accent)]/10 grid place-items-center text-[color:var(--accent)]">
                              <LayoutGrid className="w-3.5 h-3.5" />
                            </span>
                            {cat.name}
                          </Link>
                          {kids.length > 0 ? (
                            <ul className="space-y-1.5 pl-8">
                              {kids.map((k) => (
                                <li key={k.id}>
                                  <Link
                                    href={`/products?category=${k.slug}`}
                                    className="text-sm text-[color:var(--fg-muted)] hover:text-[color:var(--fg)] transition-colors"
                                  >
                                    {k.name}
                                  </Link>
                                </li>
                              ))}
                            </ul>
                          ) : (
                            <div className="pl-8 text-xs text-[color:var(--fg-muted)]">
                              {cat._count?.products ?? 0} products
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>

                  <div className="mt-5 pt-4 border-t border-[color:var(--border)] flex items-center justify-between">
                    <Link href="/products" className="text-sm font-medium text-[color:var(--accent)] inline-flex items-center gap-1 hover:gap-2 transition-all">
                      Browse all products <ArrowRight className="w-4 h-4" />
                    </Link>
                    <Link href="/products?featured=true" className="text-xs text-[color:var(--fg-muted)] hover:text-[color:var(--fg)]">
                      Featured this week
                    </Link>
                  </div>
                </>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
