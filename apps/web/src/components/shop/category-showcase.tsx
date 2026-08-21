'use client';

import Link from 'next/link';
import { motion } from 'motion/react';
import { useLocale } from 'next-intl';
import { ArrowUpRight, LayoutGrid, Zap, Smartphone, ShieldCheck, BatteryCharging } from 'lucide-react';
import type { ReactNode } from 'react';
import type { NavCategory } from '@/lib/catalog';
import { localize } from '@/lib/localize';
import type { Locale } from '@/i18n/request';

// Map known catalog category slugs to fitting icons (falls back to a grid).
const CATEGORY_ICONS: Record<string, ReactNode> = {
  'smartphones': <Smartphone className="w-5 h-5" />,
  'cases': <ShieldCheck className="w-5 h-5" />,
  'power': <BatteryCharging className="w-5 h-5" />,
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
  /** Permanently dark background + white text, independent of `image` — used for the deals tile. */
  dark?: boolean;
}

const GRADIENTS = [
  'from-black/8 to-transparent',
  'from-black/6 to-transparent',
  'from-black/10 to-transparent',
  'from-black/6 to-transparent',
  'from-black/8 to-transparent',
  'from-black/10 to-transparent',
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
  const locale = useLocale() as Locale;
  const cats = (categories ?? []).filter((c) => !c.parentId).slice(0, 5);
  if (cats.length === 0) return null;

  const tiles: Tile[] = [
    ...cats.map((c, i) => ({
      title: localize(c.name, c.nameBn, locale),
      blurb: localize(
        c.description || `${c._count?.products ?? 0} product${(c._count?.products ?? 0) === 1 ? '' : 's'}`,
        c.descriptionBn,
        locale,
      ),
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
      gradient: 'from-black/8 to-transparent',
      dark: true,
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

      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 sm:gap-5 auto-rows-[150px] sm:auto-rows-[180px]">
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
              className={`group relative h-full w-full overflow-hidden rounded-2xl border p-6 flex flex-col justify-between transition-all duration-300 hover:-translate-y-1 hover:shadow-[0_24px_60px_-30px_var(--shadow)] ${
                tile.dark
                  ? 'border-transparent bg-[#151515] hover:border-[#151515]'
                  : 'border-[color:var(--border)] glass hover:border-[color:var(--accent)]'
              }`}
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
              {!tile.dark && (
                <div
                  className={`pointer-events-none absolute inset-0 bg-gradient-to-br ${tile.gradient} opacity-0 group-hover:opacity-100 transition-opacity duration-300`}
                  aria-hidden
                />
              )}

              <div className="relative flex items-center justify-between">
                <span
                  className={`w-10 h-10 rounded-xl border grid place-items-center ${
                    tile.image || tile.dark
                      ? 'bg-white/10 border-white/15 text-white'
                      : 'bg-[color:var(--bg)] border-[color:var(--border)] text-[color:var(--accent)]'
                  }`}
                >
                  {tile.icon}
                </span>
                <ArrowUpRight
                  className={`w-5 h-5 transition-transform duration-300 group-hover:-translate-y-0.5 group-hover:translate-x-0.5 ${
                    tile.image || tile.dark ? 'text-white/70 group-hover:text-white' : 'text-[color:var(--fg-muted)] group-hover:text-[color:var(--fg)]'
                  }`}
                />
              </div>

              <div className="relative">
                <div className={`display text-xl mb-1 ${tile.image || tile.dark ? 'text-white' : ''}`}>{tile.title}</div>
                <p className={`text-sm max-w-[28ch] ${tile.image || tile.dark ? 'text-white/85' : 'text-[color:var(--fg-muted)]'}`}>{tile.blurb}</p>
              </div>
            </Link>
          </motion.div>
        ))}
      </div>
    </section>
  );
}
