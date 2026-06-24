'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { AnimatePresence, motion } from 'motion/react';
import { GitCompare, X, ArrowRight } from 'lucide-react';
import { useCompareStore } from '@/store/compare-store';

export function CompareTray() {
  const [mounted, setMounted] = useState(false);
  const items = useCompareStore((s) => s.items);
  const remove = useCompareStore((s) => s.remove);
  const clear = useCompareStore((s) => s.clear);

  useEffect(() => setMounted(true), []);
  if (!mounted) return null;

  return (
    <AnimatePresence>
      {items.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 30 }}
          transition={{ type: 'spring', stiffness: 300, damping: 30 }}
          className="fixed bottom-4 left-1/2 -translate-x-1/2 z-50 w-[min(92vw,640px)]"
        >
          <div className="glass rounded-2xl border border-[color:var(--border)] shadow-2xl px-4 py-3 flex items-center gap-3">
            <span className="inline-flex items-center gap-1.5 text-sm font-medium shrink-0">
              <GitCompare className="w-4 h-4 text-[color:var(--accent)]" />
              Compare
            </span>

            <div className="flex-1 flex items-center gap-2 overflow-x-auto">
              {items.map((p) => (
                <div key={p.id} className="relative w-11 h-11 rounded-lg overflow-hidden bg-[color:var(--bg)] border border-[color:var(--border)] shrink-0 group">
                  {p.images?.[0]?.url && (
                    <Image src={p.images[0].url} alt={p.name} fill sizes="44px" className="object-cover" />
                  )}
                  <button
                    type="button"
                    onClick={() => remove(p.id)}
                    aria-label={`Remove ${p.name}`}
                    className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 grid place-items-center transition-opacity"
                  >
                    <X className="w-4 h-4 text-white" />
                  </button>
                </div>
              ))}
            </div>

            <button type="button" onClick={clear} className="text-xs text-[color:var(--fg-muted)] hover:text-[color:var(--fg)] shrink-0">
              Clear
            </button>
            <Link href="/compare" className="btn-primary !py-2 !px-4 text-sm shrink-0">
              Compare ({items.length}) <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
