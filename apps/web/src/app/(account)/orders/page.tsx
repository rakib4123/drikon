'use client';

import { useTranslations } from 'next-intl';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import Image from '@/components/ui/smart-image';
import { Package, ArrowRight, ChevronRight } from 'lucide-react';
import type { OrderListResponse, OrderSummary } from '@drikon/shared-types';
import { apiGet } from '@/lib/api-client';
import { formatPrice } from '@/lib/utils';
import { useAuthStore } from '@/store/auth-store';
import { OrderStatusBadge } from '@/components/shop/order-status-badge';

const dateFmt = new Intl.DateTimeFormat('en-US', {
  year: 'numeric',
  month: 'short',
  day: 'numeric',
});

export default function OrdersPage() {
  const t = useTranslations('account');
  const router = useRouter();
  const { user, initialized, fetchMe } = useAuthStore();
  const [orders, setOrders] = useState<OrderSummary[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!initialized) fetchMe();
  }, [initialized, fetchMe]);

  useEffect(() => {
    if (initialized && !user) router.replace('/login?next=/orders');
  }, [initialized, user, router]);

  useEffect(() => {
    if (!user) return;
    let cancelled = false;
    (async () => {
      try {
        const data = await apiGet<OrderListResponse>('/api/v1/orders?limit=50');
        if (!cancelled) setOrders(data.items);
      } catch {
        // leave empty
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [user]);

  if (!user) {
    return (
      <div className="py-24 text-center text-[color:var(--fg-muted)]">
        {t('loading')}
      </div>
    );
  }

  return (
    <div>
      <h1 className="text-2xl md:text-3xl font-extrabold tracking-tight mb-6">{t('orders')}</h1>

      {loading ? (
        <div className="space-y-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="skeleton h-24" />
          ))}
        </div>
      ) : orders.length === 0 ? (
        <div className="card text-center py-20">
          <div className="w-14 h-14 rounded-2xl bg-[color:var(--bg)] grid place-items-center mx-auto mb-5 text-[color:var(--fg-muted)]">
            <Package className="w-6 h-6" />
          </div>
          <h2 className="text-xl font-extrabold mb-2">{t('noOrders')}</h2>
          <p className="text-[color:var(--fg-muted)] mb-6">{t('noOrdersBody')}</p>
          <Link href="/products" className="btn-primary">
            {t('startShopping')} <ArrowRight className="w-4 h-4" />
          </Link>
        </div>
      ) : (
        <ul className="space-y-3">
          {orders.map((o) => (
            <li key={o.id}>
              <Link
                href={`/orders/${o.orderNumber}`}
                className="card card-hover flex items-center gap-4 group"
              >
                {/* Item thumbnails */}
                <div className="flex -space-x-3 shrink-0">
                  {o.items.slice(0, 3).map((it) => (
                    <span
                      key={it.id}
                      className="relative w-12 h-14 rounded-lg overflow-hidden bg-[color:var(--bg)] border-2 border-[color:var(--bg-soft)]"
                    >
                      {it.productImage && (
                        <Image src={it.productImage} alt={it.productName} fill sizes="48px" className="object-cover" />
                      )}
                    </span>
                  ))}
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="font-mono text-sm font-semibold">{o.orderNumber}</span>
                    <OrderStatusBadge status={o.status} />
                  </div>
                  <div className="text-xs text-[color:var(--fg-muted)]">
                    {dateFmt.format(new Date(o.createdAt))} ·{' '}
                    {t('itemCount', { count: o.items.reduce((n, it) => n + it.quantity, 0) })}
                  </div>
                </div>

                <div className="text-right shrink-0">
                  <div className="font-semibold">{formatPrice(o.total, o.currency)}</div>
                </div>
                <ChevronRight className="w-4 h-4 text-[color:var(--fg-muted)] group-hover:translate-x-0.5 transition-transform shrink-0" />
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
