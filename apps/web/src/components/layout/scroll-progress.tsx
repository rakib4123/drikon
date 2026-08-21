'use client';

import { motion, useScroll, useSpring } from 'motion/react';

/** Thin gradient bar pinned to the top of the viewport, filling as the page scrolls. */
export function ScrollProgress() {
  const { scrollYProgress } = useScroll();
  const scaleX = useSpring(scrollYProgress, { stiffness: 300, damping: 30, restDelta: 0.001 });

  return (
    <motion.div
      aria-hidden
      style={{ scaleX }}
      className="fixed top-0 left-0 right-0 z-50 h-[3px] origin-left bg-gradient-to-r from-[color:var(--accent)] via-emerald-400 to-teal-400"
    />
  );
}
