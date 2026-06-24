'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { Loader2, Star, Eye, EyeOff } from 'lucide-react';
import { toast } from 'sonner';
import { apiGet, apiPatch } from '@/lib/api-client';
import type { Pagination } from '@drikon/shared-types';

interface AdminReview {
  id: string;
  rating: number;
  title: string | null;
  body: string | null;
  isHidden: boolean;
  isVerified: boolean;
  createdAt: string;
  user: { id: string; name: string; email: string };
  product: { id: string; name: string; slug: string };
}

const dateFmt = new Intl.DateTimeFormat('en-US', { month: 'short', day: 'numeric', year: 'numeric' });

export default function AdminReviewsPage() {
  const [items, setItems] = useState<AdminReview[]>([]);
  const [pagination, setPagination] = useState<Pagination | null>(null);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [savingId, setSavingId] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const data = await apiGet<{ items: AdminReview[]; pagination: Pagination }>(
        `/api/v1/reviews/admin/all?page=${page}&limit=20`,
      );
      setItems(data.items);
      setPagination(data.pagination);
    } catch {
      toast.error('Failed to load reviews');
    } finally {
      setLoading(false);
    }
  }, [page]);

  useEffect(() => {
    load();
  }, [load]);

  const toggle = async (r: AdminReview) => {
    setSavingId(r.id);
    const next = !r.isHidden;
    setItems((rs) => rs.map((x) => (x.id === r.id ? { ...x, isHidden: next } : x)));
    try {
      await apiPatch(`/api/v1/reviews/${r.id}/visibility`, { isHidden: next });
      toast.success(next ? 'Review hidden' : 'Review restored');
    } catch {
      setItems((rs) => rs.map((x) => (x.id === r.id ? { ...x, isHidden: !next } : x)));
      toast.error('Could not update review');
    } finally {
      setSavingId(null);
    }
  };

  return (
    <div className="px-8 py-12 max-w-5xl">
      <h1 className="display text-3xl mb-1">Reviews</h1>
      <p className="text-[color:var(--fg-muted)] mb-8">Moderate customer reviews. Hidden reviews drop out of product ratings.</p>

      <div className="card !p-0 overflow-hidden">
        {loading ? (
          <div className="py-16 grid place-items-center"><Loader2 className="w-5 h-5 animate-spin text-[color:var(--accent)]" /></div>
        ) : items.length === 0 ? (
          <div className="py-16 text-center text-sm text-[color:var(--fg-muted)]">No reviews yet.</div>
        ) : (
          <ul className="divide-y divide-[color:var(--border)]">
            {items.map((r) => (
              <li key={r.id} className={`px-5 py-4 ${r.isHidden ? 'opacity-50' : ''}`}>
                <div className="flex items-start gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <div className="inline-flex">
                        {[1, 2, 3, 4, 5].map((n) => (
                          <Star key={n} className={`w-3.5 h-3.5 ${n <= r.rating ? 'fill-[color:var(--accent-2)] text-[color:var(--accent-2)]' : 'text-[color:var(--border)]'}`} />
                        ))}
                      </div>
                      {r.isVerified && <span className="text-[10px] text-emerald-500 font-semibold">Verified</span>}
                      {r.isHidden && <span className="text-[10px] text-red-400 font-semibold">Hidden</span>}
                    </div>
                    {r.title && <div className="font-medium text-sm">{r.title}</div>}
                    {r.body && <p className="text-sm text-[color:var(--fg-muted)] line-clamp-2">{r.body}</p>}
                    <div className="text-xs text-[color:var(--fg-muted)] mt-1.5">
                      {r.user.name} on{' '}
                      <Link href={`/products/${r.product.slug}`} className="text-[color:var(--accent)] hover:underline">
                        {r.product.name}
                      </Link>{' '}· {dateFmt.format(new Date(r.createdAt))}
                    </div>
                  </div>
                  <button
                    onClick={() => toggle(r)}
                    disabled={savingId === r.id}
                    className="btn-ghost !py-1.5 !px-3 text-xs shrink-0"
                  >
                    {r.isHidden ? <><Eye className="w-3.5 h-3.5" /> Show</> : <><EyeOff className="w-3.5 h-3.5" /> Hide</>}
                  </button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>

      {pagination && pagination.totalPages > 1 && (
        <div className="mt-6 flex items-center justify-center gap-3 text-sm">
          <button className="btn-ghost !py-1.5 !px-3 disabled:opacity-40" disabled={!pagination.hasPrev} onClick={() => setPage((p) => p - 1)}>← Prev</button>
          <span className="text-[color:var(--fg-muted)]">Page {pagination.page} of {pagination.totalPages}</span>
          <button className="btn-ghost !py-1.5 !px-3 disabled:opacity-40" disabled={!pagination.hasNext} onClick={() => setPage((p) => p + 1)}>Next →</button>
        </div>
      )}
    </div>
  );
}
