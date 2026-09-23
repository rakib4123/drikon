'use client';

import { AnimatePresence, motion } from 'motion/react';
import { cn } from '@/lib/utils';

/**
 * Cart / wishlist / compare count badge that springs in and re-pops whenever
 * the number changes (keyed on `count`), for a satisfying "added!" beat.
 * Hidden at zero. Always orange with dark text (orange fills take dark
 * text per the contrast rules) — a single, consistent "something's in
 * here" signal regardless of which icon it sits on.
 */
export function CountBadge({ count, className }: { count: number; className?: string }) {
  return (
    <AnimatePresence mode="popLayout">
      {count > 0 && (
        <motion.span
          key={count}
          initial={{ scale: 0, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0, opacity: 0 }}
          transition={{ type: 'spring', stiffness: 520, damping: 17 }}
          className={cn(
            'absolute -top-1 -right-1 min-w-4 h-4 px-1 rounded-full text-2xs font-bold grid place-items-center',
            'bg-[color:var(--accent-2)] text-[color:var(--fg)] shadow-[0_2px_5px_-1px_rgba(28,25,23,0.35)]',
            className,
          )}
        >
          {count}
        </motion.span>
      )}
    </AnimatePresence>
  );
}
