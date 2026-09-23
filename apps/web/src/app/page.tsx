export const dynamic = 'force-dynamic';

import Link from 'next/link';
import { ArrowRight } from 'lucide-react';
import { getTranslations } from 'next-intl/server';
import { FlashSaleSection } from '@/components/shop/flash-sale-section';
import { HeroSlider } from '@/components/shop/hero-slider';
import { BrandStrip } from '@/components/shop/brand-strip';
import { RecommendedForYou } from '@/components/shop/recommended-for-you';
import { CategorySidebar } from '@/components/home/category-sidebar';
import { PromoTiles } from '@/components/home/promo-tiles';
import { ServiceStrip } from '@/components/home/service-strip';
import { CategoryGrid } from '@/components/home/category-grid';
import { SpotlightBand } from '@/components/home/spotlight-band';
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

  // The spotlight band gets the first featured product that actually has a
  // photo — a product without one can't stand on the 3D showcase or its 2D
  // fallback. The second promo tile gets the next one, falling all the way
  // back to the plain top featured product if none of them have photos.
  const withImage = featured.filter((p) => p.images?.[0]?.url);
  const spotlightProduct = withImage[0] ?? null;
  const promoPick = withImage[1] ?? featured[0] ?? null;

  return (
    <>
      {/* Opening row: the always-open category rail, the banner slider (or a
          static black hero when there are none yet), and the promo tiles —
          the classic megastore front page, dense from the very first fold. */}
      <section className="shell pt-4 lg:pt-6 grid gap-4 lg:grid-cols-[260px_minmax(0,1fr)] xl:grid-cols-[260px_minmax(0,1fr)_280px] lg:items-start">
        <CategorySidebar categories={categories} brands={brands} />

        <div className="min-w-0">
          {banners.length > 0 ? (
            <HeroSlider slides={banners} />
          ) : (
            <section className="carbon relative flex min-h-[240px] flex-col items-start justify-center overflow-hidden rounded-[var(--radius-card)] bg-[color:var(--color-ink)] px-6 py-8 sm:min-h-[340px] sm:px-10 sm:py-10 lg:min-h-[420px] lg:px-14 lg:py-12">
              <span className="badge-deal">{c.heroBadge}</span>
              <h1 className="font-display mt-4 max-w-xl text-3xl leading-[1.08] text-white sm:text-4xl lg:text-5xl">
                {c.heroTitle.split('\n').map((line, i, arr) => (
                  <span key={i}>
                    {line}
                    {i < arr.length - 1 && <br />}
                  </span>
                ))}
              </h1>
              <p className="mt-4 max-w-md text-sm text-white/70 sm:text-base">{c.heroSubtitle}</p>
              <div className="mt-6 flex flex-wrap gap-3">
                <Link href={c.heroCtaHref} className="btn-primary">
                  {c.heroCtaLabel} <ArrowRight aria-hidden className="h-4 w-4" />
                </Link>
                <Link
                  href={c.heroCtaAltHref}
                  className="btn-ghost !border-white/30 !bg-transparent !text-white hover:!border-white"
                >
                  {c.heroCtaAltLabel}
                </Link>
              </div>
            </section>
          )}
        </div>

        <PromoTiles dealsTitle={c.dealsTitle} dealsBlurb={c.dealsBlurb} dealsImage={c.dealsImage} pick={promoPick} />
      </section>

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

      <SpotlightBand product={spotlightProduct} labels={{ kicker: t('spotlightKicker'), view: t('viewProduct') }} />

      <ProductRow
        id="new-arrivals"
        title={t('newArrivals')}
        href="/products?sort=newest"
        linkLabel={t('viewAll')}
        products={newest}
      />

      <PromoBanner
        heading={c.ctaHeading}
        body={c.ctaBody}
        buttonLabel={c.ctaButtonLabel}
        buttonHref={c.ctaButtonHref}
      />

      <ProductRow
        id="best-sellers"
        title={t('bestSellers')}
        href="/products?sort=popular"
        linkLabel={t('viewAll')}
        products={popular}
      />

      <BrandStrip brands={brands} />

      <TrustStrip />

      {/* Logged-in customers with order history only. */}
      <RecommendedForYou />
    </>
  );
}
