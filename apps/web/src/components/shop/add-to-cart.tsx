'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { motion } from 'motion/react';
import { Minus, Plus, ShoppingBag, Zap } from 'lucide-react';
import { toast } from 'sonner';
import { useTranslations } from 'next-intl';
import { useCartStore } from '@/store/cart-store';

export interface AddToCartProduct {
  id: string;
  name: string;
  slug: string;
  image?: string;
  price: number;
  currency: string;
  stock: number;
}

export function AddToCart({
  product,
  className,
  compact,
  showBuyNow = false,
}: {
  product: AddToCartProduct;
  className?: string;
  /** Button-only (no quantity stepper) — for tight spots like sticky headers. */
  compact?: boolean;
  /** Adds a "Buy now" button that adds to cart and goes straight to checkout. */
  showBuyNow?: boolean;
}) {
  const t = useTranslations('product');
  const add = useCartStore((s) => s.add);
  const router = useRouter();
  const [qty, setQty] = useState(1);
  const soldOut = product.stock === 0;
  const max = Math.max(1, product.stock);

  const handleAdd = () => {
    add(
      {
        productId: product.id,
        name: product.name,
        slug: product.slug,
        image: product.image,
        unitPrice: product.price,
        currency: product.currency,
      },
      qty,
    );
    toast.success(t('addedQtyToCart', { qty }), { description: product.name });
  };

  const handleBuyNow = () => {
    add(
      {
        productId: product.id,
        name: product.name,
        slug: product.slug,
        image: product.image,
        unitPrice: product.price,
        currency: product.currency,
      },
      qty,
    );
    router.push('/checkout');
  };

  if (compact) {
    return (
      <motion.button
        type="button"
        disabled={soldOut}
        onClick={handleAdd}
        whileTap={{ scale: 0.97 }}
        className={`btn-primary whitespace-nowrap disabled:opacity-50 disabled:cursor-not-allowed ${className ?? ''}`}
      >
        <ShoppingBag className="w-4 h-4 shrink-0" />
        {soldOut ? t('soldOutButton') : t('addToCart')}
      </motion.button>
    );
  }

  return (
    <div className={`flex flex-wrap gap-3 ${className ?? ''}`}>
      {/* Quantity stepper */}
      <div className="inline-flex items-center border border-[#d0d5dd] rounded-[var(--radius-ctl)] overflow-hidden shrink-0 h-12">
        <button
          type="button"
          aria-label={t('decreaseQuantity')}
          disabled={soldOut || qty <= 1}
          onClick={() => setQty((q) => Math.max(1, q - 1))}
          className="h-full px-3.5 hover:bg-[color:var(--bg-soft)] transition-colors disabled:opacity-40"
        >
          <Minus className="w-4 h-4" />
        </button>
        <span className="px-3 text-base font-bold min-w-[3rem] text-center tabular-nums" aria-live="polite">{qty}</span>
        <button
          type="button"
          aria-label={t('increaseQuantity')}
          disabled={soldOut || qty >= max}
          onClick={() => setQty((q) => Math.min(max, q + 1))}
          className="h-full px-3.5 hover:bg-[color:var(--bg-soft)] transition-colors disabled:opacity-40"
        >
          <Plus className="w-4 h-4" />
        </button>
      </div>

      <motion.button
        type="button"
        disabled={soldOut}
        onClick={handleAdd}
        whileTap={{ scale: 0.97 }}
        className="btn-primary h-12 flex-1 min-w-[10rem] disabled:opacity-50 disabled:cursor-not-allowed"
      >
        <ShoppingBag className="w-4 h-4" />
        {soldOut ? t('outOfStockButton') : t('addToCart')}
      </motion.button>

      {showBuyNow && !soldOut && (
        <motion.button
          type="button"
          onClick={handleBuyNow}
          whileTap={{ scale: 0.97 }}
          className="btn-dark h-12 basis-full"
        >
          <Zap className="w-4 h-4" />
          {t('buyNow')}
        </motion.button>
      )}
    </div>
  );
}
