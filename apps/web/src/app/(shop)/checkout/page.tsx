'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Loader2, Lock, ArrowRight, ShoppingBag } from 'lucide-react';
import { toast } from 'sonner';
import {
  ShippingAddressSchema,
  type ShippingAddressInput,
  type OrderSummary,
} from '@drikon/shared-types';
import { apiPost, ApiError } from '@/lib/api-client';
import { formatPrice } from '@/lib/utils';
import { useCartStore } from '@/store/cart-store';
import { useAuthStore } from '@/store/auth-store';

const FREE_SHIPPING_THRESHOLD = 3000;
const FLAT_SHIPPING_FEE = 60;

export default function CheckoutPage() {
  const router = useRouter();
  const { items, subtotal, clear } = useCartStore();
  const { user, initialized, fetchMe } = useAuthStore();

  useEffect(() => {
    if (!initialized) fetchMe();
  }, [initialized, fetchMe]);

  useEffect(() => {
    if (initialized && !user) router.replace('/login?next=/checkout');
  }, [initialized, user, router]);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<ShippingAddressInput>({
    resolver: zodResolver(ShippingAddressSchema),
    defaultValues: { country: 'BD' },
  });

  const sub = subtotal();
  const currency = items[0]?.currency ?? 'BDT';
  const shipping = sub >= FREE_SHIPPING_THRESHOLD ? 0 : items.length ? FLAT_SHIPPING_FEE : 0;
  const total = sub + shipping;

  const onSubmit = async (address: ShippingAddressInput) => {
    if (items.length === 0) {
      toast.error('Your cart is empty');
      return;
    }
    try {
      const order = await apiPost<OrderSummary>('/api/v1/orders', {
        items: items.map((i) => ({
          productId: i.productId,
          variantId: i.variantId,
          quantity: i.quantity,
        })),
        shippingAddress: address,
      });
      clear();
      toast.success('Order placed!', { description: order.orderNumber });
      router.push(`/orders/${order.orderNumber}?new=1`);
    } catch (err) {
      const message =
        err instanceof ApiError ? err.message : 'Could not place your order. Please try again.';
      toast.error('Checkout failed', { description: message });
    }
  };

  if (!user) {
    return (
      <div className="max-w-7xl mx-auto px-6 py-24 text-center text-[color:var(--fg-muted)]">
        Loading…
      </div>
    );
  }

  if (items.length === 0) {
    return (
      <div className="max-w-3xl mx-auto px-6 py-24 text-center">
        <div className="w-14 h-14 rounded-2xl bg-[color:var(--bg-soft)] grid place-items-center mx-auto mb-5 text-[color:var(--fg-muted)]">
          <ShoppingBag className="w-6 h-6" />
        </div>
        <h1 className="display text-3xl mb-2">Nothing to check out</h1>
        <p className="text-[color:var(--fg-muted)] mb-6">Add something to your cart first.</p>
        <Link href="/products" className="btn-primary">
          Browse the shop <ArrowRight className="w-4 h-4" />
        </Link>
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto px-6 py-14">
      <h1 className="display text-4xl mb-8">Checkout</h1>

      <form onSubmit={handleSubmit(onSubmit)} className="grid lg:grid-cols-[1fr_360px] gap-10">
        {/* ── Shipping form ── */}
        <div className="space-y-4">
          <div className="card space-y-4">
            <div className="font-semibold">Shipping address</div>

            <Field label="Full name" error={errors.fullName?.message}>
              <input className="input" {...register('fullName')} placeholder="Jane Doe" />
            </Field>
            <Field label="Phone" error={errors.phone?.message}>
              <input className="input" {...register('phone')} placeholder="+880 1XXX-XXXXXX" />
            </Field>
            <Field label="Address line 1" error={errors.line1?.message}>
              <input className="input" {...register('line1')} placeholder="House, road, area" />
            </Field>
            <Field label="Address line 2 (optional)" error={errors.line2?.message}>
              <input className="input" {...register('line2')} placeholder="Apartment, landmark" />
            </Field>
            <div className="grid sm:grid-cols-2 gap-4">
              <Field label="City" error={errors.city?.message}>
                <input className="input" {...register('city')} placeholder="Dhaka" />
              </Field>
              <Field label="State / Division (optional)" error={errors.state?.message}>
                <input className="input" {...register('state')} placeholder="Dhaka" />
              </Field>
            </div>
            <div className="grid sm:grid-cols-2 gap-4">
              <Field label="Postal code" error={errors.postalCode?.message}>
                <input className="input" {...register('postalCode')} placeholder="1207" />
              </Field>
              <Field label="Country" error={errors.country?.message}>
                <input className="input" {...register('country')} placeholder="BD" />
              </Field>
            </div>
          </div>
        </div>

        {/* ── Order summary ── */}
        <aside className="card h-fit lg:sticky lg:top-24">
          <div className="font-semibold mb-4">Order summary</div>

          <ul className="space-y-3 mb-4 max-h-64 overflow-y-auto">
            {items.map((item) => (
              <li key={`${item.productId}-${item.variantId ?? ''}`} className="flex gap-3 text-sm">
                <div className="relative w-12 h-14 rounded-lg overflow-hidden bg-[color:var(--bg)] shrink-0">
                  {item.image && (
                    <Image src={item.image} alt={item.name} fill sizes="48px" className="object-cover" />
                  )}
                  <span className="absolute -top-1.5 -right-1.5 w-5 h-5 rounded-full bg-[color:var(--accent)] text-white text-[10px] font-bold grid place-items-center">
                    {item.quantity}
                  </span>
                </div>
                <span className="flex-1 min-w-0 line-clamp-2">{item.name}</span>
                <span className="font-medium shrink-0">
                  {formatPrice(item.unitPrice * item.quantity, item.currency)}
                </span>
              </li>
            ))}
          </ul>

          <div className="h-px bg-[color:var(--border)] my-4" />
          <Row label="Subtotal" value={formatPrice(sub, currency)} />
          <Row
            label="Shipping"
            value={shipping === 0 ? 'Free' : formatPrice(shipping, currency)}
          />
          <div className="h-px bg-[color:var(--border)] my-4" />
          <Row label="Total" value={formatPrice(total, currency)} strong />

          <button type="submit" disabled={isSubmitting} className="btn-primary w-full mt-5">
            {isSubmitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <>Place order <ArrowRight className="w-4 h-4" /></>}
          </button>
          <p className="text-[11px] text-[color:var(--fg-muted)] mt-3 text-center inline-flex items-center gap-1 justify-center w-full">
            <Lock className="w-3 h-3" /> Demo checkout — no payment is taken.
          </p>
        </aside>
      </form>
    </div>
  );
}

function Field({
  label,
  error,
  children,
}: {
  label: string;
  error?: string;
  children: React.ReactNode;
}) {
  return (
    <label className="block">
      <span className="block text-xs font-medium text-[color:var(--fg-muted)] mb-1.5">{label}</span>
      {children}
      {error && <span className="block text-xs text-red-400 mt-1">{error}</span>}
    </label>
  );
}

function Row({ label, value, strong }: { label: string; value: string; strong?: boolean }) {
  return (
    <div className={`flex justify-between ${strong ? 'font-semibold' : 'text-sm mb-2'}`}>
      <span className={strong ? '' : 'text-[color:var(--fg-muted)]'}>{label}</span>
      <span>{value}</span>
    </div>
  );
}
