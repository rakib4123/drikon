'use client';

import { motion } from 'motion/react';
import type { ReactNode } from 'react';

/**
 * Fade-and-rise a block into view the first time it scrolls onscreen.
 * A lightweight, dependency-free scroll-reveal used across the storefront.
 */
export function Reveal({
  children,
  delay = 0,
  className,
}: {
  children: ReactNode;
  delay?: number;
  className?: string;
}) {
  return (
    <motion.div
      className={className}
      initial={{ opacity: 0, y: 18 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: '-60px' }}
      transition={{ duration: 0.5, ease: 'easeOut', delay }}
    >
      {children}
    </motion.div>
  );
}
