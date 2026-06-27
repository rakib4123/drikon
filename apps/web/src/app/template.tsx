'use client';

import { motion, useReducedMotion } from 'motion/react';

/**
 * Route-level transition. `template.tsx` remounts on every navigation, so this
 * replays the entrance each time the page changes — a subtle, fast fade + rise
 * + de-blur that reads as "premium" without slowing navigation. Disabled under
 * reduced-motion.
 */
export default function Template({ children }: { children: React.ReactNode }) {
  const reduce = useReducedMotion();
  if (reduce) return <>{children}</>;

  return (
    <motion.div
      initial={{ opacity: 0, y: 10, filter: 'blur(6px)' }}
      animate={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
      transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
    >
      {children}
    </motion.div>
  );
}
