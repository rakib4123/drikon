'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { motion, useReducedMotion } from 'motion/react';
import { ChevronLeft, ChevronRight, ArrowRight } from 'lucide-react';
import type { Banner } from '@/lib/banners';

const AUTOPLAY_MS = 6000;

export function HeroSlider({ slides }: { slides: Banner[] }) {
  const reduce = useReducedMotion();
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
      className="relative h-[440px] md:h-[560px] overflow-hidden grid-overlay"
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
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <Image
                  src={b.imageUrl}
                  alt=""
                  fill
                  priority={i === 0}
                  sizes="100vw"
                  className={`object-cover transition-transform ease-out duration-[6000ms] ${active && !reduce ? 'scale-110' : 'scale-100'}`}
                />
                <div className="absolute inset-0 bg-gradient-to-r from-[#0b1322]/88 via-[#0b1322]/55 to-[#0b1322]/10" />
              </>
            ) : (
              <div className="absolute inset-0 bg-drikon-gradient" />
            )}

            {/* Content */}
            <div className="relative z-10 h-full max-w-7xl mx-auto px-6 flex items-center">
              <motion.div
                className="max-w-xl text-white"
                initial={false}
                animate={active && !reduce ? { opacity: 1, y: 0 } : reduce ? {} : { opacity: 0, y: 24 }}
                transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1], delay: active ? 0.18 : 0 }}
              >
                <h1 className="display text-4xl md:text-6xl mb-4 text-glow">{b.heading}</h1>
                {b.subheading && (
                  <p className="text-white/85 text-base md:text-lg mb-7 max-w-lg">{b.subheading}</p>
                )}
                {b.ctaLabel && (
                  <Link
                    href={b.ctaHref || '/products'}
                    className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-white text-[#14233f] font-semibold hover:bg-white/90 transition-colors shadow-lg"
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
            className="absolute left-3 md:left-5 top-1/2 -translate-y-1/2 z-20 w-10 h-10 rounded-full bg-white/15 hover:bg-white/30 backdrop-blur grid place-items-center text-white transition-colors"
          >
            <ChevronLeft className="w-5 h-5" />
          </button>
          <button
            type="button"
            onClick={() => go(index + 1)}
            aria-label="Next slide"
            className="absolute right-3 md:right-5 top-1/2 -translate-y-1/2 z-20 w-10 h-10 rounded-full bg-white/15 hover:bg-white/30 backdrop-blur grid place-items-center text-white transition-colors"
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
                  i === index ? 'w-6 bg-white' : 'w-2 bg-white/50 hover:bg-white/80'
                }`}
              />
            ))}
          </div>
        </>
      )}
    </section>
  );
}
