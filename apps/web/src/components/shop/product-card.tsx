'use client';

import Image from 'next/image';
import Link from 'next/link';
import { ShoppingBag, Star } from 'lucide-react';
import { toast } from 'sonner';
import type { ProductSummary } from '@drikon/shared-types';
import { formatPrice } from '@/lib/utils';
import { useCartStore } from '@/store/cart-store';
import { WishlistButton } from './wishlist-button';
import { CompareButton } from './compare-button';

export function ProductCard({ product }: { product: ProductSummary }) {
  const add = useCartStore((s) => s.add);
  const price = typeof product.price === 'string' ? parseFloat(product.price) : product.price;
  const compareAt = product.compareAtPrice
    ? typeof product.compareAtPrice === 'string'
      ? parseFloat(product.compareAtPrice)
      : product.compareAtPrice
    : null;
  const onSale = compareAt && compareAt > price;
  const discount = onSale && compareAt ? Math.round(((compareAt - price) / compareAt) * 100) : 0;

  return (
    <article className="group card !p-0 overflow-hidden flex flex-col">
      <div className="relative aspect-[4/5] bg-[color:var(--bg)] overflow-hidden">
        <Link href={`/products/${product.slug}`} className="absolute inset-0">
          {product.images?.[0]?.url ? (
            <Image
              src={product.images[0].url}
              alt={product.images[0].alt ?? product.name}
              fill
              sizes="(min-width: 1024px) 25vw, (min-width: 640px) 50vw, 100vw"
              className="object-cover transition-transform duration-500 group-hover:scale-105"
            />
          ) : (
            <div className="w-full h-full bg-drikon-mesh" />
          )}
        </Link>
        {onSale && (
          <span className="absolute top-3 left-3 px-2 py-1 text-[10px] font-bold rounded-md bg-[color:var(--accent)] text-white">
            −{discount}%
          </span>
        )}
        {product.stock === 0 && (
          <span className="absolute bottom-3 left-3 px-2 py-1 text-[10px] font-bold rounded-md bg-black/70 text-white">
            SOLD OUT
          </span>
        )}
        <WishlistButton
          productId={product.id}
          productName={product.name}
          variant="overlay"
          className="absolute top-2.5 right-2.5 opacity-0 group-hover:opacity-100 focus-visible:opacity-100 aria-[pressed=true]:opacity-100 transition-opacity"
        />
        <CompareButton
          product={product}
          variant="overlay"
          className="absolute top-[3.4rem] right-2.5 opacity-0 group-hover:opacity-100 focus-visible:opacity-100 aria-[pressed=true]:opacity-100 transition-opacity"
        />
      </div>

      <div className="p-4 flex-1 flex flex-col">
        <div className="text-[11px] font-mono uppercase tracking-wider text-[color:var(--fg-muted)] mb-1">
          {product.brand?.name ?? product.category.name}
        </div>
        <Link href={`/products/${product.slug}`}>
          <h3 className="text-[15px] font-semibold leading-snug line-clamp-2 hover:text-[color:var(--accent)] transition-colors">
            {product.name}
          </h3>
        </Link>

        {product.averageRating > 0 && (
          <div className="flex items-center gap-1 mt-1.5 text-xs text-[color:var(--fg-muted)]">
            <Star className="w-3.5 h-3.5 fill-[color:var(--accent-2)] text-[color:var(--accent-2)]" />
            <span>{product.averageRating.toFixed(1)}</span>
            <span>({product.reviewCount})</span>
          </div>
        )}

        <div className="mt-auto pt-4 flex items-end justify-between gap-2">
          <div>
            <div className="font-semibold">{formatPrice(price, product.currency)}</div>
            {onSale && compareAt && (
              <div className="text-xs text-[color:var(--fg-muted)] line-through">
                {formatPrice(compareAt, product.currency)}
              </div>
            )}
          </div>
          <button
            type="button"
            disabled={product.stock === 0}
            onClick={(e) => {
              e.preventDefault();
              add({
                productId: product.id,
                name: product.name,
                slug: product.slug,
                image: product.images?.[0]?.url,
                unitPrice: price,
                currency: product.currency,
              });
              toast.success('Added to cart', { description: product.name });
            }}
            className="p-2.5 rounded-lg bg-[color:var(--bg)] border border-[color:var(--border)] hover:bg-[color:var(--accent)] hover:text-white hover:border-[color:var(--accent)] transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
            aria-label="Add to cart"
          >
            <ShoppingBag className="w-4 h-4" />
          </button>
        </div>
      </div>
    </article>
  );
}
