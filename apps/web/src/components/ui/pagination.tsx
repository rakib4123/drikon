import Link from 'next/link';
import { ChevronLeft, ChevronRight } from 'lucide-react';

/**
 * Pages to show: always the first and last, a window around the current page,
 * and `null` for each gap. e.g. page 7 of 20 → 1 … 6 7 8 … 20.
 */
export function pageWindow(current: number, total: number): (number | null)[] {
  const pages = new Set([1, total, current - 1, current, current + 1]);
  const sorted = [...pages].filter((p) => p >= 1 && p <= total).sort((a, b) => a - b);
  const out: (number | null)[] = [];
  sorted.forEach((p, i) => {
    if (i > 0 && p - sorted[i - 1] > 1) out.push(null);
    out.push(p);
  });
  return out;
}

/** Numbered pagination that keeps every other query param (filters, sort, search). */
export function Pagination({
  page,
  totalPages,
  params,
  basePath,
  labels,
}: {
  page: number;
  totalPages: number;
  params: Record<string, string | string[] | undefined>;
  basePath: string;
  labels: { previous: string; next: string; page: (n: number) => string };
}) {
  if (totalPages <= 1) return null;

  const href = (n: number) => {
    const next = new URLSearchParams();
    for (const [k, v] of Object.entries(params)) if (typeof v === 'string' && v) next.set(k, v);
    if (n === 1) next.delete('page');
    else next.set('page', String(n));
    const qs = next.toString();
    return qs ? `${basePath}?${qs}` : basePath;
  };

  const cell = 'min-w-[45px] h-[45px] px-2 grid place-items-center rounded-[var(--radius-ctl)] text-sm font-semibold transition-colors';

  return (
    <nav aria-label="Pagination" className="flex items-center justify-center gap-1.5 flex-wrap">
      {page > 1 ? (
        <Link href={href(page - 1)} aria-label={labels.previous} className={`${cell} border border-[color:var(--border)] hover:border-[color:var(--accent)] hover:text-[color:var(--accent)]`}>
          <ChevronLeft aria-hidden className="w-4 h-4" />
        </Link>
      ) : null}
      {pageWindow(page, totalPages).map((n, i) =>
        n === null ? (
          <span key={`gap-${i}`} aria-hidden className="px-1 text-[color:var(--fg-muted)]">…</span>
        ) : n === page ? (
          <span key={n} aria-current="page" className={`${cell} bg-[color:var(--accent)] text-[color:var(--accent-fg)]`}>
            {n}
          </span>
        ) : (
          <Link key={n} href={href(n)} aria-label={labels.page(n)} className={`${cell} border border-[color:var(--border)] hover:border-[color:var(--accent)] hover:text-[color:var(--accent)]`}>
            {n}
          </Link>
        ),
      )}
      {page < totalPages ? (
        <Link href={href(page + 1)} aria-label={labels.next} className={`${cell} border border-[color:var(--border)] hover:border-[color:var(--accent)] hover:text-[color:var(--accent)]`}>
          <ChevronRight aria-hidden className="w-4 h-4" />
        </Link>
      ) : null}
    </nav>
  );
}
