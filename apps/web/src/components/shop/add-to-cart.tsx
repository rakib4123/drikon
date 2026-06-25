'use client';

import { useState } from 'react';
import { motion } from 'motion/react';
import { Minus, Plus, ShoppingBag } from 'lucide-react';
import { toast } from 'sonner';
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

export function AddToCart({ product, className }: { product: AddToCartProduct; className?: string }) {
  const add = useCartStore((s) => s.add);
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
    toast.success(`Added ${qty} to cart`, { description: product.name });
  };

  return (
    <div className={`flex flex-col sm:flex-row gap-3 ${className ?? ''}`}>
      {/* Quantity stepper */}
      <div className="inline-flex items-center border border-[color:var(--border)] rounded-xl overflow-hidden shrink-0 self-start">
        <button
          type="button"
          aria-label="Decrease quantity"
          disabled={soldOut || qty <= 1}
          onClick={() => setQty((q) => Math.max(1, q - 1))}
          className="p-3 hover:bg-[color:var(--bg-soft)] transition-colors disabled:opacity-40"
        >
          <Minus className="w-4 h-4" />
        </button>
        <span className="px-4 text-sm font-medium min-w-[3rem] text-center tabular-nums">{qty}</span>
        <button
          type="button"
          aria-label="Increase quantity"
          disabled={soldOut || qty >= max}
          onClick={() => setQty((q) => Math.min(max, q + 1))}
          className="p-3 hover:bg-[color:var(--bg-soft)] transition-colors disabled:opacity-40"
        >
          <Plus className="w-4 h-4" />
        </button>
      </div>

      <motion.button
        type="button"
        disabled={soldOut}
        onClick={handleAdd}
        whileTap={{ scale: 0.97 }}
        className="btn-primary flex-1 disabled:opacity-50 disabled:cursor-not-allowed"
      >
        <ShoppingBag className="w-4 h-4" />
        {soldOut ? 'Out of stock' : 'Add to cart'}
      </motion.button>
    </div>
  );
}
