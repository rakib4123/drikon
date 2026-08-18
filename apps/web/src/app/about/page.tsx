export const dynamic = 'force-dynamic';

import Link from 'next/link';
import { ArrowRight, Sparkles } from 'lucide-react';
import { StatsBand } from '@/components/shop/stats-band';
import { Reveal } from '@/components/ui/reveal';
import { getSettings } from '@/lib/settings';

const PRINCIPLES = [
  { title: 'Authenticity first', body: 'Every device is genuine, sourced through official channels — no grey-market imports.' },
  { title: 'Chosen, not just listed', body: "A curated catalog beats an endless one. We'd rather carry 50 great products than 5,000 mediocre ones." },
  { title: 'Support that answers', body: 'Real people handle every order and every question — no ticket queue that goes nowhere.' },
  { title: 'Fast, tracked delivery', body: 'Nationwide shipping with tracking from the moment your order ships.' },
];

export default async function AboutPage() {
  const settings = await getSettings();
  const brand = settings.siteName || 'Drikon';

  return (
    <>
      {/* ─── HEADER ─── */}
      <section className="relative overflow-hidden">
        <div className="max-w-3xl mx-auto px-6 pt-20 pb-16 md:pt-28 md:pb-20 text-center">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full border border-[color:var(--border)] text-xs font-medium text-[color:var(--fg-muted)] mb-8 animate-fade-up">
            <Sparkles className="w-3.5 h-3.5" />
            <span>About {brand}</span>
          </div>

          <h1 className="display text-4xl md:text-5xl lg:text-6xl animate-fade-up" style={{ animationDelay: '120ms' }}>
            Vision, engineered — for how you actually use tech.
          </h1>

          <p className="mt-6 max-w-xl mx-auto text-lg text-[color:var(--fg-muted)] animate-fade-up" style={{ animationDelay: '240ms' }}>
            {brand} exists because too much of what&apos;s sold as &ldquo;premium&rdquo; electronics isn&apos;t. We built a
            store around the opposite idea: fewer products, chosen properly, backed by people who&apos;ll actually pick up the
            phone.
          </p>
        </div>
      </section>

      {/* ─── STORY ─── */}
      <section className="max-w-3xl mx-auto px-6 pb-20">
        <div className="space-y-6 text-[color:var(--fg-muted)] leading-relaxed">
          <p>
            We don&apos;t try to carry everything. Every device and accessory in the catalog is chosen because it&apos;s
            genuinely good — not because a supplier offered the best margin. If we wouldn&apos;t buy it ourselves, it
            doesn&apos;t go on the shelf.
          </p>
          <p>
            That same standard applies after checkout. Every order ships with tracking, every device is authentic and
            covered by its official warranty, and if something goes wrong, a real person on our support team sorts it
            out — not a script.
          </p>
          <p>
            <em>Vision, engineered</em> isn&apos;t just a tagline. It&apos;s the filter every product goes through before it
            reaches you.
          </p>
        </div>
      </section>

      {/* ─── WHAT WE STAND FOR ─── */}
      <section className="border-y border-[color:var(--border)]">
        <div className="max-w-7xl mx-auto px-6 py-14">
          <h2 className="display text-2xl md:text-3xl mb-10 text-center">What we stand for</h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
            {PRINCIPLES.map((p) => (
              <Principle key={p.title} title={p.title} body={p.body} />
            ))}
          </div>
        </div>
      </section>

      <StatsBand />

      {/* ─── CLOSING CTA ─── */}
      <section className="max-w-7xl mx-auto px-6 py-24">
        <Reveal className="relative overflow-hidden rounded-3xl bg-drikon-gradient p-10 md:p-16 text-white grain">
          <div className="relative z-10 max-w-2xl">
            <h3 className="display text-3xl md:text-5xl">Ready to see for yourself?</h3>
            <p className="mt-4 text-white/80 max-w-lg">
              Browse the full catalog — every device authenticated, every order backed by real support.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Link
                href="/products"
                className="inline-flex items-center gap-2 px-5 py-3 rounded-xl bg-white text-[#151515] font-semibold hover:bg-white/90 transition-colors"
              >
                Shop all devices <ArrowRight className="w-4 h-4" />
              </Link>
            </div>
          </div>
        </Reveal>
      </section>
    </>
  );
}

function Principle({ title, body }: { title: string; body: string }) {
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
