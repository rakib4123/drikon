export const dynamic = 'force-dynamic';

import { getTranslations } from 'next-intl/server';
import { FlashSaleSection } from '@/components/shop/flash-sale-section';
import { HeroSlider } from '@/components/shop/hero-slider';
import { BrandStrip } from '@/components/shop/brand-strip';
import { RecommendedForYou } from '@/components/shop/recommended-for-you';
import { HeroStage } from '@/components/home/hero-stage';
import { CategoryTiles } from '@/components/home/category-tiles';
import { Spotlight } from '@/components/home/spotlight';
import { TrustStrip } from '@/components/home/trust-strip';
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

  // The hero gets featured[0]; the two spotlights get the next two featured
  // products that actually have a photo — a product without one can't stand
  // on the 3D showcase or its 2D fallback.
  const withImage = featured.filter((p) => p.images?.[0]?.url);
  const heroProduct = withImage[0] ?? null;
  const spotlight1 = withImage[1] ?? null;
  const spotlight2 = withImage[2] ?? null;

  return (
    <>
      <HeroStage c={c} product={heroProduct} />

      <CategoryTiles categories={categories} />

      {banners.length > 0 && (
        <section className="shell mt-4">
          <HeroSlider slides={banners} />
        </section>
      )}

      <Spotlight product={spotlight1} labels={{ kicker: t('spotlightKicker'), viewProduct: t('viewProduct') }} />

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

      {/* Only renders while a flash sale is live. */}
      <FlashSaleSection />

      <Spotlight product={spotlight2} flip labels={{ kicker: t('spotlightKicker'), viewProduct: t('viewProduct') }} />

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

      <TrustStrip />
    </>
  );
}
