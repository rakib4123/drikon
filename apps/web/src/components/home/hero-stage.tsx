import Link from 'next/link';
import { ArrowRight } from 'lucide-react';
import type { ResolvedContent } from '@/lib/settings';
import type { ProductSummary } from '@drikon/shared-types';
import { HeroSceneLoader } from '@/components/three/hero-scene-loader';

/**
 * Opening hero: the WebGL scene fills the whole footprint, and the headline
 * and calls to action sit as HTML on top of it (SEO, keyboard, screen
 * readers), same overlay pattern as the old StaticHero. Every product shown
 * orbiting the core is also a normal link further down the page, so nothing
 * is reachable only in 3D.
 */
export function HeroStage({ c, products }: { c: ResolvedContent; products: ProductSummary[] }) {
  const heroProducts = products
    .filter((p) => p.images?.[0]?.url)
    .slice(0, 6)
    .map((p) => ({ slug: p.slug, name: p.name, image: p.images[0].url }));

  return (
    <section className="relative h-[300px] sm:h-[360px] lg:h-[420px] overflow-hidden rounded-[var(--radius-card)] border border-[color:var(--border)] bg-[color:var(--surface)] grid-texture">
      <div className="absolute inset-0">
        <HeroSceneLoader products={heroProducts} />
      </div>
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 bg-gradient-to-r from-[color:var(--bg)] via-[color:var(--bg)]/70 to-transparent"
      />
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
