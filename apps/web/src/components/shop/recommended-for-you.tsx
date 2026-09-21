'use client';

import { useEffect, useState } from 'react';
import { useTranslations } from 'next-intl';
import type { ProductSummary } from '@drikon/shared-types';
import { apiGet } from '@/lib/api-client';
import { useAuthStore } from '@/store/auth-store';
import { ProductCarousel } from './product-carousel';
import { SectionHeader } from '@/components/home/section-header';

export function RecommendedForYou() {
  const t = useTranslations('home');
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
    <section className="shell py-8" aria-labelledby="recommended-for-you">
      <SectionHeader id="recommended-for-you" title={t('recommendedForYou')} href="/products" linkLabel={t('viewAll')} />
      <ProductCarousel products={products} label={t('recommendedForYou')} />
    </section>
  );
}
