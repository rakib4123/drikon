'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { useTranslations } from 'next-intl';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import type { ProductSummary } from '@drikon/shared-types';
import { ProductCard } from './product-card';

/**
 * A single-line, horizontally scrolling row of product cards — the megastore
 * row. A wrapping grid left orphans (7 featured products rendered as 5 + 2 with
 * a hole); a carousel is one clean line at every width.
 *
 * Native scroll with snap points, so touch swiping, trackpads and the keyboard
 * (the track is focusable) all work without JS. The arrow buttons are an extra
 * for mouse users and disable themselves at either end.
 */
export function ProductCarousel({ products, label }: { products: ProductSummary[]; label: string }) {
  const t = useTranslations('home');
  const track = useRef<HTMLUListElement>(null);
  const [atStart, setAtStart] = useState(true);
  const [atEnd, setAtEnd] = useState(true);

  const measure = useCallback(() => {
    const el = track.current;
    if (!el) return;
    setAtStart(el.scrollLeft <= 4);
    setAtEnd(el.scrollLeft + el.clientWidth >= el.scrollWidth - 4);
  }, []);

  useEffect(() => {
    measure();
    const el = track.current;
    if (!el) return;
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    return () => ro.disconnect();
  }, [measure, products.length]);

  const page = (dir: 1 | -1) => {
    const el = track.current;
    if (!el) return;
    el.scrollBy({ left: dir * el.clientWidth, behavior: 'smooth' });
  };

  const scrollable = !(atStart && atEnd);

  return (
    <div className="relative" role="region" aria-roledescription="carousel" aria-label={label}>
      <ul
        ref={track}
        onScroll={measure}
        tabIndex={0}
        aria-label={label}
        className="flex gap-3 sm:gap-4 overflow-x-auto snap-x snap-mandatory scroll-smooth scrollbar-none pb-1
                   focus-visible:outline-offset-4 motion-reduce:scroll-auto"
      >
        {products.map((p) => (
          <li
            key={p.id}
            className="snap-start shrink-0 basis-[calc((100%-0.75rem)/2)] sm:basis-[calc((100%-1rem)/2)]
                       md:basis-[calc((100%-2rem)/3)] lg:basis-[calc((100%-3rem)/4)] xl:basis-[calc((100%-4rem)/5)]"
          >
            <ProductCard product={p} />
          </li>
        ))}
      </ul>

      {scrollable && (
        <>
          <CarouselButton side="left" disabled={atStart} onClick={() => page(-1)} label={t('previous')}>
            <ChevronLeft className="w-5 h-5" />
          </CarouselButton>
          <CarouselButton side="right" disabled={atEnd} onClick={() => page(1)} label={t('next')}>
            <ChevronRight className="w-5 h-5" />
          </CarouselButton>
        </>
      )}
    </div>
  );
}

function CarouselButton({
  side,
  disabled,
  onClick,
  label,
  children,
}: {
  side: 'left' | 'right';
  disabled: boolean;
  onClick: () => void;
  label: string;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      aria-label={label}
      // Centred on the image area (top ~40% of a card), not the whole card.
      className={`hidden md:grid absolute top-[38%] -translate-y-1/2 z-10 w-10 h-10 place-items-center rounded-full
                  bg-white border border-[color:var(--border)] shadow-[0_6px_16px_-6px_rgba(16,24,40,0.3)]
                  hover:bg-[color:var(--accent)] hover:text-white hover:border-[color:var(--accent)] transition-colors
                  disabled:opacity-0 disabled:pointer-events-none ${side === 'left' ? '-left-4' : '-right-4'}`}
    >
      {children}
    </button>
  );
}
