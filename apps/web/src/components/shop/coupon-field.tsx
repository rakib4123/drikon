'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { Loader2, Tag, X, Truck, Sparkles } from 'lucide-react';
import { toast } from 'sonner';
import { apiGet, apiPost } from '@/lib/api-client';
import { useCartStore } from '@/store/cart-store';

export interface CouponState {
  code: string | null;
  discount: number;
  freeShipping: boolean;
}

interface Validation {
  valid: boolean;
  message: string;
  discount: string | number;
  freeShipping: boolean;
  code?: string;
}

interface Offer {
  code: string;
  description?: string | null;
  isPercentage: boolean;
  value: string | number;
  minOrderAmount?: string | number | null;
  freeShipping: boolean;
  category?: { name: string; slug: string } | null;
}

export interface CartLine {
  productId: string;
  quantity: number;
  unitPrice: number;
}

export function CouponField({
  subtotal,
  items,
  onChange,
}: {
  subtotal: number;
  items: CartLine[];
  onChange: (state: CouponState) => void;
}) {
  const couponCode = useCartStore((s) => s.couponCode);
  const setCoupon = useCartStore((s) => s.setCoupon);

  const [input, setInput] = useState('');
  const [applying, setApplying] = useState(false);
  const [offers, setOffers] = useState<Offer[]>([]);
  const autoTried = useRef(false);

  const itemsKey = items.map((i) => `${i.productId}:${i.quantity}`).join(',');

  // Load advertisable offers once.
  useEffect(() => {
    apiGet<Offer[]>('/api/v1/coupons/offers').then(setOffers).catch(() => {});
  }, []);

  // Keep the parent's totals in sync with the applied code.
  useEffect(() => {
    if (!couponCode) {
      onChange({ code: null, discount: 0, freeShipping: false });
      return;
    }
    let cancelled = false;
    (async () => {
      try {
        const r = await apiPost<Validation>('/api/v1/coupons/validate', { code: couponCode, subtotal, items });
        if (cancelled) return;
        if (r.valid) {
          onChange({ code: couponCode, discount: Number(r.discount), freeShipping: r.freeShipping });
        } else {
          setCoupon(null);
          onChange({ code: null, discount: 0, freeShipping: false });
        }
      } catch {
        if (!cancelled) onChange({ code: null, discount: 0, freeShipping: false });
      }
    })();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [couponCode, subtotal, itemsKey]);

  // Auto-apply the best eligible coupon once, if none is applied.
  useEffect(() => {
    if (autoTried.current || couponCode || subtotal <= 0 || items.length === 0) return;
    autoTried.current = true;
    apiPost<{ code: string; discount: string | number; freeShipping: boolean } | null>(
      '/api/v1/coupons/best',
      { subtotal, items },
    )
      .then((b) => {
        if (b && b.code) {
          setCoupon(b.code);
          toast.success(`Best offer applied: ${b.code}`, { description: 'You can remove it below.' });
        }
      })
      .catch(() => {});
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [couponCode, subtotal, itemsKey]);

  const apply = useCallback(
    async (raw: string) => {
      const code = raw.trim();
      if (!code) return;
      setApplying(true);
      try {
        const r = await apiPost<Validation>('/api/v1/coupons/validate', { code, subtotal, items });
        if (r.valid) {
          setCoupon(r.code ?? code.toUpperCase());
          setInput('');
          toast.success(r.message);
        } else {
          toast.error(r.message);
        }
      } catch {
        toast.error('Could not validate coupon');
      } finally {
        setApplying(false);
      }
    },
    [subtotal, items, setCoupon],
  );

  if (couponCode) {
    return (
      <div className="flex items-center justify-between gap-2 px-3 py-2.5 rounded-xl bg-[color:var(--accent)]/10 border border-[color:var(--accent)]/30 text-sm">
        <span className="inline-flex items-center gap-2 font-medium text-[color:var(--accent)] min-w-0">
          <Tag className="w-4 h-4 shrink-0" />
          <span className="font-mono truncate">{couponCode}</span>
          <span className="text-[color:var(--fg-muted)] font-normal">applied</span>
        </span>
        <button
          type="button"
          onClick={() => setCoupon(null)}
          aria-label="Remove coupon"
          className="text-[color:var(--fg-muted)] hover:text-red-600 shrink-0"
        >
          <X className="w-4 h-4" />
        </button>
      </div>
    );
  }

  return (
    <div>
      <div className="flex gap-2">
        <input
          className="input font-mono uppercase text-sm"
          placeholder="Coupon code"
          value={input}
          onChange={(e) => setInput(e.target.value.toUpperCase())}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              e.preventDefault();
              apply(input);
            }
          }}
        />
        <button
          type="button"
          onClick={() => apply(input)}
          disabled={applying || !input.trim()}
          className="btn-ghost !px-4 shrink-0"
        >
          {applying ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Apply'}
        </button>
      </div>

      {offers.length > 0 && (
        <div className="mt-2.5">
          <div className="text-[11px] uppercase tracking-wider text-[color:var(--fg-muted)] mb-1.5 inline-flex items-center gap-1">
            <Sparkles className="w-3 h-3 text-[color:var(--accent)]" /> Available offers
          </div>
          <div className="flex flex-wrap gap-1.5">
            {offers.slice(0, 4).map((o) => (
              <button
                key={o.code}
                type="button"
                onClick={() => apply(o.code)}
                title={o.description ?? undefined}
                className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg border border-dashed border-[color:var(--accent)]/50 text-xs font-medium hover:bg-[color:var(--accent)]/10 transition-colors"
              >
                {o.freeShipping ? <Truck className="w-3 h-3 text-[color:var(--accent)]" /> : <Tag className="w-3 h-3 text-[color:var(--accent)]" />}
                <span className="font-mono">{o.code}</span>
                <span className="text-[color:var(--fg-muted)]">
                  {o.freeShipping && Number(o.value) === 0
                    ? 'Free shipping'
                    : o.isPercentage
                      ? `${o.value}% off`
                      : `${o.value} off`}
                  {o.category ? ` · ${o.category.name}` : ''}
                </span>
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
