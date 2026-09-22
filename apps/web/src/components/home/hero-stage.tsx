import Link from 'next/link';
import { ArrowRight } from 'lucide-react';
import type { ResolvedContent } from '@/lib/settings';
import type { ProductSummary } from '@drikon/shared-types';

/**
 * Opening hero, copy-only for now: the 3D orbiting-product scene is gone
 * (warm editorial redesign drops the neon backdrop), so this renders just the
 * headline and calls to action. `products` stays in the prop type — a later
 * pass (spec Task 5) replaces this file with a warm hero that uses it again.
 */
export function HeroStage({ c }: { c: ResolvedContent; products: ProductSummary[] }) {
  return (
    <section className="relative h-[300px] sm:h-[360px] lg:h-[420px] overflow-hidden rounded-[var(--radius-card)] border border-[color:var(--border)] bg-[color:var(--surface)] grid-texture">
      <div className="pointer-events-none relative z-10 h-full px-6 sm:px-10 lg:px-12 flex items-center">
        <div className="max-w-md">
          <span className="badge-deal">{c.heroBadge}</span>
          <h1 className="font-display mt-3 text-2xl sm:text-4xl lg:text-[40px] font-bold leading-[1.08]">
            <span className="neon-text">
              {c.heroTitle.split('\n').map((line, i, arr) => (
                <span key={i}>
                  {line}
                  {i < arr.length - 1 && <br />}
                </span>
              ))}
            </span>
          </h1>
          <p className="hidden sm:block mt-4 text-[15px] text-[color:var(--fg-muted)]">{c.heroSubtitle}</p>
          <div className="mt-7 flex flex-wrap gap-3">
            <Link href={c.heroCtaHref} className="pointer-events-auto btn-primary">
              {c.heroCtaLabel} <ArrowRight aria-hidden className="w-4 h-4" />
            </Link>
            <Link href={c.heroCtaAltHref} className="pointer-events-auto hidden sm:inline-flex btn-ghost">
              {c.heroCtaAltLabel}
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
}
