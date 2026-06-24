'use client';

import { motion } from 'motion/react';
import type { ProductSummary } from '@drikon/shared-types';
import { ProductCard } from './product-card';

const DEFAULT_GRID = 'grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6';

/**
 * A product grid whose cards stagger-reveal as they scroll into view.
 * Drop-in replacement for a plain mapped <ProductCard /> grid.
 */
export function ProductGrid({
  products,
  className = DEFAULT_GRID,
}: {
  products: ProductSummary[];
  className?: string;
}) {
  return (
    <div className={className}>
      {products.map((p, i) => (
        <motion.div
          key={p.id}
          initial={{ opacity: 0, y: 16 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: '-40px' }}
          transition={{ duration: 0.4, ease: 'easeOut', delay: Math.min(i * 0.05, 0.3) }}
        >
          <ProductCard product={p} />
        </motion.div>
      ))}
    </div>
  );
}
