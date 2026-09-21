export const dynamic = 'force-dynamic';

import { getTranslations } from 'next-intl/server';
import { FlashSaleSection } from '@/components/shop/flash-sale-section';
import { HeroSlider } from '@/components/shop/hero-slider';
import { BrandStrip } from '@/components/shop/brand-strip';
import { RecommendedForYou } from '@/components/shop/recommended-for-you';
import { CategorySidebar } from '@/components/home/category-sidebar';
import { PromoTiles } from '@/components/home/promo-tiles';
import { HeroStage } from '@/components/home/hero-stage';
import { ServiceStrip } from '@/components/home/service-strip';
import { CategoryGrid } from '@/components/home/category-grid';
import { ProductRow } from '@/components/home/product-row';
import { PromoBanner } from '@/components/home/promo-banner';
import { apiGet } from '@/lib/api-client';
import { getSettings, resolveContent } from '@/lib/settings';
import { getBanners } from '@/lib/banners';
import { getCategories } from '@/lib/catalog';
import type { ProductListResponse, ProductSummary } from '@drikon/shared-types';

interface BrandLite { id: string; name: string; slug: string; logoUrl?: string | null }

async function getBrands(): Promise<BrandLite[]> {
  try {
    return await apiGet<BrandLite[]>('/api/v1/brands', { revalidate: 300 });
  } catch {
    return [];
  }
}

/** One product row's worth of a catalogue query. Degrades to an empty row if the API is down. */
async function getProducts(query: string): Promise<ProductSummary[]> {
  try {
    const data = await apiGet<ProductListResponse>(`/api/v1/products?${query}`, { revalidate: 60 });
    return data.items;
  } catch {
    return [];
  }
}

export default async function HomePage() {
  const [settings, banners, categories, brands, featured, newest, popular] = await Promise.all([
    getSettings(),
    getBanners(),
    getCategories(),
    getBrands(),
    getProducts('featured=true&limit=10'),
    getProducts('sort=newest&limit=10'),
    getProducts('sort=popular&limit=10'),
  ]);
  const t = await getTranslations('home');
  const c = resolveContent(settings);

  return (
    <>
      {/* ─── Opening row: category sidebar · hero · promo tiles ─── */}
      <section className="shell pt-4 lg:pt-0">
        <div className="grid gap-4 lg:grid-cols-[260px_minmax(0,1fr)] xl:grid-cols-[260px_minmax(0,1fr)_280px]">
          <CategorySidebar categories={categories} brands={brands} />
          <div className="lg:pt-4">
            <HeroStage c={c} products={featured} />
          </div>
          <div className="hidden xl:flex lg:pt-4">
            <PromoTiles dealsTitle={c.dealsTitle} dealsBlurb={c.dealsBlurb} dealsImage={c.dealsImage} pick={featured[0]} />
          </div>
        </div>
      </section>

      {banners.length > 0 && (
        <section className="shell mt-4">
          <HeroSlider slides={banners} />
        </section>
      )}

      <ServiceStrip features={c.features} />

      {/* Only renders while a flash sale is live. */}
      <FlashSaleSection />

      <CategoryGrid categories={categories} />

      <ProductRow
        id="featured-products"
        title={t('featuredProducts')}
        href="/products?featured=true"
        linkLabel={t('viewAll')}
        products={featured}
      />

      <PromoBanner
        heading={c.ctaHeading}
        body={c.ctaBody}
        buttonLabel={c.ctaButtonLabel}
        buttonHref={c.ctaButtonHref}
      />

      <ProductRow
        id="new-arrivals"
        title={t('newArrivals')}
        href="/products?sort=newest"
        linkLabel={t('viewAll')}
        products={newest}
      />

      <ProductRow
        id="best-sellers"
        title={t('bestSellers')}
        href="/products?sort=popular"
        linkLabel={t('viewAll')}
        products={popular}
      />

      {/* Logged-in customers with order history only. */}
      <RecommendedForYou />

      <BrandStrip brands={brands} />
    </>
  );
}
