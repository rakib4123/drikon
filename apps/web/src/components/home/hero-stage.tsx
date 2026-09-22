import Link from 'next/link';
import { ArrowRight } from 'lucide-react';
import { getLocale } from 'next-intl/server';
import type { ResolvedContent } from '@/lib/settings';
import type { ProductSummary } from '@drikon/shared-types';
import { ShowcaseLoader } from '@/components/three/showcase-loader';
import { localize } from '@/lib/localize';
import type { Locale } from '@/i18n/request';

/**
 * Opening hero: the admin copy on the left, the first featured product on a
 * warm 3D stand (or its static fallback) on the right. Solid `--surface`
 * card, two columns from `lg`, stacked below — no scrim, since the text and
 * the showcase never overlap.
 */
export async function HeroStage({ c, product }: { c: ResolvedContent; product: ProductSummary | null }) {
  const locale = (await getLocale()) as Locale;
  const heroImage = product?.images?.[0]?.url ?? null;
  const heroAlt = product ? localize(product.name, product.nameBn, locale) : c.heroBadge;

  return (
    <section className="shell pt-4 lg:pt-6">
      <div className="grid gap-8 lg:grid-cols-2 items-center rounded-[var(--radius-card)] border border-[color:var(--border)] bg-[color:var(--surface)] px-6 py-10 sm:px-10 sm:py-12 lg:px-14 lg:py-14">
        <div className="animate-fade-up max-w-xl">
          <span className="badge-deal">{c.heroBadge}</span>
          <h1 className="font-display mt-4 text-4xl sm:text-5xl lg:text-6xl leading-[1.05]">
            {c.heroTitle.split('\n').map((line, i, arr) => (
              <span key={i}>
                {line}
                {i < arr.length - 1 && <br />}
              </span>
            ))}
          </h1>
          <p className="mt-5 text-base sm:text-lg text-[color:var(--fg-muted)] max-w-md">{c.heroSubtitle}</p>
          <div className="mt-8 flex flex-wrap gap-3">
            <Link href={c.heroCtaHref} className="btn-primary">
              {c.heroCtaLabel} <ArrowRight aria-hidden className="w-4 h-4" />
            </Link>
            <Link href={c.heroCtaAltHref} className="btn-ghost">
              {c.heroCtaAltLabel}
            </Link>
          </div>
        </div>
        <ShowcaseLoader name="hero" imageUrl={heroImage} alt={heroAlt} className="h-[280px] sm:h-[380px] lg:h-[460px]" />
      </div>
    </section>
  );
}
