'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { ArrowRight } from 'lucide-react';
import type { ProductSummary } from '@drikon/shared-types';
import { apiGet } from '@/lib/api-client';
import { useAuthStore } from '@/store/auth-store';
import { ProductGrid } from './product-grid';

export function RecommendedForYou() {
  const { user, initialized, fetchMe } = useAuthStore();
  const [products, setProducts] = useState<ProductSummary[]>([]);

  useEffect(() => {
    if (!initialized) fetchMe();
  }, [initialized, fetchMe]);

  useEffect(() => {
    if (!user) return;
    let cancelled = false;
    (async () => {
      try {
        const data = await apiGet<ProductSummary[]>('/api/v1/recommendations/me');
        if (!cancelled) setProducts(data);
      } catch {
        if (!cancelled) setProducts([]);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [user]);

  if (!user || products.length === 0) return null;

  return (
    <section className="max-w-7xl mx-auto px-6 py-20">
      <div className="flex items-end justify-between mb-10 gap-6">
        <div>
          <div className="text-xs font-mono uppercase tracking-[0.2em] text-[color:var(--accent)] mb-2">
            For you
          </div>
          <h2 className="display text-3xl md:text-4xl">Recommended for you</h2>
        </div>
        <Link href="/products" className="text-sm font-medium hover:text-[color:var(--accent)] transition-colors inline-flex items-center gap-1">
          Shop all <ArrowRight className="w-4 h-4" />
        </Link>
      </div>
      <ProductGrid products={products} />
    </section>
  );
}
