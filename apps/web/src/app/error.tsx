'use client';

import { useEffect } from 'react';
import Link from 'next/link';
import { motion } from 'motion/react';
import { RefreshCw, Home, AlertTriangle } from 'lucide-react';

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // Surface to the console (and any monitoring) without leaking to the UI.
    console.error(error);
  }, [error]);

  return (
    <div className="relative min-h-[70vh] grid place-items-center overflow-hidden aurora px-6">
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
        className="relative z-10 text-center max-w-md"
      >
        <div className="w-14 h-14 rounded-2xl bg-[color:var(--accent)]/15 text-[color:var(--accent)] grid place-items-center mx-auto mb-5 animate-glow-pulse">
          <AlertTriangle className="w-7 h-7" />
        </div>
        <h1 className="display text-3xl">Something went wrong.</h1>
        <p className="text-[color:var(--fg-muted)] mt-3">
          An unexpected error occurred. You can retry, or head back home.
        </p>
        <div className="mt-8 flex flex-wrap gap-3 justify-center">
          <button onClick={reset} className="btn-primary"><RefreshCw className="w-4 h-4" /> Try again</button>
          <Link href="/" className="btn-ghost"><Home className="w-4 h-4" /> Home</Link>
        </div>
      </motion.div>
    </div>
  );
}
