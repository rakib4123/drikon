'use client';

import { useEffect, useMemo, useState } from 'react';
import type { ProductSummary } from '@drikon/shared-types';
import { apiPost } from '@/lib/api-client';
import { useCartStore } from '@/store/cart-store';
import { useTranslations } from 'next-intl';
import { ProductCarousel } from './product-carousel';
import { SectionHeader } from '@/components/home/section-header';

export function CartRecommendations() {
  const tc = useTranslations('cart');
  const items = useCartStore((s) => s.items);
  const [recommendations, setRecommendations] = useState<ProductSummary[]>([]);
  const productIds = useMemo(() => items.map((i) => i.productId), [items]);
  const key = useMemo(() => productIds.slice().sort().join(','), [productIds]);

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
    <section className="mt-10" aria-labelledby="cart-recommendations">
      <SectionHeader id="cart-recommendations" title={tc('addTheseToo')} />
      <ProductCarousel products={recommendations} label={tc('addTheseToo')} />
    </section>
  );
}
