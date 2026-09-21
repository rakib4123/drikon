'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import Image from '@/components/ui/smart-image';
import { motion, useReducedMotion } from 'motion/react';
import { useLocale } from 'next-intl';
import { ChevronLeft, ChevronRight, ArrowRight } from 'lucide-react';
import type { Banner } from '@/lib/banners';
import { localize } from '@/lib/localize';
import type { Locale } from '@/i18n/request';

const AUTOPLAY_MS = 6000;

export function HeroSlider({ slides }: { slides: Banner[] }) {
  const reduce = useReducedMotion();
  const locale = useLocale() as Locale;
  const [index, setIndex] = useState(0);
  const [paused, setPaused] = useState(false);
  const count = slides.length;

  const go = useCallback((i: number) => setIndex(((i % count) + count) % count), [count]);

  useEffect(() => {
    if (reduce || paused || count <= 1) return;
    const id = setInterval(() => setIndex((p) => (p + 1) % count), AUTOPLAY_MS);
    return () => clearInterval(id);
  }, [reduce, paused, count]);

  if (count === 0) return null;

  return (
    <section
      className="relative h-[240px] sm:h-[340px] lg:h-[420px] overflow-hidden rounded-[var(--radius-card)] bg-[color:var(--color-ink)]"
      aria-roledescription="carousel"
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
    >
      {slides.map((b, i) => {
        const active = i === index;
        return (
          <div
            key={b.id}
            aria-hidden={!active}
            className={`absolute inset-0 transition-opacity duration-700 ease-out ${
              active ? 'opacity-100' : 'opacity-0 pointer-events-none'
            }`}
          >
            {/* Background */}
            {b.imageUrl ? (
              <>
                <Image
                  src={b.imageUrl}
                  alt=""
                  fill
                  priority={i === 0}
                  sizes="(min-width: 1280px) 780px, (min-width: 1024px) 70vw, 100vw"
                  className={`object-cover transition-transform ease-out duration-[6000ms] ${active && !reduce ? 'scale-110' : 'scale-100'}`}
                />
                <div className="absolute inset-0 bg-gradient-to-r from-[#0b1424]/85 via-[#0b1424]/45 to-transparent" />
              </>
            ) : (
              <div className="absolute inset-0 bg-drikon-gradient" />
            )}

            {/* Content */}
            <div className="relative z-10 h-full px-6 sm:px-10 lg:px-14 flex items-center">
              <motion.div
                className="max-w-xl text-white"
                initial={false}
                animate={active && !reduce ? { opacity: 1, y: 0 } : reduce ? {} : { opacity: 0, y: 24 }}
                transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1], delay: active ? 0.18 : 0 }}
              >
                <h1 className="display text-2xl sm:text-4xl lg:text-5xl mb-3 text-glow">{localize(b.heading, b.headingBn, locale)}</h1>
                {b.subheading && (
                  <p className="text-white/85 text-sm sm:text-base mb-5 sm:mb-7 max-w-md line-clamp-2 sm:line-clamp-none">
                    {localize(b.subheading, b.subheadingBn, locale)}
                  </p>
                )}
                {b.ctaLabel && (
                  <Link
                    href={b.ctaHref || '/products'}
                    className="inline-flex items-center gap-2 px-5 sm:px-6 py-2.5 sm:py-3 rounded-[var(--radius-ctl)] bg-[color:var(--accent)] text-white font-bold hover:brightness-110 transition-[filter] shadow-lg"
                  >
                    {b.ctaLabel} <ArrowRight className="w-4 h-4" />
                  </Link>
                )}
              </motion.div>
            </div>
          </div>
        );
      })}

      {count > 1 && (
        <>
          <button
            type="button"
            onClick={() => go(index - 1)}
            aria-label="Previous slide"
            className="absolute left-3 top-1/2 -translate-y-1/2 z-20 w-9 h-9 rounded-full bg-white/90 hover:bg-white shadow grid place-items-center text-[color:var(--color-ink)] transition-colors"
          >
            <ChevronLeft className="w-5 h-5" />
          </button>
          <button
            type="button"
            onClick={() => go(index + 1)}
            aria-label="Next slide"
            className="absolute right-3 top-1/2 -translate-y-1/2 z-20 w-9 h-9 rounded-full bg-white/90 hover:bg-white shadow grid place-items-center text-[color:var(--color-ink)] transition-colors"
          >
            <ChevronRight className="w-5 h-5" />
          </button>

          <div className="absolute bottom-5 left-1/2 -translate-x-1/2 z-20 flex gap-2">
            {slides.map((_, i) => (
              <button
                key={i}
                type="button"
                onClick={() => setIndex(i)}
                aria-label={`Go to slide ${i + 1}`}
                aria-current={i === index}
                className={`h-2 rounded-full transition-all ${
                  i === index ? 'w-6 bg-[color:var(--accent-2)]' : 'w-2 bg-white/60 hover:bg-white'
                }`}
              />
            ))}
          </div>
        </>
      )}
    </section>
  );
}
