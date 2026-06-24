'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { motion } from 'motion/react';
import { Star, BadgeCheck, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import type { ReviewListResponse, CreateReviewInput } from '@drikon/shared-types';
import { apiGet, apiPost } from '@/lib/api-client';
import { useAuthStore } from '@/store/auth-store';
import { cn } from '@/lib/utils';

const dateFmt = new Intl.DateTimeFormat('en-US', {
  year: 'numeric',
  month: 'short',
  day: 'numeric',
});

function Stars({ value, className }: { value: number; className?: string }) {
  return (
    <div className={cn('inline-flex', className)} aria-label={`${value} out of 5 stars`}>
      {[1, 2, 3, 4, 5].map((n) => (
        <Star
          key={n}
          className={cn(
            'w-4 h-4',
            n <= Math.round(value)
              ? 'fill-[color:var(--accent-2)] text-[color:var(--accent-2)]'
              : 'text-[color:var(--border)]',
          )}
        />
      ))}
    </div>
  );
}

export function ProductReviews({
  productId,
  productName,
}: {
  productId: string;
  productName: string;
}) {
  const user = useAuthStore((s) => s.user);
  const [data, setData] = useState<ReviewListResponse | null>(null);
  const [loading, setLoading] = useState(true);

  // Form state
  const [rating, setRating] = useState(0);
  const [hover, setHover] = useState(0);
  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const load = async () => {
    try {
      const res = await apiGet<ReviewListResponse>(`/api/v1/reviews/product/${productId}`);
      setData(res);
    } catch {
      setData({ items: [], averageRating: 0, reviewCount: 0, distribution: [0, 0, 0, 0, 0] });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [productId]);

  // If the signed-in user already reviewed, hydrate the form for editing.
  useEffect(() => {
    if (!user || !data) return;
    const mine = data.items.find((r) => r.user.id === user.id);
    if (mine) {
      setRating(mine.rating);
      setTitle(mine.title ?? '');
      setBody(mine.body ?? '');
    }
  }, [user, data]);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (rating < 1) {
      toast.error('Pick a star rating first');
      return;
    }
    setSubmitting(true);
    try {
      const payload: CreateReviewInput = {
        rating,
        title: title.trim() || undefined,
        body: body.trim() || undefined,
      };
      await apiPost(`/api/v1/reviews/product/${productId}`, payload);
      toast.success('Thanks for your review!', { description: productName });
      await load();
    } catch {
      toast.error('Could not submit your review');
    } finally {
      setSubmitting(false);
    }
  };

  const alreadyMine = Boolean(user && data?.items.some((r) => r.user.id === user.id));
  const total = data?.reviewCount ?? 0;

  return (
    <section className="mb-16">
      <h2 className="display text-2xl mb-6">Reviews</h2>

      {loading ? (
        <div className="flex items-center gap-2 text-[color:var(--fg-muted)] text-sm">
          <Loader2 className="w-4 h-4 animate-spin" /> Loading reviews…
        </div>
      ) : (
        <div className="grid lg:grid-cols-[280px_1fr] gap-10">
          {/* ── Summary + form ── */}
          <div className="space-y-8">
            <div className="card">
              <div className="flex items-end gap-3">
                <span className="display text-5xl leading-none">
                  {(data?.averageRating ?? 0).toFixed(1)}
                </span>
                <div className="pb-1">
                  <Stars value={data?.averageRating ?? 0} />
                  <div className="text-xs text-[color:var(--fg-muted)] mt-1">
                    {total} review{total === 1 ? '' : 's'}
                  </div>
                </div>
              </div>

              {/* Distribution bars (5★ → 1★) */}
              <div className="mt-5 space-y-1.5">
                {[5, 4, 3, 2, 1].map((star) => {
                  const count = data?.distribution[star - 1] ?? 0;
                  const pct = total > 0 ? (count / total) * 100 : 0;
                  return (
                    <div key={star} className="flex items-center gap-2 text-xs">
                      <span className="w-3 text-[color:var(--fg-muted)]">{star}</span>
                      <Star className="w-3 h-3 fill-[color:var(--accent-2)] text-[color:var(--accent-2)]" />
                      <div className="flex-1 h-1.5 rounded-full bg-[color:var(--bg)] overflow-hidden">
                        <motion.div
                          className="h-full bg-[color:var(--accent-2)]"
                          initial={{ width: 0 }}
                          animate={{ width: `${pct}%` }}
                          transition={{ duration: 0.5, ease: 'easeOut' }}
                        />
                      </div>
                      <span className="w-5 text-right text-[color:var(--fg-muted)]">{count}</span>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Write / edit a review */}
            {user ? (
              <form onSubmit={submit} className="card space-y-3">
                <div className="font-semibold text-sm">
                  {alreadyMine ? 'Edit your review' : 'Write a review'}
                </div>
                <div
                  className="flex gap-1"
                  onMouseLeave={() => setHover(0)}
                  role="radiogroup"
                  aria-label="Your rating"
                >
                  {[1, 2, 3, 4, 5].map((n) => (
                    <button
                      key={n}
                      type="button"
                      aria-label={`${n} star${n === 1 ? '' : 's'}`}
                      aria-checked={rating === n}
                      role="radio"
                      onMouseEnter={() => setHover(n)}
                      onClick={() => setRating(n)}
                      className="p-0.5"
                    >
                      <Star
                        className={cn(
                          'w-7 h-7 transition-colors',
                          n <= (hover || rating)
                            ? 'fill-[color:var(--accent-2)] text-[color:var(--accent-2)]'
                            : 'text-[color:var(--border)]',
                        )}
                      />
                    </button>
                  ))}
                </div>
                <input
                  className="input"
                  placeholder="Title (optional)"
                  maxLength={120}
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                />
                <textarea
                  className="input"
                  placeholder="Share your thoughts (optional)"
                  rows={3}
                  maxLength={2000}
                  value={body}
                  onChange={(e) => setBody(e.target.value)}
                />
                <button type="submit" disabled={submitting} className="btn-primary w-full">
                  {submitting ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : alreadyMine ? (
                    'Update review'
                  ) : (
                    'Submit review'
                  )}
                </button>
              </form>
            ) : (
              <div className="card text-sm text-[color:var(--fg-muted)]">
                <Link href="/login" className="text-[color:var(--accent)] font-medium hover:underline">
                  Sign in
                </Link>{' '}
                to write a review.
              </div>
            )}
          </div>

          {/* ── Review list ── */}
          <div>
            {total === 0 ? (
              <div className="card text-center py-16 text-[color:var(--fg-muted)]">
                No reviews yet — be the first to share your thoughts.
              </div>
            ) : (
              <ul className="space-y-5">
                {data?.items.map((r) => (
                  <li key={r.id} className="border-b border-[color:var(--border)] pb-5 last:border-0">
                    <div className="flex items-center gap-3 mb-2">
                      <div className="w-9 h-9 rounded-full bg-[color:var(--bg-soft)] border border-[color:var(--border)] grid place-items-center font-semibold text-sm">
                        {r.user.name?.charAt(0)?.toUpperCase() ?? '?'}
                      </div>
                      <div className="min-w-0">
                        <div className="flex items-center gap-1.5 text-sm font-medium">
                          {r.user.name}
                          {r.isVerified && (
                            <span
                              className="inline-flex items-center gap-0.5 text-[10px] font-semibold text-emerald-500"
                              title="Verified purchase"
                            >
                              <BadgeCheck className="w-3.5 h-3.5" /> Verified
                            </span>
                          )}
                        </div>
                        <div className="text-[11px] text-[color:var(--fg-muted)]">
                          {dateFmt.format(new Date(r.createdAt))}
                        </div>
                      </div>
                    </div>
                    <Stars value={r.rating} className="mb-1.5" />
                    {r.title && <div className="font-medium text-sm mb-0.5">{r.title}</div>}
                    {r.body && (
                      <p className="text-sm text-[color:var(--fg-muted)] leading-relaxed">{r.body}</p>
                    )}
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      )}
    </section>
  );
}
