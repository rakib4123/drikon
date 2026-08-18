'use client';

import { use, useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import { motion } from 'motion/react';
import { CheckCircle2, ArrowLeft, Loader2, Package } from 'lucide-react';
import type { OrderSummary } from '@drikon/shared-types';
import { apiGet, ApiError } from '@/lib/api-client';
import { formatPrice } from '@/lib/utils';
import { useAuthStore } from '@/store/auth-store';
import { OrderStatusBadge } from '@/components/shop/order-status-badge';

interface OrderDetail extends OrderSummary {
  notes?: string | null;
  shippingAddress?: {
    fullName: string;
    phone: string;
    line1: string;
    line2?: string | null;
    city: string;
    state?: string | null;
    postalCode: string;
    country: string;
  } | null;
}

const dateFmt = new Intl.DateTimeFormat('en-US', {
  year: 'numeric',
  month: 'long',
  day: 'numeric',
});

export default function OrderDetailPage({
  params,
}: {
  params: Promise<{ orderNumber: string }>;
}) {
  const { orderNumber } = use(params);
  const router = useRouter();
  const searchParams = useSearchParams();
  const isNew = searchParams.get('new') === '1';

  const { user, initialized, fetchMe } = useAuthStore();
  const [order, setOrder] = useState<OrderDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    if (!initialized) fetchMe();
  }, [initialized, fetchMe]);

  useEffect(() => {
    if (initialized && !user) router.replace(`/login?next=/orders/${orderNumber}`);
  }, [initialized, user, router, orderNumber]);

  useEffect(() => {
    if (!user) return;
    let cancelled = false;
    (async () => {
      try {
        const data = await apiGet<OrderDetail>(`/api/v1/orders/${orderNumber}`);
        if (!cancelled) setOrder(data);
      } catch (err) {
        if (!cancelled && err instanceof ApiError && err.status === 404) setNotFound(true);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [user, orderNumber]);

  if (!user || loading) {
    return (
      <div className="max-w-3xl mx-auto px-6 py-24 text-center text-[color:var(--fg-muted)]">
        <Loader2 className="w-5 h-5 animate-spin mx-auto" />
      </div>
    );
  }

  if (notFound || !order) {
    return (
      <div className="max-w-3xl mx-auto px-6 py-24 text-center">
        <div className="w-14 h-14 rounded-2xl bg-[color:var(--bg-soft)] grid place-items-center mx-auto mb-5 text-[color:var(--fg-muted)]">
          <Package className="w-6 h-6" />
        </div>
        <h1 className="display text-3xl mb-2">Order not found</h1>
        <p className="text-[color:var(--fg-muted)] mb-6">
          We couldn&apos;t find an order with that number on your account.
        </p>
        <Link href="/orders" className="btn-primary">
          Back to orders
        </Link>
      </div>
    );
  }

  const addr = order.shippingAddress;

  return (
    <div className="max-w-3xl mx-auto px-6 py-14">
      <Link
        href="/orders"
        className="text-xs text-[color:var(--fg-muted)] hover:text-[color:var(--fg)] inline-flex items-center gap-1 mb-8"
      >
        <ArrowLeft className="w-3 h-3" /> All orders
      </Link>

      {isNew && (
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
          className="card mb-8 flex items-center gap-4 border-emerald-500/30 bg-emerald-500/5"
        >
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ type: 'spring', stiffness: 260, damping: 18, delay: 0.1 }}
          >
            <CheckCircle2 className="w-10 h-10 text-emerald-600" />
          </motion.div>
          <div>
            <div className="display text-xl">Thank you — your order is in!</div>
            <div className="text-sm text-[color:var(--fg-muted)]">
              A confirmation for {order.orderNumber} is on its way.
            </div>
          </div>
        </motion.div>
      )}

      <div className="flex items-center justify-between flex-wrap gap-3 mb-8">
        <div>
          <h1 className="display text-3xl">{order.orderNumber}</h1>
          <p className="text-sm text-[color:var(--fg-muted)] mt-1">
            Placed {dateFmt.format(new Date(order.createdAt))}
          </p>
        </div>
        <div className="text-right">
          <OrderStatusBadge status={order.status} className="text-xs px-3 py-1.5" />
          {order.payment && (
            <p className="text-xs text-[color:var(--fg-muted)] mt-2">
              {order.payment.method === 'BKASH_MANUAL'
                ? order.payment.status === 'SUCCEEDED'
                  ? 'Payment verified ✓'
                  : order.payment.status === 'FAILED'
                    ? 'Payment verification failed — please contact support.'
                    : "Payment pending verification — we'll update this once confirmed."
                : order.payment.status === 'SUCCEEDED'
                  ? 'Paid on delivery ✓'
                  : `Pay ${formatPrice(order.total, order.currency)} in cash on delivery`}
            </p>
          )}
        </div>
      </div>

      {/* Items */}
      <div className="card mb-6">
        <div className="font-semibold mb-4">Items</div>
        <ul className="space-y-4">
          {order.items.map((it) => (
            <li key={it.id} className="flex gap-4">
              <div className="relative w-16 h-20 rounded-lg overflow-hidden bg-[color:var(--bg)] shrink-0">
                {it.productImage && (
                  <Image src={it.productImage} alt={it.productName} fill sizes="64px" className="object-cover" />
                )}
              </div>
              <div className="flex-1 min-w-0">
                {it.slug ? (
                  <Link href={`/products/${it.slug}`} className="font-medium hover:text-[color:var(--accent)] line-clamp-2">
                    {it.productName}
                  </Link>
                ) : (
                  <span className="font-medium line-clamp-2">{it.productName}</span>
                )}
                <div className="text-sm text-[color:var(--fg-muted)] mt-1">
                  {formatPrice(it.unitPrice, order.currency)} × {it.quantity}
                </div>
              </div>
              <div className="font-semibold shrink-0">{formatPrice(it.lineTotal, order.currency)}</div>
            </li>
          ))}
        </ul>
      </div>

      <div className="grid sm:grid-cols-2 gap-6">
        {/* Totals */}
        <div className="card h-fit">
          <div className="font-semibold mb-4">Summary</div>
          <Row label="Subtotal" value={formatPrice(order.subtotal, order.currency)} />
          <Row
            label="Shipping"
            value={Number(order.shipping) === 0 ? 'Free' : formatPrice(order.shipping, order.currency)}
          />
          {Number(order.discount) > 0 && (
            <Row label="Discount" value={`− ${formatPrice(order.discount, order.currency)}`} />
          )}
          <div className="h-px bg-[color:var(--border)] my-4" />
          <Row label="Total" value={formatPrice(order.total, order.currency)} strong />
        </div>

        {/* Shipping address */}
        {addr && (
          <div className="card h-fit">
            <div className="font-semibold mb-4">Shipping to</div>
            <address className="not-italic text-sm text-[color:var(--fg-muted)] leading-relaxed">
              <div className="text-[color:var(--fg)] font-medium">{addr.fullName}</div>
              <div>{addr.phone}</div>
              <div>{addr.line1}</div>
              {addr.line2 && <div>{addr.line2}</div>}
              <div>
                {addr.city}
                {addr.state ? `, ${addr.state}` : ''} {addr.postalCode}
              </div>
              <div>{addr.country}</div>
            </address>
          </div>
        )}
      </div>
    </div>
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
