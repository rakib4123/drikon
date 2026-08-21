'use client';

import { motion, useReducedMotion } from 'motion/react';

/** Huge, faint monochrome brand wordmark — sits behind the footer content as a decorative backdrop. */
export function BrandWatermark({ text }: { text: string }) {
  const reduceMotion = useReducedMotion();

  return (
    <div className="absolute inset-0 z-0 flex items-center justify-center overflow-hidden select-none pointer-events-none">
      <motion.div
        initial={reduceMotion ? { opacity: 0 } : { opacity: 0, y: 24 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, margin: '-40px' }}
        transition={{ type: 'spring', stiffness: 300, damping: 30 }}
        className="display text-center leading-none text-[36vw] sm:text-[30vw] md:text-[24vw] lg:text-[20vw] tracking-tight text-transparent [-webkit-text-stroke:1px_var(--border)]"
        style={{ WebkitTextFillColor: 'color-mix(in srgb, var(--fg) 4%, transparent)' }}
      >
        {text}
      </motion.div>
    </div>
  );
}
