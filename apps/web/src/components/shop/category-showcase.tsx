'use client';

import Link from 'next/link';
import { motion } from 'motion/react';
import { ArrowUpRight, LayoutGrid, Zap, Cpu, Radar, Cog, Bot, Plane, CircuitBoard, Wrench, Camera } from 'lucide-react';
import type { ReactNode } from 'react';
import type { NavCategory } from '@/lib/catalog';

// Map known robotics category slugs to fitting icons (falls back to a grid).
const CATEGORY_ICONS: Record<string, ReactNode> = {
  'microcontrollers': <Cpu className="w-5 h-5" />,
  'sensors-modules': <Radar className="w-5 h-5" />,
  'motors-actuators': <Cog className="w-5 h-5" />,
  'robotic-parts': <Bot className="w-5 h-5" />,
  'drones-fpv': <Plane className="w-5 h-5" />,
  'components': <CircuitBoard className="w-5 h-5" />,
  'tools-gear': <Wrench className="w-5 h-5" />,
  'gadgets': <Camera className="w-5 h-5" />,
};
const iconFor = (slug: string): ReactNode => CATEGORY_ICONS[slug] ?? <LayoutGrid className="w-5 h-5" />;

interface Tile {
  title: string;
  blurb: string;
  href: string;
  icon: ReactNode;
  span: string;
  gradient: string;
  image?: string | null;
}

const GRADIENTS = [
  'from-orange-500/20 to-amber-500/5',
  'from-amber-500/20 to-orange-500/5',
  'from-orange-600/20 to-red-500/5',
  'from-sky-500/20 to-cyan-500/5',
  'from-violet-500/20 to-fuchsia-500/5',
  'from-emerald-500/20 to-teal-500/5',
];

export function CategoryShowcase({
  categories,
  dealsTitle = "Today's deals",
  dealsBlurb = 'Hand-picked tech on sale this week.',
  dealsImage = '',
}: {
  categories: NavCategory[];
  dealsTitle?: string;
  dealsBlurb?: string;
  dealsImage?: string;
}) {
  const cats = (categories ?? []).filter((c) => !c.parentId).slice(0, 5);
  if (cats.length === 0) return null;

  const tiles: Tile[] = [
    ...cats.map((c, i) => ({
      title: c.name,
      blurb: c.description || `${c._count?.products ?? 0} product${(c._count?.products ?? 0) === 1 ? '' : 's'}`,
      href: `/products?category=${c.slug}`,
      icon: iconFor(c.slug),
      span: i === 0 ? 'sm:col-span-2 sm:row-span-2' : '',
      gradient: GRADIENTS[i % GRADIENTS.length],
      image: c.imageUrl,
    })),
    {
      title: dealsTitle,
      blurb: dealsBlurb,
      href: '/products?featured=true',
      icon: <Zap className="w-5 h-5" />,
      span: 'sm:col-span-2',
      gradient: 'from-slate-500/20 to-orange-500/5',
      image: dealsImage || null,
    },
  ];

  return (
    <section className="max-w-7xl mx-auto px-6 py-20">
      <div className="mb-10">
        <div className="text-xs font-mono uppercase tracking-[0.2em] text-[color:var(--accent)] mb-2">
          Browse
        </div>
        <h2 className="display text-3xl md:text-4xl">Shop by category</h2>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-5 auto-rows-[180px]">
        {tiles.map((tile, i) => (
          <motion.div
            key={tile.href}
            className={tile.span}
            initial={{ opacity: 0, y: 18 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: '-40px' }}
            transition={{ duration: 0.45, ease: 'easeOut', delay: Math.min(i * 0.07, 0.3) }}
          >
            <Link
              href={tile.href}
              className="group relative h-full w-full overflow-hidden rounded-2xl border border-[color:var(--border)] glass p-6 flex flex-col justify-between transition-all duration-300 hover:-translate-y-1 hover:border-[color:var(--accent)] hover:shadow-[0_24px_60px_-30px_rgba(239,106,32,0.45)]"
            >
              {tile.image && (
                <>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={tile.image}
                    alt=""
                    className="pointer-events-none absolute inset-0 w-full h-full object-cover opacity-70 group-hover:opacity-85 group-hover:scale-105 transition-all duration-500"
                  />
                  <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/70 via-black/25 to-black/10" aria-hidden />
                </>
              )}
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
                <div className={`display text-xl mb-1 ${tile.image ? 'text-white' : ''}`}>{tile.title}</div>
                <p className={`text-sm max-w-[28ch] ${tile.image ? 'text-white/85' : 'text-[color:var(--fg-muted)]'}`}>{tile.blurb}</p>
              </div>
            </Link>
          </motion.div>
        ))}
      </div>
    </section>
  );
}
