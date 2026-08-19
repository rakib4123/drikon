'use client';

import { useEffect, useState } from 'react';
import type { ProductSummary } from '@drikon/shared-types';
import { apiPost } from '@/lib/api-client';
import { useCartStore } from '@/store/cart-store';
import { ProductGrid } from './product-grid';

export function CartRecommendations() {
  const productIds = useCartStore((s) => s.items.map((i) => i.productId));
  const [recommendations, setRecommendations] = useState<ProductSummary[]>([]);
  const key = productIds.slice().sort().join(',');

  useEffect(() => {
    if (productIds.length === 0) {
      setRecommendations([]);
      return;
    }
    let cancelled = false;
    const t = setTimeout(async () => {
      try {
        const data = await apiPost<ProductSummary[]>('/api/v1/recommendations/cart', { productIds });
        if (!cancelled) setRecommendations(data);
      } catch {
        if (!cancelled) setRecommendations([]);
      }
    }, 300);
    return () => {
      cancelled = true;
      clearTimeout(t);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);

  if (recommendations.length === 0) return null;

  return (
    <section className="mt-14">
      <h2 className="display text-2xl mb-6">Add these too</h2>
      <ProductGrid products={recommendations} className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4" />
    </section>
  );
}
