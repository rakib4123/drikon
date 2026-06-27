'use client';

import { AnimatePresence, motion } from 'motion/react';
import { cn } from '@/lib/utils';

/**
 * Cart / wishlist count badge that springs in and re-pops whenever the number
 * changes (keyed on `count`), for a satisfying "added!" beat. Hidden at zero.
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
            'absolute -top-1 -right-1 min-w-4 h-4 px-1 rounded-full text-[10px] font-bold text-white grid place-items-center shadow-[0_0_10px_-2px_var(--glow)]',
            className,
          )}
        >
          {count}
        </motion.span>
      )}
    </AnimatePresence>
  );
}
