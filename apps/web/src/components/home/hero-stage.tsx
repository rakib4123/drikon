import Link from 'next/link';
import { ArrowRight } from 'lucide-react';
import type { ResolvedContent } from '@/lib/settings';
import type { ProductSummary } from '@drikon/shared-types';
import { HeroSceneLoader } from '@/components/three/hero-scene-loader';

/**
 * Opening hero: HTML headline and calls to action (SEO, keyboard, screen
 * readers) beside the WebGL scene. Every product shown orbiting the core is
 * also a normal link further down the page, so nothing is reachable only in 3D.
 */
export function HeroStage({ c, products }: { c: ResolvedContent; products: ProductSummary[] }) {
  const heroProducts = products
    .filter((p) => p.images?.[0]?.url)
    .slice(0, 6)
    .map((p) => ({ slug: p.slug, name: p.name, image: p.images[0].url }));

  return (
    <section className="relative overflow-hidden rounded-[var(--radius-card)] border border-[color:var(--border)] bg-[color:var(--surface)] grid-texture grid sm:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
      <div className="relative z-10 p-6 sm:p-10 lg:p-14 flex flex-col justify-center">
        <span className="badge-deal">{c.heroBadge}</span>
        <h1 className="font-display mt-3 text-2xl sm:text-4xl lg:text-[44px] font-bold leading-[1.05]">
          <span className="neon-text">
            {c.heroTitle.split('\n').map((line, i, arr) => (
              <span key={i}>
                {line}
                {i < arr.length - 1 && <br />}
              </span>
            ))}
          </span>
        </h1>
        <p className="mt-4 max-w-md text-[15px] text-[color:var(--fg-muted)]">{c.heroSubtitle}</p>
        <div className="mt-7 flex flex-wrap gap-3">
          <Link href={c.heroCtaHref} className="btn-primary">
            {c.heroCtaLabel} <ArrowRight aria-hidden className="w-4 h-4" />
          </Link>
          <Link href={c.heroCtaAltHref} className="btn-ghost">
            {c.heroCtaAltLabel}
          </Link>
        </div>
      </div>
      <div className="relative h-[260px] sm:h-[340px] lg:h-[420px]">
        <HeroSceneLoader products={heroProducts} />
      </div>
    </section>
  );
}
