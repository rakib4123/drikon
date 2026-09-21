'use client';

import { useCallback, useEffect, useState } from 'react';
import { Loader2, ScrollText } from 'lucide-react';
import { toast } from 'sonner';
import { apiGet } from '@/lib/api-client';
import type { Pagination } from '@drikon/shared-types';

interface AuditLog {
  id: string;
  action: string;
  targetType: string | null;
  targetId: string | null;
  metadata: Record<string, unknown> | null;
  ipAddress: string | null;
  createdAt: string;
  admin: { id: string; name: string; email: string };
}

const dateFmt = new Intl.DateTimeFormat('en-US', {
  month: 'short', day: 'numeric', year: 'numeric', hour: 'numeric', minute: '2-digit',
});

/** Every action the API tags with @Audit, grouped for the filter dropdown. */
const ACTIONS = [
  'order.status',
  'order.payment_verify',
  'user.role_change',
  'product.create',
  'product.update',
  'product.delete',
  'category.create',
  'category.update',
  'category.delete',
  'brand.create',
  'brand.update',
  'brand.delete',
  'coupon.create',
  'coupon.update',
  'coupon.delete',
  'banner.create',
  'banner.update',
  'banner.delete',
  'flashsale.create',
  'flashsale.update',
  'flashsale.delete',
  'review.update',
  'settings.update',
];

/** Destructive or privilege-affecting actions get visual weight in the list. */
const HIGH_RISK = new Set(['user.role_change', 'order.payment_verify', 'settings.update']);

export default function AdminAuditLogPage() {
  const [items, setItems] = useState<AuditLog[]>([]);
  const [pagination, setPagination] = useState<Pagination | null>(null);
  const [page, setPage] = useState(1);
  const [action, setAction] = useState('');
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const qs = new URLSearchParams({ page: String(page), limit: '50' });
      if (action) qs.set('action', action);
      const data = await apiGet<{ items: AuditLog[]; pagination: Pagination }>(
        `/api/v1/admin/audit-logs?${qs.toString()}`,
      );
      setItems(data.items);
      setPagination(data.pagination);
    } catch {
      toast.error('Failed to load the audit log');
    } finally {
      setLoading(false);
    }
  }, [page, action]);

  useEffect(() => {
    load();
  }, [load]);

  return (
    <div className="px-4 sm:px-8 py-8 sm:py-12 max-w-5xl">
      <h1 className="display text-3xl mb-1">Audit log</h1>
      <p className="text-[color:var(--fg-muted)] mb-8">
        Every change an admin makes to orders, payments, roles, catalogue and settings.
        Records are written automatically and cannot be edited.
      </p>

      <div className="mb-4 flex items-center gap-3">
        <label htmlFor="action-filter" className="text-sm text-[color:var(--fg-muted)]">
          Action
        </label>
        <select
          id="action-filter"
          value={action}
          onChange={(e) => {
            setAction(e.target.value);
            setPage(1);
          }}
          className="input !py-1.5 !px-3 text-sm max-w-xs"
        >
          <option value="">All actions</option>
          {ACTIONS.map((a) => (
            <option key={a} value={a}>{a}</option>
          ))}
        </select>
      </div>

      <div className="card !p-0 overflow-hidden">
        {loading ? (
          <div className="py-16 grid place-items-center">
            <Loader2 className="w-5 h-5 animate-spin text-[color:var(--accent)]" />
          </div>
        ) : items.length === 0 ? (
          <div className="py-16 text-center text-sm text-[color:var(--fg-muted)]">
            <ScrollText className="w-6 h-6 mx-auto mb-3 opacity-40" />
            No admin actions recorded yet.
          </div>
        ) : (
          <ul className="divide-y divide-[color:var(--border)]">
            {items.map((log) => (
              <li key={log.id} className="px-5 py-4">
                <div className="flex items-start justify-between gap-4 flex-wrap">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 mb-1 flex-wrap">
                      <code
                        className={`text-xs font-mono px-1.5 py-0.5 rounded ${
                          HIGH_RISK.has(log.action)
                            ? 'bg-amber-500/15 text-amber-700'
                            : 'bg-[color:var(--bg-soft)] text-[color:var(--fg-muted)]'
                        }`}
                      >
                        {log.action}
                      </code>
                      {log.targetType && (
                        <span className="text-xs text-[color:var(--fg-muted)]">
                          {log.targetType}
                          {log.targetId ? ` · ${log.targetId.slice(0, 10)}…` : ''}
                        </span>
                      )}
                    </div>
                    <div className="text-sm">
                      {log.admin.name}{' '}
                      <span className="text-[color:var(--fg-muted)]">({log.admin.email})</span>
                    </div>
                    {log.metadata && Object.keys(log.metadata).length > 0 && (
                      <pre className="mt-2 text-[11px] font-mono text-[color:var(--fg-muted)] bg-[color:var(--bg-soft)] rounded-lg p-2 overflow-x-auto max-w-full">
                        {JSON.stringify(log.metadata, null, 2)}
                      </pre>
                    )}
                  </div>
                  <div className="text-xs text-[color:var(--fg-muted)] text-right shrink-0">
                    <div>{dateFmt.format(new Date(log.createdAt))}</div>
                    {log.ipAddress && <div className="font-mono mt-0.5">{log.ipAddress}</div>}
                  </div>
                </div>
              </li>
            ))}
          </ul>
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
