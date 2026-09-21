'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useTranslations } from 'next-intl';
import { Package, Heart, ShoppingCart, ShieldCheck, ArrowRight, ChevronRight } from 'lucide-react';
import { useAuthStore } from '@/store/auth-store';
import { useWishlistStore } from '@/store/wishlist-store';
import { useCartStore } from '@/store/cart-store';
import { apiGet } from '@/lib/api-client';
import { formatPrice } from '@/lib/utils';
import { OrderStatusBadge } from '@/components/shop/order-status-badge';
import type { OrderStatus } from '@drikon/shared-types';

interface RecentOrder {
  id: string;
  orderNumber: string;
  status: OrderStatus;
  total: string | number;
  currency: string;
  createdAt: string;
  items: { id: string }[];
}

/** Account overview: counts, recent orders, and a nudge to enable 2FA. The layout owns the auth guard. */
export default function DashboardPage() {
  const t = useTranslations('account');
  const user = useAuthStore((s) => s.user);
  const wishlistCount = useWishlistStore((s) => s.ids.length);
  const cartCount = useCartStore((s) => s.items.reduce((n, i) => n + i.quantity, 0));
  const [orders, setOrders] = useState<RecentOrder[] | null>(null);
  const [orderTotal, setOrderTotal] = useState(0);

  useEffect(() => {
    apiGet<{ items: RecentOrder[]; pagination: { total: number } }>('/api/v1/orders?limit=5')
      .then((d) => {
        setOrders(d.items);
        setOrderTotal(d.pagination.total);
      })
      .catch(() => setOrders([]));
  }, []);

  if (!user) return null;
  const dateFmt = new Intl.DateTimeFormat(undefined, { dateStyle: 'medium' });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl md:text-3xl font-extrabold tracking-tight">{t('hello', { name: user.name.split(' ')[0] })}</h1>
        <p className="text-[color:var(--fg-muted)] mt-1">{t('dashboardIntro')}</p>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <StatTile href="/orders" icon={<Package className="w-5 h-5" />} label={t('orders')} value={orders ? orderTotal : '—'} />
        <StatTile href="/wishlist" icon={<Heart className="w-5 h-5" />} label={t('wishlist')} value={wishlistCount} />
        <StatTile href="/cart" icon={<ShoppingCart className="w-5 h-5" />} label={t('cartItems')} value={cartCount} />
      </div>

      {!user.twoFactorEnabled && (
        <Link
          href="/security"
          className="flex items-center gap-4 rounded-[var(--radius-card)] border border-[color:var(--accent)]/30 bg-[color:var(--accent)]/5 p-4 hover:bg-[color:var(--accent)]/10 transition-colors"
        >
          <span className="w-10 h-10 rounded-full bg-[color:var(--accent)] text-[color:var(--accent-fg)] grid place-items-center shrink-0">
            <ShieldCheck aria-hidden className="w-5 h-5" />
          </span>
          <span className="flex-1 min-w-0">
            <span className="block font-bold">{t('secureTitle')}</span>
            <span className="block text-sm text-[color:var(--fg-muted)]">{t('secureBody')}</span>
          </span>
          <ChevronRight aria-hidden className="w-5 h-5 text-[color:var(--accent)] shrink-0" />
        </Link>
      )}

      <section className="card !p-0 overflow-hidden" aria-labelledby="recent-orders">
        <div className="flex items-center justify-between px-5 py-4 border-b border-[color:var(--border)]">
          <h2 id="recent-orders" className="font-extrabold">{t('recentOrders')}</h2>
          {orderTotal > 0 && (
            <Link href="/orders" className="text-sm font-bold text-[color:var(--accent)] hover:underline underline-offset-4 inline-flex items-center gap-1">
              {t('viewAll')} <ArrowRight aria-hidden className="w-4 h-4" />
            </Link>
          )}
        </div>
        {orders === null ? (
          <div className="p-5 space-y-3">
            <div className="skeleton h-10" />
            <div className="skeleton h-10" />
          </div>
        ) : orders.length === 0 ? (
          <div className="p-8 text-center">
            <p className="text-[color:var(--fg-muted)] mb-4">{t('noOrders')}</p>
            <Link href="/products" className="btn-primary">{t('startShopping')}</Link>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="table-clean">
              <thead>
                <tr>
                  <th>{t('order')}</th>
                  <th>{t('date')}</th>
                  <th>{t('status')}</th>
                  <th className="text-right">{t('total')}</th>
                </tr>
              </thead>
              <tbody>
                {orders.map((o) => (
                  <tr key={o.id}>
                    <td>
                      <Link href={`/orders/${o.orderNumber}`} className="font-mono font-bold text-[color:var(--accent)] hover:underline underline-offset-4">
                        {o.orderNumber}
                      </Link>
                    </td>
                    <td className="text-[color:var(--fg-muted)] whitespace-nowrap">{dateFmt.format(new Date(o.createdAt))}</td>
                    <td><OrderStatusBadge status={o.status} /></td>
                    <td className="text-right font-bold whitespace-nowrap">{formatPrice(Number(o.total), o.currency)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}

function StatTile({ href, icon, label, value }: { href: string; icon: React.ReactNode; label: string; value: number | string }) {
  return (
    <Link href={href} className="card card-hover flex items-center gap-4 !p-5">
      <span className="w-12 h-12 rounded-full bg-[color:var(--accent)]/10 text-[color:var(--accent)] grid place-items-center shrink-0">{icon}</span>
      <span>
        <span className="block text-2xl font-extrabold tabular-nums">{value}</span>
        <span className="block text-sm text-[color:var(--fg-muted)]">{label}</span>
      </span>
    </Link>
  );
}
