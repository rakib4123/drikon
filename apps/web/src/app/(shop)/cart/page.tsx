'use client';

import { useCallback, useMemo, useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useCartStore } from '@/store/cart-store';
import { formatPrice } from '@/lib/utils';
import { CouponField, type CouponState } from '@/components/shop/coupon-field';
import { Minus, Plus, X, ArrowRight, ShoppingBag, Truck } from 'lucide-react';

const FREE_SHIPPING_THRESHOLD = 3000;
const FLAT_SHIPPING_FEE = 60;

export default function CartPage() {
  const { items, updateQty, remove, subtotal } = useCartStore();
  const [coupon, setCoupon] = useState<CouponState>({ code: null, discount: 0, freeShipping: false });
  const lines = useMemo(
    () => items.map((i) => ({ productId: i.productId, quantity: i.quantity, unitPrice: i.unitPrice })),
    [items],
  );
  const onCoupon = useCallback((s: CouponState) => setCoupon(s), []);

  if (items.length === 0) {
    return (
      <div className="max-w-3xl mx-auto px-6 py-24 text-center">
        <div className="w-14 h-14 rounded-2xl bg-[color:var(--bg-soft)] grid place-items-center mx-auto mb-5 text-[color:var(--fg-muted)]">
          <ShoppingBag className="w-6 h-6" />
        </div>
        <h1 className="display text-3xl mb-2">Your cart is empty</h1>
        <p className="text-[color:var(--fg-muted)] mb-6">When you find something you love, it&apos;ll show up here.</p>
        <Link href="/products" className="btn-primary">Browse the shop <ArrowRight className="w-4 h-4" /></Link>
      </div>
    );
  }

  const sub = subtotal();
  const discount = Math.min(coupon.discount, sub);
  const freeShip = coupon.freeShipping || sub >= FREE_SHIPPING_THRESHOLD;
  const shipping = freeShip ? 0 : FLAT_SHIPPING_FEE;
  const total = Math.max(0, sub + shipping - discount);

  return (
    <div className="max-w-5xl mx-auto px-6 py-14">
      <h1 className="display text-4xl mb-8">Your cart</h1>

      <div className="grid lg:grid-cols-[1fr_360px] gap-10">
        <div className="space-y-3">
          {items.map((item) => (
            <div key={`${item.productId}-${item.variantId ?? ''}`} className="card flex gap-4 !p-3">
              <div className="relative w-20 h-24 rounded-lg overflow-hidden bg-[color:var(--bg)] shrink-0">
                {item.image && (
                  <Image src={item.image} alt={item.name} fill sizes="80px" className="object-cover" />
                )}
              </div>
              <div className="flex-1 min-w-0">
                <Link href={`/products/${item.slug}`} className="font-medium line-clamp-1 hover:text-[color:var(--accent)]">
                  {item.name}
                </Link>
                <div className="text-sm text-[color:var(--fg-muted)] mt-1">
                  {formatPrice(item.unitPrice, item.currency)} each
                </div>
                <div className="flex items-center gap-3 mt-3">
                  <div className="inline-flex items-center gap-1 border border-[color:var(--border)] rounded-lg overflow-hidden">
                    <button type="button" onClick={() => updateQty(item.productId, item.quantity - 1, item.variantId)} aria-label="Decrease" className="p-1.5 hover:bg-[color:var(--bg-soft)]">
                      <Minus className="w-3.5 h-3.5" />
                    </button>
                    <span className="px-3 text-sm font-medium min-w-[2rem] text-center">{item.quantity}</span>
                    <button type="button" onClick={() => updateQty(item.productId, item.quantity + 1, item.variantId)} aria-label="Increase" className="p-1.5 hover:bg-[color:var(--bg-soft)]">
                      <Plus className="w-3.5 h-3.5" />
                    </button>
                  </div>
                  <button type="button" onClick={() => remove(item.productId, item.variantId)} className="text-xs text-[color:var(--fg-muted)] hover:text-red-600 inline-flex items-center gap-1">
                    <X className="w-3 h-3" /> Remove
                  </button>
                </div>
              </div>
              <div className="text-right shrink-0">
                <div className="font-semibold">{formatPrice(item.unitPrice * item.quantity, item.currency)}</div>
              </div>
            </div>
          ))}
        </div>

        <aside className="card h-fit lg:sticky lg:top-24">
          <div className="font-semibold mb-4">Summary</div>

          <CouponField subtotal={sub} items={lines} onChange={onCoupon} />

          <div className="h-px bg-[color:var(--border)] my-4" />
          <div className="flex justify-between text-sm mb-2">
            <span className="text-[color:var(--fg-muted)]">Subtotal</span>
            <span>{formatPrice(sub)}</span>
          </div>
          <div className="flex justify-between text-sm mb-2">
            <span className="text-[color:var(--fg-muted)]">Shipping</span>
            <span className={freeShip ? 'text-emerald-600 inline-flex items-center gap-1' : ''}>
              {freeShip ? (<><Truck className="w-3.5 h-3.5" /> Free</>) : formatPrice(shipping)}
            </span>
          </div>
          {discount > 0 && (
            <div className="flex justify-between text-sm mb-2 text-[color:var(--accent)]">
              <span>Discount {coupon.code ? `(${coupon.code})` : ''}</span>
              <span>− {formatPrice(discount)}</span>
            </div>
          )}
          <div className="h-px bg-[color:var(--border)] my-4" />
          <div className="flex justify-between font-semibold">
            <span>Total</span>
            <span>{formatPrice(total)}</span>
          </div>
          <Link href="/checkout" className="btn-primary w-full mt-5">
            Proceed to checkout <ArrowRight className="w-4 h-4" />
          </Link>
          <p className="text-[11px] text-[color:var(--fg-muted)] mt-3 text-center">
            Coupons carry over to checkout. Pay with bKash or Cash on Delivery.
          </p>
        </aside>
      </div>
    </div>
  );
}
