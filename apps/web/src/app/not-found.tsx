'use client';

import Link from 'next/link';
import { motion } from 'motion/react';
import { Home } from 'lucide-react';

export default function NotFound() {
  return (
    <div className="relative min-h-[70vh] grid place-items-center overflow-hidden aurora grid-overlay px-6">
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
        className="relative z-10 text-center"
      >
        <div className="display text-7xl md:text-9xl neon-text text-glow leading-none">404</div>
        <h1 className="display text-2xl md:text-3xl mt-4">This page drifted off-grid.</h1>
        <p className="text-[color:var(--fg-muted)] mt-3 max-w-md mx-auto">
          The page you’re looking for doesn’t exist or has moved.
        </p>
        <div className="mt-8 flex flex-wrap gap-3 justify-center">
          <Link href="/" className="btn-primary"><Home className="w-4 h-4" /> Back home</Link>
          <Link href="/products" className="btn-ghost">Browse the shop</Link>
        </div>
      </motion.div>
    </div>
  );
}
