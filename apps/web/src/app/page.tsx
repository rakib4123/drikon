export const dynamic = 'force-dynamic';

import Link from 'next/link';
import { ArrowRight, Sparkles, ShieldCheck, Truck, Headphones } from 'lucide-react';
import { ProductGrid } from '@/components/shop/product-grid';
import { CategoryShowcase } from '@/components/shop/category-showcase';
import { FlashSaleSection } from '@/components/shop/flash-sale-section';
import { HeroSlider } from '@/components/shop/hero-slider';
import { BrandStrip } from '@/components/shop/brand-strip';
import { StatsBand } from '@/components/shop/stats-band';
import { Reveal } from '@/components/ui/reveal';
import { apiGet } from '@/lib/api-client';
import { getSettings, resolveContent } from '@/lib/settings';
import { getBanners } from '@/lib/banners';
import { getCategories } from '@/lib/catalog';
import type { ProductListResponse } from '@drikon/shared-types';

interface BrandLite { id: string; name: string; slug: string; logoUrl?: string | null }
async function getBrands(): Promise<BrandLite[]> {
  try {
    return await apiGet<BrandLite[]>('/api/v1/brands');
  } catch {
    return [];
  }
}

// Rotating icon set for the (editable) feature strip cards.
const FEATURE_ICONS = [
  <ShieldCheck className="w-5 h-5" key="shield" />,
  <Truck className="w-5 h-5" key="truck" />,
  <Headphones className="w-5 h-5" key="headphones" />,
  <Sparkles className="w-5 h-5" key="sparkles" />,
];

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
  const c = resolveContent(settings);

  return (
    <>
      {/* ─── HERO: admin-managed slider, with the static hero as fallback ─── */}
      {banners.length > 0 ? (
        <HeroSlider slides={banners} />
      ) : (
      <section className="relative overflow-hidden grain aurora grid-overlay">
        <div className="absolute inset-0 bg-drikon-mesh" aria-hidden />
        <div className="relative z-10 max-w-7xl mx-auto px-6 pt-20 pb-28 md:pt-32 md:pb-40">
          <div className="max-w-3xl">
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full glass text-xs font-medium mb-6 animate-fade-up shadow-[0_0_24px_-8px_var(--glow)]">
              <Sparkles className="w-3.5 h-3.5 text-[color:var(--accent)]" />
              <span>{c.heroBadge}</span>
            </div>

            <h1 className="display text-5xl md:text-7xl lg:text-8xl animate-fade-up" style={{ animationDelay: '120ms' }}>
              {c.heroTitle.split('\n').map((line, i, arr) => {
                const isHighlight = line.trim() === c.heroHighlight.trim();
                return (
                  <span key={i}>
                    {isHighlight ? (
                      <span className="bg-gradient-to-r from-[#ef6a20] via-[#f9822f] to-[#14233f] bg-clip-text text-transparent">
                        {line}
                      </span>
                    ) : (
                      line
                    )}
                    {i < arr.length - 1 && <br />}
                  </span>
                );
              })}
            </h1>

            <p className="mt-6 max-w-xl text-lg text-[color:var(--fg-muted)] animate-fade-up" style={{ animationDelay: '240ms' }}>
              {c.heroSubtitle}
            </p>

            <div className="mt-10 flex flex-wrap gap-3 animate-fade-up" style={{ animationDelay: '360ms' }}>
              <Link href={c.heroCtaHref} className="btn-primary">
                {c.heroCtaLabel} <ArrowRight className="w-4 h-4" />
              </Link>
              <Link href={c.heroCtaAltHref} className="btn-ghost">
                {c.heroCtaAltLabel}
              </Link>
            </div>
          </div>

          {/* Asymmetric decoration */}
          <div
            className="hidden md:block absolute right-[-80px] top-24 w-[420px] h-[420px] rounded-full bg-gradient-to-br from-[#ef6a20]/30 to-[#14233f]/20 blur-3xl"
            aria-hidden
          />
        </div>
      </section>
      )}

      {/* ─── FEATURE STRIP ─── */}
      {c.features.length > 0 && (
        <section className="border-y border-[color:var(--border)] bg-[color:var(--bg-soft)]/30">
          <div className="max-w-7xl mx-auto px-6 py-10 grid grid-cols-2 md:grid-cols-4 gap-8">
            {c.features.map((f, i) => (
              <Feature key={i} icon={FEATURE_ICONS[i % FEATURE_ICONS.length]} title={f.title} body={f.body} />
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
              Featured devices
            </div>
            <h2 className="display text-3xl md:text-4xl">Trending devices</h2>
          </div>
          <Link href="/products" className="text-sm font-medium hover:text-[color:var(--accent)] transition-colors inline-flex items-center gap-1">
            Shop all <ArrowRight className="w-4 h-4" />
          </Link>
        </div>

        {featured && featured.items.length > 0 ? (
          <ProductGrid products={featured.items} />
        ) : (
          <div className="card text-center py-16 text-[color:var(--fg-muted)]">
            <p>No featured devices yet.</p>
            <p className="text-xs mt-2">Mark products as featured in the admin to show them here.</p>
          </div>
        )}
      </section>

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
              <Link href={c.ctaButtonHref} className="inline-flex items-center gap-2 px-5 py-3 rounded-xl bg-white text-[#06070d] font-semibold hover:bg-white/90 transition-colors">
                {c.ctaButtonLabel} <ArrowRight className="w-4 h-4" />
              </Link>
            </div>
          </div>
        </Reveal>
      </section>
    </>
  );
}

function Feature({ icon, title, body }: { icon: React.ReactNode; title: string; body: string }) {
  return (
    <div className="flex items-start gap-3">
      <div className="w-9 h-9 rounded-lg bg-[color:var(--bg)] border border-[color:var(--border)] grid place-items-center text-[color:var(--accent)] shrink-0">
        {icon}
      </div>
      <div>
        <div className="font-semibold text-sm">{title}</div>
        <div className="text-xs text-[color:var(--fg-muted)] mt-0.5">{body}</div>
      </div>
    </div>
  );
}
