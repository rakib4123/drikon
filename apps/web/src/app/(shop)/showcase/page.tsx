import Link from 'next/link';
import type { Metadata } from 'next';
import { ArrowRight, ChevronDown, Package } from 'lucide-react';
import { apiGet } from '@/lib/api-client';
import { getSettings } from '@/lib/settings';
import { ShowcaseProduct, type ShowcaseItem } from '@/components/shop/showcase-product';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: 'The Selection — Featured Collection',
  description: 'A hand-picked lineup of featured tech, presented in detail.',
};

interface ListResponse {
  items: { slug: string }[];
}

async function getFeatured(): Promise<ShowcaseItem[]> {
  try {
    const list = await apiGet<ListResponse>('/api/v1/products?featured=true&limit=8');
    const details = await Promise.all(
      list.items.map((p) => apiGet<ShowcaseItem>(`/api/v1/products/slug/${p.slug}`).catch(() => null)),
    );
    return details.filter((d): d is ShowcaseItem => Boolean(d));
  } catch {
    return [];
  }
}

export default async function ShowcasePage() {
  const [products, settings] = await Promise.all([getFeatured(), getSettings()]);
  const brand = settings.siteName;

  return (
    <div className="bg-[#0b1322] text-white">
      {/* ─── Cinematic hero ─── */}
      <section className="relative min-h-[72vh] flex items-center overflow-hidden">
        <div
          className="absolute inset-0"
          style={{
            background:
              'radial-gradient(60% 80% at 75% 30%, rgba(239,106,32,0.28), transparent 60%), radial-gradient(50% 60% at 15% 90%, rgba(20,35,63,0.9), transparent 70%), #0b1322',
          }}
          aria-hidden
        />
        <div
          className="absolute inset-0 opacity-[0.08]"
          style={{
            backgroundImage:
              'linear-gradient(rgba(255,255,255,0.6) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.6) 1px, transparent 1px)',
            backgroundSize: '54px 54px',
            maskImage: 'radial-gradient(ellipse 70% 60% at 50% 30%, #000 30%, transparent 75%)',
            WebkitMaskImage: 'radial-gradient(ellipse 70% 60% at 50% 30%, #000 30%, transparent 75%)',
          }}
          aria-hidden
        />
        <div className="relative z-10 max-w-7xl mx-auto px-6 py-24 text-center">
          <div className="text-xs font-mono uppercase tracking-[0.4em] text-[#ef8a4d] mb-5">
            {brand} · The Selection
          </div>
          <h1 className="text-5xl md:text-7xl lg:text-8xl font-extrabold tracking-tight leading-[0.95] mb-6">
            Built to{' '}
            <span className="bg-gradient-to-r from-[#ef6a20] to-[#f5a524] bg-clip-text text-transparent">
              dominate.
            </span>
          </h1>
          <p className="text-white/70 text-lg max-w-2xl mx-auto">
            A hand-picked lineup of the gear we&apos;d build with — flagship laptops, components, and
            peripherals, presented up close. This is the {brand} edit.
          </p>
          {products.length > 0 && (
            <a
              href="#featured"
              className="mt-10 inline-flex items-center gap-2 text-sm text-white/60 hover:text-white transition-colors"
            >
              Explore the lineup <ChevronDown className="w-4 h-4 animate-bounce" />
            </a>
          )}
        </div>
      </section>

      {/* ─── Featured products ─── */}
      <div id="featured">
        {products.length === 0 ? (
          <section className="max-w-3xl mx-auto px-6 py-28 text-center">
            <div className="w-14 h-14 rounded-2xl bg-white/5 grid place-items-center mx-auto mb-5 text-white/50">
              <Package className="w-6 h-6" />
            </div>
            <h2 className="text-2xl font-bold mb-2">No featured products yet</h2>
            <p className="text-white/60 mb-6">
              Mark products as <strong>Featured</strong> in the admin to showcase them here.
            </p>
            <Link href="/products" className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-[#ef6a20] font-semibold hover:bg-[#d85f1a] transition-colors">
              Browse all products <ArrowRight className="w-4 h-4" />
            </Link>
          </section>
        ) : (
          products.map((p, i) => <ShowcaseProduct key={p.id} product={p} index={i} />)
        )}
      </div>

      {/* ─── Closing CTA ─── */}
      <section className="relative overflow-hidden py-24 text-center">
        <div className="absolute inset-0 bg-[radial-gradient(60%_80%_at_50%_0%,rgba(239,106,32,0.2),transparent_60%)]" aria-hidden />
        <div className="relative z-10 max-w-2xl mx-auto px-6">
          <h2 className="text-3xl md:text-4xl font-extrabold tracking-tight mb-4">That&apos;s just the highlights.</h2>
          <p className="text-white/65 mb-8">Explore the full catalog — laptops, components, and peripherals from the brands you trust.</p>
          <Link href="/products" className="inline-flex items-center gap-2 px-7 py-3.5 rounded-xl bg-white text-[#0b1322] font-semibold hover:bg-white/90 transition-colors">
            Shop all products <ArrowRight className="w-4 h-4" />
          </Link>
        </div>
      </section>
    </div>
  );
}
