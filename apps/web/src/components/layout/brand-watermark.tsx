'use client';

import { motion, useReducedMotion } from 'motion/react';

/** Huge, colorful gradient-fill brand wordmark — sits behind the footer content as a decorative backdrop. */
export function BrandWatermark({ text }: { text: string }) {
  const reduceMotion = useReducedMotion();

  return (
    <div className="absolute inset-0 z-0 flex items-center justify-center overflow-hidden select-none pointer-events-none">
      <motion.div
        initial={reduceMotion ? { opacity: 0 } : { opacity: 0, y: 24 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, margin: '-40px' }}
        transition={{ type: 'spring', stiffness: 300, damping: 30 }}
        className="display text-center leading-none text-[20vw] sm:text-[16vw] md:text-[12vw] tracking-tight bg-clip-text text-transparent [-webkit-text-stroke:1px_color-mix(in_srgb,var(--accent)_18%,transparent)]"
        style={{
          backgroundImage:
            'linear-gradient(100deg, rgba(59,130,246,0.32), rgba(168,85,247,0.32), rgba(236,72,153,0.32), rgba(249,115,22,0.32))',
        }}
      >
        {text}
      </motion.div>
    </div>
  );
}
