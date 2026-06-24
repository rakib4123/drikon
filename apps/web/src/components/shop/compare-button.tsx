'use client';

import { motion } from 'motion/react';
import { GitCompare } from 'lucide-react';
import { toast } from 'sonner';
import type { ProductSummary } from '@drikon/shared-types';
import { useCompareStore, MAX_COMPARE } from '@/store/compare-store';
import { cn } from '@/lib/utils';

interface CompareButtonProps {
  product: ProductSummary;
  variant?: 'overlay' | 'inline';
  className?: string;
}

export function CompareButton({ product, variant = 'overlay', className }: CompareButtonProps) {
  const active = useCompareStore((s) => s.items.some((i) => i.id === product.id));
  const toggle = useCompareStore((s) => s.toggle);

  const onClick = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    const result = toggle(product);
    if (result === 'full') {
      toast.error(`Compare is full`, { description: `Remove one to add another (max ${MAX_COMPARE}).` });
    } else if (result === 'added') {
      toast.success('Added to compare', { description: product.name });
    } else {
      toast('Removed from compare', { description: product.name });
    }
  };

  return (
    <motion.button
      type="button"
      onClick={onClick}
      whileTap={{ scale: 0.85 }}
      aria-pressed={active}
      aria-label={active ? 'Remove from compare' : 'Add to compare'}
      title="Compare"
      className={cn(
        'grid place-items-center transition-colors',
        variant === 'overlay'
          ? 'w-9 h-9 rounded-full bg-[color:var(--bg)]/80 backdrop-blur border border-[color:var(--border)] hover:bg-[color:var(--bg)] shadow-sm'
          : 'w-12 h-12 rounded-xl border border-[color:var(--border)] hover:bg-[color:var(--bg-soft)]',
        className,
      )}
    >
      <GitCompare className={cn('w-[18px] h-[18px] transition-colors', active ? 'text-[color:var(--accent)]' : 'text-[color:var(--fg-muted)] hover:text-[color:var(--accent)]')} />
    </motion.button>
  );
}
