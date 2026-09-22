'use client';

import { motion } from 'motion/react';
import type { ProductSummary } from '@drikon/shared-types';
import { ProductCard } from './product-card';

const DEFAULT_GRID = 'grid-auto-products';

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
          // h-full so every card in a row stretches to the tallest, which keeps
          // the add-to-cart buttons on one line.
          className="h-full"
        >
          <ProductCard product={p} />
        </motion.div>
      ))}
    </div>
  );
}
