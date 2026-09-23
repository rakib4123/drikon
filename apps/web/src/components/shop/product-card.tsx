'use client';

import Link from 'next/link';
import { ShoppingCart } from 'lucide-react';
import { toast } from 'sonner';
import { useLocale, useTranslations } from 'next-intl';
import type { ProductSummary } from '@drikon/shared-types';
import { formatPrice, effectivePrice } from '@/lib/utils';
import { useCartStore } from '@/store/cart-store';
import { localize } from '@/lib/localize';
import type { Locale } from '@/i18n/request';
import { TiltCard } from '@/components/ui/tilt-card';
import { WishlistButton } from './wishlist-button';
import { CompareButton } from './compare-button';
import { StarRating } from './star-rating';
import { ProductThumb } from './product-thumb';

/**
 * White surface product tile with CSS 3D tilt: product on the image well, badges top-left,
 * wishlist/compare rail top-right, rating, price, and a full-width add-to-cart.
 *
 * The action rail is hidden until hover only on devices that CAN hover. It
 * used to be `opacity-0` everywhere, which left wishlist and compare
 * permanently invisible on phones — touch screens never fire hover.
 */
export function ProductCard({ product }: { product: ProductSummary }) {
  const t = useTranslations('product');
  const locale = useLocale() as Locale;
  const add = useCartStore((s) => s.add);
  const name = localize(product.name, product.nameBn, locale);

  // A live flash sale beats the catalogue price, and it's what checkout charges.
  const { price, listPrice, onSale: onFlashSale, discountPercent } = effectivePrice(product);
  const compareAt = product.compareAtPrice
    ? typeof product.compareAtPrice === 'string'
      ? parseFloat(product.compareAtPrice)
      : product.compareAtPrice
    : null;
  // Strike through the flash-sale list price when there is one, otherwise the RRP.
  const struckPrice = onFlashSale ? listPrice : compareAt && compareAt > price ? compareAt : null;
  const discount = onFlashSale
    ? discountPercent
    : struckPrice
      ? Math.round(((struckPrice - price) / struckPrice) * 100)
      : 0;
  const soldOut = product.stock === 0;

  const hoverRail =
    '[@media(hover:hover)]:opacity-0 [@media(hover:hover)]:group-hover:opacity-100 focus-visible:opacity-100 aria-[pressed=true]:opacity-100 transition-opacity';

  return (
    <TiltCard className="group h-full">
      <article className="card card-hover !p-0 overflow-hidden flex flex-col h-full">
      <div className="relative aspect-square [background:var(--image-well)] overflow-hidden">
        <Link href={`/products/${product.slug}`} className="absolute inset-0" tabIndex={-1} aria-hidden>
          <ProductThumb
            src={product.images?.[0]?.url}
            sizes="(min-width: 1280px) 20vw, (min-width: 1024px) 25vw, (min-width: 640px) 33vw, 50vw"
            className="transition-transform duration-500 group-hover:scale-105"
            dimmed={soldOut}
          />
        </Link>

        <div className="absolute top-2.5 left-2.5 flex flex-col items-start gap-1.5 pointer-events-none">
          {discount > 0 && <span className="badge-deal">−{discount}%</span>}
          {onFlashSale && (
            <span className="badge-deal">{t('flashSaleBadge')}</span>
          )}
          {/* Sold-out badge: --fg fill with --bg text — inverted from the sale badge, not a shade of it. */}
          {soldOut && (
            <span className="inline-flex items-center px-[0.45rem] py-[0.2rem] rounded-[5px] text-[0.7rem] font-extrabold leading-none bg-[color:var(--fg)] text-[color:var(--bg)]">
              {t('soldOut')}
            </span>
          )}
        </div>

        <div className="absolute top-2 right-2 flex flex-col gap-1.5">
          <WishlistButton productId={product.id} productName={name} variant="overlay" className={hoverRail} />
          <CompareButton product={product} variant="overlay" className={hoverRail} />
        </div>
      </div>

      <div className="px-3.5 pb-3.5 pt-3 flex-1 flex flex-col border-t border-[color:var(--border)]">
        <div className="text-2xs font-semibold uppercase tracking-wide text-[color:var(--fg-muted)] mb-1 truncate">
          {product.brand?.name ?? product.category.name}
        </div>
        <Link href={`/products/${product.slug}`} className="min-h-[45px] flex items-center">
          <h3 className="text-sm font-semibold leading-snug line-clamp-2 min-h-[2.6em] hover:text-[color:var(--accent)] transition-colors">
            {name}
          </h3>
        </Link>

        <div className="mt-1.5 min-h-[18px]">
          {product.reviewCount > 0 && <StarRating value={product.averageRating} count={product.reviewCount} />}
        </div>

        <div className="mt-2 flex items-baseline flex-wrap gap-x-2">
          <span className={`price-now text-lg ${struckPrice ? 'is-sale' : ''}`}>{formatPrice(price, product.currency)}</span>
          {struckPrice !== null && <span className="price-was text-xs">{formatPrice(struckPrice, product.currency)}</span>}
        </div>

        <button
          type="button"
          disabled={soldOut}
          onClick={(e) => {
            e.preventDefault();
            add({
              productId: product.id,
              name,
              slug: product.slug,
              image: product.images?.[0]?.url,
              unitPrice: price,
              currency: product.currency,
            });
            toast.success(t('addedToCartToastTitle'), { description: name });
          }}
          // bg/border (default AND hover) read --cta-bg/--cta-border/--cta-hover-bg/
          // --cta-hover-border rather than --color-ink/--accent directly: the deal band
          // (flash-sale-section.tsx) scopes these on a wrapper style, the same way it
          // scopes --surface/--fg, so this button can become a solid on-brand red there
          // instead of nearly disappearing (ink-on-ink) against its dark cards.
          className="mt-3 w-full inline-flex items-center justify-center gap-2 min-h-[45px] rounded-[var(--radius-ctl)] text-xs font-bold
                     bg-[color:var(--cta-bg)] text-white border border-[color:var(--cta-border)]
                     enabled:hover:bg-[color:var(--cta-hover-bg)] enabled:hover:border-[color:var(--cta-hover-border)]
                     transition-colors disabled:border-[color:var(--border)] disabled:text-[color:var(--fg-muted)]
                     disabled:bg-[color:var(--bg-soft)] disabled:cursor-not-allowed"
        >
          <ShoppingCart aria-hidden className="w-4 h-4" />
          {soldOut ? t('soldOutButton') : t('addToCart')}
        </button>
      </div>
    </article>
    </TiltCard>
  );
}
