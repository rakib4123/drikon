export const dynamic = 'force-dynamic';

import Link from 'next/link';
import { ArrowRight, Sparkles } from 'lucide-react';
import { getTranslations } from 'next-intl/server';
import { StatsBand } from '@/components/shop/stats-band';
import { Reveal } from '@/components/ui/reveal';
import { getSettings } from '@/lib/settings';

export default async function AboutPage() {
  const settings = await getSettings();
  const brand = settings.siteName || 'Drikon';
  const t = await getTranslations('about');

  const PRINCIPLES = [
    { title: t('principle1Title'), body: t('principle1Body') },
    { title: t('principle2Title'), body: t('principle2Body') },
    { title: t('principle3Title'), body: t('principle3Body') },
    { title: t('principle4Title'), body: t('principle4Body') },
  ];

  return (
    <>
      {/* ─── HEADER ─── */}
      <section className="relative overflow-hidden">
        <div className="max-w-3xl mx-auto px-6 pt-20 pb-16 md:pt-28 md:pb-20 text-center">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full border border-[color:var(--border)] text-xs font-medium text-[color:var(--fg-muted)] mb-8 animate-fade-up">
            <Sparkles className="w-3.5 h-3.5" />
            <span>{t('eyebrow', { brand })}</span>
          </div>

          <h1 className="display text-4xl md:text-5xl lg:text-6xl animate-fade-up" style={{ animationDelay: '120ms' }}>
            {t('heroTitle')}
          </h1>

          <p className="mt-6 max-w-xl mx-auto text-lg text-[color:var(--fg-muted)] animate-fade-up" style={{ animationDelay: '240ms' }}>
            {t('heroSubtitle', { brand })}
          </p>
        </div>
      </section>

      {/* ─── STORY ─── */}
      <section className="max-w-3xl mx-auto px-6 pb-20">
        <div className="space-y-6 text-[color:var(--fg-muted)] leading-relaxed">
          <p>{t('storyP1')}</p>
          <p>{t('storyP2')}</p>
          <p>
            <em>{t('storyEmphasis')}</em> {t('storyP3Prefix')}
          </p>
        </div>
      </section>

      {/* ─── WHAT WE STAND FOR ─── */}
      <section className="border-y border-[color:var(--border)]">
        <div className="max-w-7xl mx-auto px-6 py-14">
          <h2 className="display text-2xl md:text-3xl mb-10 text-center">{t('standForHeading')}</h2>
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
            <h3 className="display text-3xl md:text-5xl">{t('ctaHeading')}</h3>
            <p className="mt-4 text-white/80 max-w-lg">{t('ctaBody')}</p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Link
                href="/products"
                className="inline-flex items-center gap-2 px-5 py-3 rounded-xl bg-white text-[#151515] font-semibold hover:bg-white/90 transition-colors"
              >
                {t('ctaButton')} <ArrowRight className="w-4 h-4" />
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
