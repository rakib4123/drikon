'use client';

import { useEffect, useMemo, useState } from 'react';
import { apiPost } from '@/lib/api-client';
import { useCartStore } from '@/store/cart-store';

export interface QuoteLine {
  productId: string;
  variantId: string | null;
  name: string;
  nameBn: string | null;
  slug: string;
  image: string | null;
  unitPrice: number;
  listPrice: number;
  onSale: boolean;
  quantity: number;
  lineTotal: number;
  stock: number;
}

export interface QuoteIssue {
  productId: string;
  variantId: string | null;
  reason: 'unavailable' | 'insufficient_stock';
  available: number;
  message: string;
}

export interface CartQuote {
  currency: string;
  lines: QuoteLine[];
  issues: QuoteIssue[];
  subtotal: number;
  shipping: number;
  discount: number;
  total: number;
  freeShippingThreshold: number;
  coupon: { code: string; valid: boolean; message: string; freeShipping: boolean } | null;
}

/**
 * Server-priced totals for the current cart, from the same pricing code that
 * creates the order. Cart and checkout display these rather than adding up
 * browser-cached prices, so the bKash amount a shopper is told to send is the
 * amount the order will be charged.
 *
 * Also writes the quoted unit prices back into the cart store, which keeps the
 * header's cart total honest too.
 */
export function useCartQuote() {
  const items = useCartStore((s) => s.items);
  const couponCode = useCartStore((s) => s.couponCode);
  const syncPrices = useCartStore((s) => s.syncPrices);
  const [quote, setQuote] = useState<CartQuote | null>(null);
  const [loading, setLoading] = useState(true);
  const [failed, setFailed] = useState(false);

  // Re-quote when what's in the cart changes — not when prices sync back, or
  // the write-back would trigger another quote.
  const key = useMemo(
    () => items.map((i) => `${i.productId}:${i.variantId ?? ''}:${i.quantity}`).join('|') + `#${couponCode ?? ''}`,
    [items, couponCode],
  );

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    const timer = setTimeout(async () => {
      try {
        const q = await apiPost<CartQuote>('/api/v1/orders/quote', {
          items: items.map((i) => ({ productId: i.productId, variantId: i.variantId, quantity: i.quantity })),
          couponCode: couponCode ?? undefined,
        });
        if (cancelled) return;
        setQuote(q);
        setFailed(false);
        syncPrices(q.lines);
      } catch {
        if (!cancelled) setFailed(true);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }, 150);
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
    // `key` captures every input that matters; `items` itself changes on sync.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);

  const issueFor = (productId: string, variantId?: string | null) =>
    quote?.issues.find((i) => i.productId === productId && (i.variantId ?? null) === (variantId ?? null));

  return { quote, loading, failed, issueFor };
}
