'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Heart, ArrowRight } from 'lucide-react';
import type { WishlistEntry } from '@drikon/shared-types';
import { apiGet } from '@/lib/api-client';
import { ProductGrid } from '@/components/shop/product-grid';
import { useAuthStore } from '@/store/auth-store';
import { useWishlistStore } from '@/store/wishlist-store';

export default function WishlistPage() {
  const router = useRouter();
  const { user, initialized, fetchMe } = useAuthStore();
  const ids = useWishlistStore((s) => s.ids);
  const fetchIds = useWishlistStore((s) => s.fetch);

  const [entries, setEntries] = useState<WishlistEntry[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!initialized) fetchMe();
  }, [initialized, fetchMe]);

  useEffect(() => {
    if (initialized && !user) router.replace('/login?next=/wishlist');
  }, [initialized, user, router]);

  useEffect(() => {
    if (!user) return;
    let cancelled = false;
    (async () => {
      try {
        const data = await apiGet<WishlistEntry[]>('/api/v1/wishlist');
        if (!cancelled) setEntries(data);
        await fetchIds();
      } catch {
        // leave empty
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [user, fetchIds]);

  if (!user) {
    return (
      <div className="max-w-7xl mx-auto px-6 py-24 text-center text-[color:var(--fg-muted)]">
        Loading…
      </div>
    );
  }

  // Only show items still in the wishlist (reactive to heart toggles).
  const visible = entries.filter((e) => ids.includes(e.productId));

  return (
    <div className="max-w-7xl mx-auto px-6 py-14">
      <div className="text-xs font-mono uppercase tracking-[0.2em] text-[color:var(--accent)] mb-2">
        Your account
      </div>
      <h1 className="display text-4xl md:text-5xl mb-2 flex items-center gap-3">
        Wishlist
        <Heart className="w-7 h-7 fill-rose-500 text-rose-500" />
      </h1>
      <p className="text-[color:var(--fg-muted)] mb-10">
        {visible.length > 0
          ? `${visible.length} item${visible.length === 1 ? '' : 's'} saved.`
          : 'Tap the heart on any product to save it here.'}
      </p>

      {loading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="card !p-0 aspect-[3/4] animate-pulse bg-[color:var(--bg-soft)]" />
          ))}
        </div>
      ) : visible.length === 0 ? (
        <div className="card text-center py-20">
          <div className="w-14 h-14 rounded-2xl bg-[color:var(--bg)] grid place-items-center mx-auto mb-5 text-[color:var(--fg-muted)]">
            <Heart className="w-6 h-6" />
          </div>
          <h2 className="display text-2xl mb-2">Nothing saved yet</h2>
          <p className="text-[color:var(--fg-muted)] mb-6">
            Browse the shop and tap the heart to build your wishlist.
          </p>
          <Link href="/products" className="btn-primary">
            Browse the shop <ArrowRight className="w-4 h-4" />
          </Link>
        </div>
      ) : (
        <ProductGrid
          products={visible.map((e) => e.product)}
          className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 sm:gap-6"
        />
      )}
    </div>
  );
}
