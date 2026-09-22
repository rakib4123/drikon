import Link from 'next/link';
import { ArrowRight } from 'lucide-react';
import { getLocale, getTranslations } from 'next-intl/server';
import type { ResolvedContent } from '@/lib/settings';
import type { ProductSummary } from '@drikon/shared-types';
import { ShowcaseLoader } from '@/components/three/showcase-loader';
import { localize } from '@/lib/localize';
import { effectivePrice, formatPrice } from '@/lib/utils';
import type { Locale } from '@/i18n/request';

/**
 * Opening hero: the admin copy on the left, the first featured product on a
 * warm 3D stand (or its static fallback) on the right. Solid `--surface`
 * card, two columns from `lg`, stacked below — no scrim, since the text and
 * the showcase never overlap.
 *
 * The showcase's canvas is `aria-hidden` (SceneCanvas), so the whole stage
 * is wrapped in a real `<Link>` to the product with an explicit `aria-label`
 * — that's the accessible name and the actual way to reach the product by
 * keyboard/screen reader. The caption underneath (name, price, "View
 * product →") is inside the same link so sighted users see it's clickable.
 */
export async function HeroStage({ c, product }: { c: ResolvedContent; product: ProductSummary | null }) {
  const locale = (await getLocale()) as Locale;
  const t = await getTranslations('home');
  const heroImage = product?.images?.[0]?.url ?? null;
  const heroName = product ? localize(product.name, product.nameBn, locale) : null;
  const heroAlt = heroName ?? c.heroBadge;
  const showcase = <ShowcaseLoader name="hero" imageUrl={heroImage} alt={heroAlt} className="h-[280px] sm:h-[380px] lg:h-[460px]" />;

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
        {product ? (
          <Link href={`/products/${product.slug}`} aria-label={heroName ?? undefined} className="block">
            {showcase}
            <p className="mt-3 flex flex-wrap items-center justify-center gap-x-2 gap-y-1 text-center text-sm">
              <span className="font-semibold">{heroName}</span>
              <span className="price-now">{formatPrice(effectivePrice(product).price, product.currency)}</span>
              <span className="inline-flex items-center gap-1 font-bold text-[color:var(--accent-2)]">
                {t('viewProduct')} <ArrowRight aria-hidden className="h-3.5 w-3.5" />
              </span>
            </p>
          </Link>
        ) : (
          showcase
        )}
      </div>
    </section>
  );
}
