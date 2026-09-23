import Link from 'next/link';
import { ArrowRight } from 'lucide-react';
import { getLocale } from 'next-intl/server';
import type { ProductSummary } from '@drikon/shared-types';
import { effectivePrice, formatPrice } from '@/lib/utils';
import { localize } from '@/lib/localize';
import type { Locale } from '@/i18n/request';
import { ShowcaseLoader } from '@/components/three/showcase-loader';
import { Reveal } from '@/components/ui/reveal';

/**
 * Full-bleed black `.carbon` band that gives one featured product the 3D
 * showcase treatment: kicker, name, short description and price on the
 * left, `ShowcaseLoader` on the right. Renders nothing without a product
 * photo — the 3D stage (and its 2D fallback) both need one.
 */
export async function SpotlightBand({
  product,
  labels,
}: {
  product: ProductSummary | null;
  labels: { kicker: string; view: string };
}) {
  const img = product?.images?.[0]?.url ?? null;
  if (!product || !img) return null;

  const locale = (await getLocale()) as Locale;
  const name = localize(product.name, product.nameBn, locale);
  const description = product.shortDescription
    ? localize(product.shortDescription, product.shortDescriptionBn, locale)
    : null;
  const { price } = effectivePrice(product);

  return (
    <section className="carbon bg-[color:var(--color-ink)] py-12 lg:py-16" aria-labelledby="spotlight-heading">
      <div className="shell @container">
        {/* [&>*]:min-w-0: a grid item's automatic minimum width is its
            content's min-content size, which can force the single mobile
            column wider than the viewport before the `@[48rem]` split ever
            kicks in — this lets each column actually shrink to fit. */}
        <div className="grid items-center gap-8 [&>*]:min-w-0 @[48rem]:grid-cols-2">
          <Reveal>
            <div className="max-w-lg">
              <span className="text-xs font-bold uppercase tracking-[0.2em] text-[color:var(--accent-2)]">
                {labels.kicker}
              </span>
              <h2 id="spotlight-heading" className="font-display mt-3 text-3xl leading-[1.1] text-white sm:text-4xl">
                {name}
              </h2>
              {description && <p className="mt-4 leading-relaxed text-white/70">{description}</p>}
              <p className="mt-5 text-2xl font-extrabold text-[color:var(--accent-2)]">
                {formatPrice(price, product.currency)}
              </p>
              <Link href={`/products/${product.slug}`} className="btn-primary mt-6">
                {labels.view} <ArrowRight aria-hidden className="h-4 w-4" />
              </Link>
            </div>
          </Reveal>
          <Reveal delay={0.1}>
            <ShowcaseLoader
              name="spotlight"
              imageUrl={img}
              alt={name}
              className="aspect-[4/3] min-h-[16rem] max-h-[70dvh] w-full"
            />
          </Reveal>
        </div>
      </div>
    </section>
  );
}
