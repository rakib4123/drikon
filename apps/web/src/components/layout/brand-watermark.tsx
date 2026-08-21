'use client';

import { motion, useReducedMotion } from 'motion/react';

/** Huge, transparent-outline brand wordmark — a decorative footer watermark. */
export function BrandWatermark({ text }: { text: string }) {
  const reduceMotion = useReducedMotion();

  return (
    <div className="overflow-hidden select-none pointer-events-none">
      <motion.div
        initial={reduceMotion ? { opacity: 0 } : { opacity: 0, y: 24 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, margin: '-40px' }}
        transition={{ type: 'spring', stiffness: 300, damping: 30 }}
        className="display text-center leading-none text-[18vw] sm:text-[14vw] md:text-[10vw] tracking-tight text-transparent [-webkit-text-stroke:1px_var(--border)]"
      >
        {text}
      </motion.div>
    </div>
  );
}
