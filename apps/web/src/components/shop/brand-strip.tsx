'use client';

import Link from 'next/link';
import { motion } from 'motion/react';

interface Brand {
  id: string;
  name: string;
  slug: string;
  logoUrl?: string | null;
}

/** "Trusted brands" row — links each brand to its filtered catalog. */
export function BrandStrip({ brands }: { brands: Brand[] }) {
  if (!brands || brands.length === 0) return null;

  return (
    <section className="max-w-7xl mx-auto px-6 py-14">
      <div className="text-center mb-8">
        <div className="text-xs font-mono uppercase tracking-[0.2em] text-[color:var(--accent)] mb-2">
          Trusted brands
        </div>
        <h2 className="display text-2xl md:text-3xl">Premium brands you love</h2>
      </div>
      <div className="flex flex-wrap items-center justify-center gap-3">
        {brands.map((b, i) => (
          <motion.div
            key={b.id}
            initial={{ opacity: 0, y: 12 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: '-40px' }}
            transition={{ duration: 0.4, ease: 'easeOut', delay: Math.min(i * 0.05, 0.3) }}
          >
            <Link
              href={`/products?brand=${b.slug}`}
              className="group flex items-center gap-2 px-5 py-3 rounded-xl border border-[color:var(--border)] glass hover:border-[color:var(--accent)] hover:-translate-y-0.5 transition-all"
            >
              {b.logoUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={b.logoUrl} alt={b.name} className="h-6 w-auto object-contain" />
              ) : (
                <span className="font-semibold text-sm group-hover:text-[color:var(--accent)] transition-colors">
                  {b.name}
                </span>
              )}
            </Link>
          </motion.div>
        ))}
      </div>
    </section>
  );
}
