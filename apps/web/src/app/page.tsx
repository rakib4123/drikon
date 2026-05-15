export const revalidate = 60;

import Link from 'next/link';
import { ArrowRight, Sparkles, ShieldCheck, Truck, Headphones } from 'lucide-react';
import { ProductCard } from '@/components/shop/product-card';
import { apiGet } from '@/lib/api-client';
import type { ProductListResponse } from '@drikon/shared-types';

// Fetch on the server — RSC means no API key/token leaks to client.
async function getFeatured(): Promise<ProductListResponse | null> {
  try {
    return await apiGet<ProductListResponse>('/api/v1/products?featured=true&limit=4');
  } catch {
    return null;
  }
}

export default async function HomePage() {
  const featured = await getFeatured();

  return (
    <>
      {/* ─── HERO ─── */}
      <section className="relative overflow-hidden grain">
        <div className="absolute inset-0 bg-drikon-mesh" aria-hidden />
        <div className="relative max-w-7xl mx-auto px-6 pt-20 pb-28 md:pt-32 md:pb-40">
          <div className="max-w-3xl">
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full border border-[color:var(--border)] bg-[color:var(--bg-soft)]/70 backdrop-blur-sm text-xs font-medium mb-6 animate-fade-up">
              <Sparkles className="w-3.5 h-3.5 text-[color:var(--accent-2)]" />
              <span>New: Aurelis Aether Pro is here</span>
            </div>

            <h1 className="display text-5xl md:text-7xl lg:text-8xl animate-fade-up" style={{ animationDelay: '120ms' }}>
              See it.<br />
              <span className="bg-gradient-to-r from-indigo-400 via-indigo-500 to-cyan-400 bg-clip-text text-transparent">
                Want it.
              </span>
              <br />
              Get it.
            </h1>

            <p className="mt-6 max-w-xl text-lg text-[color:var(--fg-muted)] animate-fade-up" style={{ animationDelay: '240ms' }}>
              Drikon is a marketplace curated around taste — not algorithms. Every product is hand-picked,
              every price is fair, every delivery is tracked end-to-end.
            </p>

            <div className="mt-10 flex flex-wrap gap-3 animate-fade-up" style={{ animationDelay: '360ms' }}>
              <Link href="/products" className="btn-primary">
                Browse the shop <ArrowRight className="w-4 h-4" />
              </Link>
              <Link href="/products?featured=true" className="btn-ghost">
                View featured
              </Link>
            </div>
          </div>

          {/* Asymmetric decoration */}
          <div
            className="hidden md:block absolute right-[-80px] top-24 w-[420px] h-[420px] rounded-full bg-gradient-to-br from-indigo-500/30 to-cyan-500/20 blur-3xl"
            aria-hidden
          />
        </div>
      </section>

      {/* ─── FEATURE STRIP ─── */}
      <section className="border-y border-[color:var(--border)] bg-[color:var(--bg-soft)]/30">
        <div className="max-w-7xl mx-auto px-6 py-10 grid grid-cols-2 md:grid-cols-4 gap-8">
          <Feature icon={<ShieldCheck className="w-5 h-5" />} title="Buyer protection" body="Refund guarantee on every order" />
          <Feature icon={<Truck className="w-5 h-5" />} title="Tracked delivery" body="End-to-end visibility in real time" />
          <Feature icon={<Headphones className="w-5 h-5" />} title="Real humans" body="Support in your timezone" />
          <Feature icon={<Sparkles className="w-5 h-5" />} title="Curated only" body="Edited by people, not robots" />
        </div>
      </section>

      {/* ─── FEATURED PRODUCTS ─── */}
      <section className="max-w-7xl mx-auto px-6 py-20">
        <div className="flex items-end justify-between mb-10 gap-6">
          <div>
            <div className="text-xs font-mono uppercase tracking-[0.2em] text-[color:var(--accent)] mb-2">
              Featured
            </div>
            <h2 className="display text-3xl md:text-4xl">Hand-picked this week</h2>
          </div>
          <Link href="/products" className="text-sm font-medium hover:text-[color:var(--accent)] transition-colors inline-flex items-center gap-1">
            See all <ArrowRight className="w-4 h-4" />
          </Link>
        </div>

        {featured && featured.items.length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {featured.items.map((p) => (
              <ProductCard key={p.id} product={p} />
            ))}
          </div>
        ) : (
          <div className="card text-center py-16 text-[color:var(--fg-muted)]">
            <p>The API isn&apos;t reachable yet.</p>
            <p className="text-xs mt-2">Run <code className="font-mono">docker-compose up -d && pnpm db:migrate && pnpm db:seed && pnpm dev</code></p>
          </div>
        )}
      </section>

      {/* ─── EDITORIAL CTA ─── */}
      <section className="max-w-7xl mx-auto px-6 pb-24">
        <div className="relative overflow-hidden rounded-3xl bg-drikon-gradient p-10 md:p-16 text-white grain">
          <div className="relative z-10 max-w-2xl">
            <h3 className="display text-3xl md:text-5xl">
              The marketplace, redrawn.
            </h3>
            <p className="mt-4 text-white/80 max-w-lg">
              Drikon is built by engineers obsessed with craft — type-safe end to end, secure by default,
              fast everywhere. Open source, opinionated, and shipping today.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Link href="/register" className="inline-flex items-center gap-2 px-5 py-3 rounded-xl bg-white text-indigo-950 font-semibold hover:bg-white/90 transition-colors">
                Create your account <ArrowRight className="w-4 h-4" />
              </Link>
            </div>
          </div>
        </div>
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
