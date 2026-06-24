'use client';

import Link from 'next/link';
import { motion } from 'motion/react';
import { ArrowUpRight, Cpu, Shirt, Sofa, Sparkles } from 'lucide-react';
import type { ReactNode } from 'react';

interface Tile {
  title: string;
  blurb: string;
  href: string;
  icon: ReactNode;
  /** Tailwind grid span classes for the bento layout. */
  span: string;
  /** Accent gradient for the hover wash. */
  gradient: string;
}

const TILES: Tile[] = [
  {
    title: 'Electronics',
    blurb: 'Audio, wearables, and the gear that keeps up.',
    href: '/products?category=electronics',
    icon: <Cpu className="w-5 h-5" />,
    span: 'sm:col-span-2 sm:row-span-2',
    gradient: 'from-blue-500/20 to-sky-500/5',
  },
  {
    title: 'Fashion',
    blurb: 'Edited essentials, not fast fashion.',
    href: '/products?category=fashion',
    icon: <Shirt className="w-5 h-5" />,
    span: '',
    gradient: 'from-indigo-500/20 to-blue-500/5',
  },
  {
    title: 'Home & Living',
    blurb: 'Objects worth keeping.',
    href: '/products?category=home-living',
    icon: <Sofa className="w-5 h-5" />,
    span: '',
    gradient: 'from-sky-500/20 to-cyan-500/5',
  },
  {
    title: 'Featured',
    blurb: 'This week’s hand-picked drop.',
    href: '/products?featured=true',
    icon: <Sparkles className="w-5 h-5" />,
    span: 'sm:col-span-2',
    gradient: 'from-slate-500/20 to-blue-500/5',
  },
];

export function CategoryShowcase() {
  return (
    <section className="max-w-7xl mx-auto px-6 py-20">
      <div className="mb-10">
        <div className="text-xs font-mono uppercase tracking-[0.2em] text-[color:var(--accent)] mb-2">
          Browse
        </div>
        <h2 className="display text-3xl md:text-4xl">Shop by category</h2>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-5 auto-rows-[180px]">
        {TILES.map((tile, i) => (
          <motion.div
            key={tile.title}
            className={tile.span}
            initial={{ opacity: 0, y: 18 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: '-40px' }}
            transition={{ duration: 0.45, ease: 'easeOut', delay: Math.min(i * 0.07, 0.3) }}
          >
            <Link
              href={tile.href}
              className="group relative h-full w-full overflow-hidden rounded-2xl border border-[color:var(--border)] glass p-6 flex flex-col justify-between transition-all duration-300 hover:-translate-y-1 hover:border-[color:var(--accent)] hover:shadow-[0_24px_60px_-30px_rgba(37,99,235,0.45)]"
            >
              {/* Hover gradient wash */}
              <div
                className={`pointer-events-none absolute inset-0 bg-gradient-to-br ${tile.gradient} opacity-0 group-hover:opacity-100 transition-opacity duration-300`}
                aria-hidden
              />

              <div className="relative flex items-center justify-between">
                <span className="w-10 h-10 rounded-xl bg-[color:var(--bg)] border border-[color:var(--border)] grid place-items-center text-[color:var(--accent)]">
                  {tile.icon}
                </span>
                <ArrowUpRight className="w-5 h-5 text-[color:var(--fg-muted)] transition-transform duration-300 group-hover:-translate-y-0.5 group-hover:translate-x-0.5 group-hover:text-[color:var(--fg)]" />
              </div>

              <div className="relative">
                <div className="display text-xl mb-1">{tile.title}</div>
                <p className="text-sm text-[color:var(--fg-muted)] max-w-[28ch]">{tile.blurb}</p>
              </div>
            </Link>
          </motion.div>
        ))}
      </div>
    </section>
  );
}
