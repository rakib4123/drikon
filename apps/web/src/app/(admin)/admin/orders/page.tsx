'use client';

import { useCallback, useEffect, useState } from 'react';
import { Loader2, Search } from 'lucide-react';
import { toast } from 'sonner';
import { apiGet, apiPatch } from '@/lib/api-client';
import { formatPrice } from '@/lib/utils';
import { OrderStatusBadge } from '@/components/shop/order-status-badge';
import type { OrderStatus, PaymentMethod, PaymentStatus, Pagination } from '@drikon/shared-types';

const STATUSES: OrderStatus[] = [
  'PENDING',
  'PAID',
  'PROCESSING',
  'SHIPPED',
  'DELIVERED',
  'CANCELLED',
  'REFUNDED',
];

interface AdminOrder {
  id: string;
  orderNumber: string;
  status: OrderStatus;
  total: string | number;
  currency: string;
  createdAt: string;
  items: { id: string; quantity: number }[];
  user: { id: string; name: string; email: string };
  payment?: {
    method: PaymentMethod;
    status: PaymentStatus;
    providerPaymentId?: string | null;
    payerReference?: string | null;
  } | null;
}

const dateFmt = new Intl.DateTimeFormat('en-US', { month: 'short', day: 'numeric', year: 'numeric' });

export default function AdminOrdersPage() {
  const [orders, setOrders] = useState<AdminOrder[]>([]);
  const [pagination, setPagination] = useState<Pagination | null>(null);
  const [loading, setLoading] = useState(true);
  const [status, setStatus] = useState<OrderStatus | ''>('');
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [savingId, setSavingId] = useState<string | null>(null);
  const [verifyingId, setVerifyingId] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    const qs = new URLSearchParams({ page: String(page), limit: '20' });
    if (status) qs.set('status', status);
    if (search.trim()) qs.set('search', search.trim());
    try {
      const data = await apiGet<{ items: AdminOrder[]; pagination: Pagination }>(
        `/api/v1/admin/orders?${qs.toString()}`,
      );
      setOrders(data.items);
      setPagination(data.pagination);
    } catch {
      toast.error('Failed to load orders');
    } finally {
      setLoading(false);
    }
  }, [page, status, search]);

  useEffect(() => {
    // Debounce so typing in search doesn't fire a request per keystroke.
    const t = setTimeout(load, 350);
    return () => clearTimeout(t);
  }, [load]);

  const changeStatus = async (id: string, next: OrderStatus) => {
    setSavingId(id);
    const prev = orders;
    setOrders((os) => os.map((o) => (o.id === id ? { ...o, status: next } : o)));
    try {
      await apiPatch(`/api/v1/admin/orders/${id}/status`, { status: next });
      toast.success(`Order updated to ${next.toLowerCase()}`);
    } catch {
      setOrders(prev);
      toast.error('Could not update order');
    } finally {
      setSavingId(null);
    }
  };

  const verifyPayment = async (id: string, status: 'SUCCEEDED' | 'FAILED') => {
    setVerifyingId(id);
    try {
      await apiPatch(`/api/v1/admin/orders/${id}/payment`, { status });
      toast.success(status === 'SUCCEEDED' ? 'Payment marked paid' : 'Payment marked failed');
      load();
    } catch {
      toast.error('Could not update payment');
    } finally {
      setVerifyingId(null);
    }
  };

  return (
    <div className="px-4 sm:px-8 py-8 sm:py-12 max-w-6xl">
      <h1 className="display text-3xl mb-1">Orders</h1>
      <p className="text-[color:var(--fg-muted)] mb-8">Track and update every order placed in the store.</p>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-3 mb-6">
        <div className="relative flex-1 min-w-[220px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[color:var(--fg-muted)]" />
          <input
            className="input pl-9"
            placeholder="Search by order # or customer…"
            value={search}
            onChange={(e) => {
              setPage(1);
              setSearch(e.target.value);
            }}
          />
        </div>
        <select
          className="input w-auto"
          value={status}
          onChange={(e) => {
            setPage(1);
            setStatus(e.target.value as OrderStatus | '');
          }}
        >
          <option value="">All statuses</option>
          {STATUSES.map((s) => (
            <option key={s} value={s}>
              {s.charAt(0) + s.slice(1).toLowerCase()}
            </option>
          ))}
        </select>
      </div>

      <div className="card !p-0 overflow-hidden">
        {loading ? (
          <div className="py-16 grid place-items-center">
            <Loader2 className="w-5 h-5 animate-spin text-[color:var(--accent)]" />
          </div>
        ) : orders.length === 0 ? (
          <div className="py-16 text-center text-sm text-[color:var(--fg-muted)]">No orders match.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-xs text-[color:var(--fg-muted)] border-b border-[color:var(--border)]">
                  <th className="px-5 py-3 font-medium">Order</th>
                  <th className="px-3 py-3 font-medium">Customer</th>
                  <th className="px-3 py-3 font-medium">Items</th>
                  <th className="px-3 py-3 font-medium">Total</th>
                  <th className="px-3 py-3 font-medium">Status</th>
                  <th className="px-3 py-3 font-medium">Payment</th>
                  <th className="px-5 py-3 font-medium text-right">Change</th>
                </tr>
              </thead>
              <tbody>
                {orders.map((o) => (
                  <tr key={o.id} className="border-b border-[color:var(--border)] last:border-0">
                    <td className="px-5 py-3">
                      <div className="font-mono font-medium">{o.orderNumber}</div>
                      <div className="text-xs text-[color:var(--fg-muted)]">{dateFmt.format(new Date(o.createdAt))}</div>
                    </td>
                    <td className="px-3 py-3">
                      <div className="font-medium">{o.user.name}</div>
                      <div className="text-xs text-[color:var(--fg-muted)]">{o.user.email}</div>
                    </td>
                    <td className="px-3 py-3 text-[color:var(--fg-muted)]">
                      {o.items.reduce((n, it) => n + it.quantity, 0)}
                    </td>
                    <td className="px-3 py-3 font-semibold">{formatPrice(o.total, o.currency)}</td>
                    <td className="px-3 py-3"><OrderStatusBadge status={o.status} /></td>
                    <td className="px-3 py-3">
                      {o.payment ? (
                        <div className="space-y-1">
                          <div className="text-xs font-medium">
                            {o.payment.method === 'BKASH_MANUAL' ? 'bKash' : 'COD'} ·{' '}
                            {o.payment.status.charAt(0) + o.payment.status.slice(1).toLowerCase()}
                          </div>
                          {o.payment.method === 'BKASH_MANUAL' && o.payment.status === 'PENDING' && (
                            <div className="space-y-1">
                              <div className="text-[10px] text-[color:var(--fg-muted)]">
                                {o.payment.payerReference} · TrxID {o.payment.providerPaymentId}
                              </div>
                              <div className="flex gap-1">
                                <button
                                  type="button"
                                  onClick={() => verifyPayment(o.id, 'SUCCEEDED')}
                                  disabled={verifyingId === o.id}
                                  className="btn-ghost !py-1 !px-2 text-[10px] text-emerald-600"
                                >
                                  Mark Paid
                                </button>
                                <button
                                  type="button"
                                  onClick={() => verifyPayment(o.id, 'FAILED')}
                                  disabled={verifyingId === o.id}
                                  className="btn-ghost !py-1 !px-2 text-[10px] text-red-600"
                                >
                                  Mark Failed
                                </button>
                              </div>
                            </div>
                          )}
                        </div>
                      ) : (
                        <span className="text-xs text-[color:var(--fg-muted)]">—</span>
                      )}
                    </td>
                    <td className="px-5 py-3 text-right">
                      <select
                        className="input w-auto inline-block !py-1.5 text-xs"
                        value={o.status}
                        disabled={savingId === o.id}
                        onChange={(e) => changeStatus(o.id, e.target.value as OrderStatus)}
                      >
                        {STATUSES.map((s) => (
                          <option key={s} value={s}>
                            {s.charAt(0) + s.slice(1).toLowerCase()}
                          </option>
                        ))}
                      </select>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {pagination && pagination.totalPages > 1 && (
        <div className="mt-6 flex items-center justify-center gap-3 text-sm">
          <button
            className="btn-ghost !py-1.5 !px-3 disabled:opacity-40"
            disabled={!pagination.hasPrev}
            onClick={() => setPage((p) => p - 1)}
          >
            ← Prev
          </button>
          <span className="text-[color:var(--fg-muted)]">
            Page {pagination.page} of {pagination.totalPages}
          </span>
          <button
            className="btn-ghost !py-1.5 !px-3 disabled:opacity-40"
            disabled={!pagination.hasNext}
            onClick={() => setPage((p) => p + 1)}
          >
            Next →
          </button>
        </div>
      )}
    </div>
  );
}
