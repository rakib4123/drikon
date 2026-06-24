'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import {
  DollarSign,
  ShoppingCart,
  Users,
  Package,
  Clock,
  TrendingUp,
  ArrowRight,
} from 'lucide-react';
import { apiGet } from '@/lib/api-client';
import { formatPrice } from '@/lib/utils';
import { useAuthStore } from '@/store/auth-store';
import { useBrand } from '@/components/layout/settings-context';
import { OrderStatusBadge } from '@/components/shop/order-status-badge';
import type { OrderStatus } from '@drikon/shared-types';

interface AdminStats {
  totals: {
    revenue: string | number;
    orders: number;
    customers: number;
    products: number;
    reviews: number;
    pendingOrders: number;
  };
  ordersByStatus: Record<string, number>;
  recentOrders: {
    id: string;
    orderNumber: string;
    status: OrderStatus;
    total: string | number;
    currency: string;
    createdAt: string;
    user: { name: string; email: string };
  }[];
  topProducts: {
    id: string;
    name: string;
    slug: string;
    salesCount: number;
    price: string | number;
    currency: string;
    image: string | null;
  }[];
}

const dateFmt = new Intl.DateTimeFormat('en-US', { month: 'short', day: 'numeric' });

export default function AdminHomePage() {
  const { user } = useAuthStore();
  const { siteName } = useBrand();
  const [stats, setStats] = useState<AdminStats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    apiGet<AdminStats>('/api/v1/admin/stats')
      .then(setStats)
      .catch(() => setStats(null))
      .finally(() => setLoading(false));
  }, []);

  const t = stats?.totals;

  return (
    <div className="px-8 py-12 max-w-6xl">
      <div className="text-xs font-mono uppercase tracking-[0.2em] text-[color:var(--accent)] mb-2">
        Welcome back
      </div>
      <h1 className="display text-4xl mb-1">Hi, {user?.name?.split(' ')[0] ?? 'there'} 👋</h1>
      <p className="text-[color:var(--fg-muted)] mb-10">Here&apos;s what&apos;s happening with {siteName}.</p>

      {/* Stat cards */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-4 mb-10">
        <StatCard icon={<DollarSign className="w-4 h-4" />} label="Revenue"
          value={loading ? '—' : formatPrice(t?.revenue ?? 0)} highlight />
        <StatCard icon={<ShoppingCart className="w-4 h-4" />} label="Orders" value={loading ? '—' : t?.orders ?? 0} />
        <StatCard icon={<Users className="w-4 h-4" />} label="Customers" value={loading ? '—' : t?.customers ?? 0} />
        <StatCard icon={<Package className="w-4 h-4" />} label="Products" value={loading ? '—' : t?.products ?? 0} />
        <StatCard icon={<Clock className="w-4 h-4" />} label="Pending" value={loading ? '—' : t?.pendingOrders ?? 0}
          warn={(t?.pendingOrders ?? 0) > 0} />
      </div>

      <div className="grid lg:grid-cols-[1.4fr_1fr] gap-6">
        {/* Recent orders */}
        <div className="card !p-0 overflow-hidden">
          <div className="flex items-center justify-between px-5 py-4 border-b border-[color:var(--border)]">
            <h3 className="font-semibold">Recent orders</h3>
            <Link href="/admin/orders" className="text-xs text-[color:var(--accent)] inline-flex items-center gap-1 hover:underline">
              View all <ArrowRight className="w-3 h-3" />
            </Link>
          </div>
          {!stats || stats.recentOrders.length === 0 ? (
            <div className="px-5 py-10 text-center text-sm text-[color:var(--fg-muted)]">No orders yet.</div>
          ) : (
            <table className="w-full text-sm">
              <tbody>
                {stats.recentOrders.map((o) => (
                  <tr key={o.id} className="border-b border-[color:var(--border)] last:border-0">
                    <td className="px-5 py-3">
                      <Link href="/admin/orders" className="font-mono font-medium hover:text-[color:var(--accent)]">
                        {o.orderNumber}
                      </Link>
                      <div className="text-xs text-[color:var(--fg-muted)]">{o.user.name}</div>
                    </td>
                    <td className="px-2 py-3"><OrderStatusBadge status={o.status} /></td>
                    <td className="px-5 py-3 text-right">
                      <div className="font-semibold">{formatPrice(o.total, o.currency)}</div>
                      <div className="text-xs text-[color:var(--fg-muted)]">{dateFmt.format(new Date(o.createdAt))}</div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        {/* Top products */}
        <div className="card !p-0 overflow-hidden">
          <div className="flex items-center gap-2 px-5 py-4 border-b border-[color:var(--border)]">
            <TrendingUp className="w-4 h-4 text-[color:var(--accent)]" />
            <h3 className="font-semibold">Top sellers</h3>
          </div>
          {!stats || stats.topProducts.length === 0 ? (
            <div className="px-5 py-10 text-center text-sm text-[color:var(--fg-muted)]">No sales yet.</div>
          ) : (
            <ul className="divide-y divide-[color:var(--border)]">
              {stats.topProducts.map((p, i) => (
                <li key={p.id} className="flex items-center gap-3 px-5 py-3">
                  <span className="text-xs font-mono text-[color:var(--fg-muted)] w-4">{i + 1}</span>
                  <Link href={`/products/${p.slug}`} className="flex-1 min-w-0 text-sm font-medium line-clamp-1 hover:text-[color:var(--accent)]">
                    {p.name}
                  </Link>
                  <span className="text-xs text-[color:var(--fg-muted)] shrink-0">{p.salesCount} sold</span>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
}

function StatCard({
  icon,
  label,
  value,
  highlight,
  warn,
}: {
  icon: React.ReactNode;
  label: string;
  value: string | number;
  highlight?: boolean;
  warn?: boolean;
}) {
  return (
    <div className="card !p-4">
      <div
        className={`w-8 h-8 rounded-lg grid place-items-center mb-3 ${
          warn
            ? 'bg-amber-500/15 text-amber-600'
            : highlight
              ? 'bg-[color:var(--accent)]/15 text-[color:var(--accent)]'
              : 'bg-[color:var(--bg)] text-[color:var(--fg-muted)] border border-[color:var(--border)]'
        }`}
      >
        {icon}
      </div>
      <div className="text-[11px] text-[color:var(--fg-muted)] mb-0.5">{label}</div>
      <div className="display text-2xl">{value}</div>
    </div>
  );
}
