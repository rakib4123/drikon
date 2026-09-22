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
 * A featured product's story: a short text column and its 3D showcase side
 * by side. `flip` mirrors the columns from `lg` for the second spotlight.
 * Renders nothing without a product or a product photo.
 */
export async function Spotlight({
  product,
  flip = false,
  labels,
}: {
  product: ProductSummary | null;
  flip?: boolean;
  labels: { kicker: string; viewProduct: string };
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
    <section className="shell py-10 lg:py-14">
      <div className="grid gap-8 lg:grid-cols-2 items-center">
        <Reveal className={flip ? 'lg:order-2' : undefined}>
          <div className="max-w-lg">
            <span className="text-xs font-bold uppercase tracking-[0.2em] text-[color:var(--accent-2)]">
              {labels.kicker}
            </span>
            <h2 className="font-display mt-3 text-3xl sm:text-4xl leading-[1.1]">{name}</h2>
            {description && <p className="mt-4 leading-relaxed text-[color:var(--fg-muted)]">{description}</p>}
            <p className="price-now mt-5 text-2xl">{formatPrice(price, product.currency)}</p>
            <Link href={`/products/${product.slug}`} className="btn-primary mt-6">
              {labels.viewProduct} <ArrowRight aria-hidden className="h-4 w-4" />
            </Link>
          </div>
        </Reveal>
        <Reveal delay={0.1} className={flip ? 'lg:order-1' : undefined}>
          <ShowcaseLoader name="spotlight" imageUrl={img} alt={name} className="h-[320px] sm:h-[380px] lg:h-[440px]" />
        </Reveal>
      </div>
    </section>
  );
}
