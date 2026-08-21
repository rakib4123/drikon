export const dynamic = 'force-dynamic';

import Link from 'next/link';
import { getTranslations, getLocale } from 'next-intl/server';
import { ArrowRight, Sparkles } from 'lucide-react';
import { ProductGrid } from '@/components/shop/product-grid';
import { CategoryShowcase } from '@/components/shop/category-showcase';
import { FlashSaleSection } from '@/components/shop/flash-sale-section';
import { HeroSlider } from '@/components/shop/hero-slider';
import { RotatingTagline } from '@/components/shop/rotating-tagline';
import { BrandStrip } from '@/components/shop/brand-strip';
import { StatsBand } from '@/components/shop/stats-band';
import { RecommendedForYou } from '@/components/shop/recommended-for-you';
import { Reveal } from '@/components/ui/reveal';
import { apiGet } from '@/lib/api-client';
import { getSettings, resolveContent } from '@/lib/settings';
import { getBanners } from '@/lib/banners';
import { getCategories } from '@/lib/catalog';
import { localize } from '@/lib/localize';
import type { Locale } from '@/i18n/request';
import type { ProductListResponse } from '@drikon/shared-types';

interface BrandLite { id: string; name: string; slug: string; logoUrl?: string | null }
async function getBrands(): Promise<BrandLite[]> {
  try {
    return await apiGet<BrandLite[]>('/api/v1/brands');
  } catch {
    return [];
  }
}

// Fetch on the server — RSC means no API key/token leaks to client.
async function getFeatured(): Promise<ProductListResponse | null> {
  try {
    return await apiGet<ProductListResponse>('/api/v1/products?featured=true&limit=4');
  } catch {
    return null;
  }
}

export default async function HomePage() {
  const [featured, settings, banners, categories, brands] = await Promise.all([
    getFeatured(),
    getSettings(),
    getBanners(),
    getCategories(),
    getBrands(),
  ]);
  const t = await getTranslations('home');
  const c = resolveContent(settings);
  const locale = (await getLocale()) as Locale;
  const categoryPhrases = categories
    .filter((cat) => !cat.parentId)
    .slice(0, 6)
    .map((cat) => localize(cat.name, cat.nameBn, locale));

  return (
    <>
      {/* ─── HERO: admin-managed slider, with the static hero as fallback ─── */}
      {banners.length > 0 ? (
        <HeroSlider slides={banners} />
      ) : (
      <section className="relative overflow-hidden">
        <div className="relative z-10 max-w-3xl mx-auto px-6 pt-20 pb-16 md:pt-28 md:pb-20 text-center">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full border border-[color:var(--border)] text-xs font-medium text-[color:var(--fg-muted)] mb-8 animate-fade-up">
            <Sparkles className="w-3.5 h-3.5" />
            <span>{c.heroBadge}</span>
          </div>

          <h1 className="display text-5xl md:text-6xl lg:text-7xl animate-fade-up" style={{ animationDelay: '120ms' }}>
            {c.heroTitle.split('\n').map((line, i, arr) => (
              <span key={i}>
                {line}
                {i < arr.length - 1 && <br />}
              </span>
            ))}
          </h1>

          <p className="mt-6 max-w-xl mx-auto text-lg text-[color:var(--fg-muted)] animate-fade-up" style={{ animationDelay: '240ms' }}>
            {c.heroSubtitle}
          </p>

          <div className="mt-10 flex flex-wrap gap-3 justify-center animate-fade-up" style={{ animationDelay: '360ms' }}>
            <Link href={c.heroCtaHref} className="btn-primary">
              {c.heroCtaLabel} <ArrowRight className="w-4 h-4" />
            </Link>
            <Link href={c.heroCtaAltHref} className="btn-ghost">
              {c.heroCtaAltLabel}
            </Link>
          </div>
        </div>

        {/* Hero image — full-bleed, no overlay, lets the product carry the visual weight */}
        <div className="max-w-6xl mx-auto px-6 pb-20 md:pb-28 animate-fade-up" style={{ animationDelay: '440ms' }}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="/hero.png"
            alt="Featured device"
            className="w-full max-h-[420px] object-cover rounded-3xl border border-[color:var(--border)] grayscale contrast-105 brightness-110"
          />
        </div>
      </section>
      )}

      {categoryPhrases.length > 0 && (
        <div className="max-w-3xl mx-auto px-6 -mt-8 mb-8 md:-mt-12 md:mb-12 text-center">
          <RotatingTagline prefix={t('shopPrefix')} phrases={categoryPhrases} />
        </div>
      )}

      {/* ─── FEATURE STRIP ─── */}
      {c.features.length > 0 && (
        <section className="border-y border-[color:var(--border)]">
          <div className="max-w-7xl mx-auto px-6 py-10 grid grid-cols-2 md:grid-cols-4 gap-8">
            {c.features.map((f, i) => (
              <Feature key={i} title={f.title} body={f.body} />
            ))}
          </div>
        </section>
      )}

      {/* ─── FLASH SALE (only renders when one is live) ─── */}
      <FlashSaleSection />

      {/* ─── SHOP BY CATEGORY ─── */}
      <CategoryShowcase categories={categories} dealsTitle={c.dealsTitle} dealsBlurb={c.dealsBlurb} dealsImage={c.dealsImage} />

      {/* ─── FEATURED PRODUCTS ─── */}
      <section className="max-w-7xl mx-auto px-6 py-20">
        <div className="flex items-end justify-between mb-10 gap-6">
          <div>
            <div className="text-xs font-mono uppercase tracking-[0.2em] text-[color:var(--accent)] mb-2">
              {t('featuredDevices')}
            </div>
            <h2 className="display text-3xl md:text-4xl">{t('trendingDevices')}</h2>
          </div>
          <Link href="/products" className="text-sm font-medium hover:text-[color:var(--accent)] transition-colors inline-flex items-center gap-1">
            {t('shopAll')} <ArrowRight className="w-4 h-4" />
          </Link>
        </div>

        {featured && featured.items.length > 0 ? (
          <ProductGrid products={featured.items} />
        ) : (
          <div className="card text-center py-16 text-[color:var(--fg-muted)]">
            <p>{t('noFeaturedYet')}</p>
            <p className="text-xs mt-2">{t('markFeaturedHint')}</p>
          </div>
        )}
      </section>

      {/* ─── RECOMMENDED FOR YOU (logged-in customers with order history only) ─── */}
      <RecommendedForYou />

      {/* ─── TRUSTED BRANDS ─── */}
      <BrandStrip brands={brands} />

      {/* ─── STATS BAND ─── */}
      <StatsBand />

      {/* ─── EDITORIAL CTA ─── */}
      <section className="max-w-7xl mx-auto px-6 pb-24">
        <Reveal className="relative overflow-hidden rounded-3xl bg-drikon-gradient p-10 md:p-16 text-white grain">
          <div className="relative z-10 max-w-2xl">
            <h3 className="display text-3xl md:text-5xl">
              {c.ctaHeading}
            </h3>
            <p className="mt-4 text-white/80 max-w-lg">
              {c.ctaBody}
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Link href={c.ctaButtonHref} className="inline-flex items-center gap-2 px-5 py-3 rounded-xl bg-white text-[#151515] font-semibold hover:bg-white/90 transition-colors">
                {c.ctaButtonLabel} <ArrowRight className="w-4 h-4" />
              </Link>
            </div>
          </div>
        </Reveal>
      </section>
    </>
  );
}

function Feature({ title, body }: { title: string; body: string }) {
  return (
    <div className="flex items-start gap-3">
      <div className="w-px h-8 bg-[color:var(--fg)] shrink-0 mt-0.5" />
      <div>
        <div className="font-semibold text-sm">{title}</div>
        <div className="text-xs text-[color:var(--fg-muted)] mt-0.5">{body}</div>
      </div>
    </div>
  );
}
