'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { GitCompare, X, ShoppingBag, ArrowRight, Star } from 'lucide-react';
import { toast } from 'sonner';
import type { ProductSummary } from '@drikon/shared-types';
import { apiGet } from '@/lib/api-client';
import { formatPrice } from '@/lib/utils';
import { useCompareStore } from '@/store/compare-store';
import { useCartStore } from '@/store/cart-store';

interface ProductDetail extends ProductSummary {
  description: string;
  sku: string;
  attributes?: Record<string, unknown> | null;
}

const toNum = (v: string | number) => (typeof v === 'string' ? parseFloat(v) : v);

export default function ComparePage() {
  const items = useCompareStore((s) => s.items);
  const remove = useCompareStore((s) => s.remove);
  const clear = useCompareStore((s) => s.clear);
  const add = useCartStore((s) => s.add);

  const [details, setDetails] = useState<Record<string, ProductDetail>>({});
  const [mounted, setMounted] = useState(false);

  useEffect(() => setMounted(true), []);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const missing = items.filter((i) => !details[i.slug]);
      const fetched = await Promise.all(
        missing.map((i) =>
          apiGet<ProductDetail>(`/api/v1/products/slug/${i.slug}`).catch(() => null),
        ),
      );
      if (cancelled) return;
      const next: Record<string, ProductDetail> = {};
      fetched.forEach((d) => {
        if (d) next[d.slug] = d;
      });
      if (Object.keys(next).length) setDetails((prev) => ({ ...prev, ...next }));
    })();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [items]);

  if (!mounted) return null;

  if (items.length === 0) {
    return (
      <div className="max-w-3xl mx-auto px-6 py-24 text-center">
        <div className="w-14 h-14 rounded-2xl bg-[color:var(--bg-soft)] grid place-items-center mx-auto mb-5 text-[color:var(--fg-muted)]">
          <GitCompare className="w-6 h-6" />
        </div>
        <h1 className="display text-3xl mb-2">Nothing to compare yet</h1>
        <p className="text-[color:var(--fg-muted)] mb-6">Tap the compare icon on any product to line them up side by side.</p>
        <Link href="/products" className="btn-primary">Browse the shop <ArrowRight className="w-4 h-4" /></Link>
      </div>
    );
  }

  // Union of attribute keys across all compared products.
  const attrKeys = Array.from(
    new Set(
      items.flatMap((i) => {
        const a = details[i.slug]?.attributes;
        return a ? Object.keys(a) : [];
      }),
    ),
  );

  const Row = ({ label, render }: { label: string; render: (p: ProductSummary) => React.ReactNode }) => (
    <tr className="border-b border-[color:var(--border)]">
      <th className="text-left text-xs font-medium text-[color:var(--fg-muted)] px-4 py-3 align-top sticky left-0 bg-[color:var(--bg)] z-10 w-36">
        {label}
      </th>
      {items.map((p) => (
        <td key={p.id} className="px-4 py-3 align-top text-sm min-w-[200px]">{render(p)}</td>
      ))}
    </tr>
  );

  return (
    <div className="max-w-7xl mx-auto px-6 py-14">
      <div className="flex items-center justify-between mb-8 gap-4 flex-wrap">
        <h1 className="display text-3xl md:text-4xl flex items-center gap-3">
          Compare <span className="text-[color:var(--fg-muted)] text-2xl">({items.length})</span>
        </h1>
        <button onClick={clear} className="btn-ghost text-sm !py-2 !px-4">Clear all</button>
      </div>

      <div className="card !p-0 overflow-x-auto">
        <table className="w-full border-collapse">
          <tbody>
            {/* Header row: image + name + remove + add to cart */}
            <tr className="border-b border-[color:var(--border)]">
              <th className="sticky left-0 bg-[color:var(--bg)] z-10" />
              {items.map((p) => {
                const price = toNum(p.price);
                return (
                  <td key={p.id} className="px-4 py-4 align-top min-w-[200px]">
                    <div className="relative">
                      <button
                        onClick={() => remove(p.id)}
                        aria-label="Remove"
                        className="absolute -top-1 -right-1 z-10 w-6 h-6 rounded-full bg-[color:var(--bg-soft)] border border-[color:var(--border)] grid place-items-center text-[color:var(--fg-muted)] hover:text-red-400"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                      <Link href={`/products/${p.slug}`} className="block relative aspect-[4/5] rounded-xl overflow-hidden bg-[color:var(--bg-soft)] mb-3">
                        {p.images?.[0]?.url && (
                          <Image src={p.images[0].url} alt={p.name} fill sizes="200px" className="object-cover" />
                        )}
                      </Link>
                      <Link href={`/products/${p.slug}`} className="font-medium text-sm line-clamp-2 hover:text-[color:var(--accent)]">
                        {p.name}
                      </Link>
                      <button
                        type="button"
                        disabled={p.stock === 0}
                        onClick={() => {
                          add({ productId: p.id, name: p.name, slug: p.slug, image: p.images?.[0]?.url, unitPrice: price, currency: p.currency });
                          toast.success('Added to cart', { description: p.name });
                        }}
                        className="btn-primary w-full mt-3 !py-2 text-sm disabled:opacity-50"
                      >
                        <ShoppingBag className="w-4 h-4" /> {p.stock === 0 ? 'Sold out' : 'Add'}
                      </button>
                    </div>
                  </td>
                );
              })}
            </tr>

            <Row label="Price" render={(p) => <span className="font-semibold">{formatPrice(toNum(p.price), p.currency)}</span>} />
            <Row label="Rating" render={(p) => p.averageRating > 0 ? (
              <span className="inline-flex items-center gap-1">
                <Star className="w-3.5 h-3.5 fill-[color:var(--accent-2)] text-[color:var(--accent-2)]" />
                {p.averageRating.toFixed(1)} <span className="text-[color:var(--fg-muted)]">({p.reviewCount})</span>
              </span>
            ) : <span className="text-[color:var(--fg-muted)]">—</span>} />
            <Row label="Availability" render={(p) => p.stock > 0
              ? <span className="text-emerald-500">In stock</span>
              : <span className="text-red-400">Out of stock</span>} />
            <Row label="Brand" render={(p) => p.brand?.name ?? <span className="text-[color:var(--fg-muted)]">—</span>} />
            <Row label="Category" render={(p) => p.category.name} />

            {attrKeys.map((key) => (
              <Row
                key={key}
                label={key}
                render={(p) => {
                  const v = details[p.slug]?.attributes?.[key];
                  if (v == null) return <span className="text-[color:var(--fg-muted)]">—</span>;
                  return <span className="capitalize">{Array.isArray(v) ? v.join(', ') : String(v)}</span>;
                }}
              />
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
