import Link from 'next/link';
import Image from '@/components/ui/smart-image';
import { ArrowRight } from 'lucide-react';
import type { ResolvedContent } from '@/lib/settings';

/**
 * Hero shown when the admin hasn't created any banner slides. Same footprint
 * as the slider so the homepage layout doesn't shift between the two.
 */
export function StaticHero({ c }: { c: ResolvedContent }) {
  return (
    <section className="relative h-[240px] sm:h-[340px] lg:h-[420px] overflow-hidden rounded-[var(--radius-card)] bg-drikon-gradient text-white">
      <Image
        src="/hero.png"
        alt=""
        fill
        priority
        sizes="(min-width: 1280px) 780px, (min-width: 1024px) 70vw, 100vw"
        className="object-cover object-right opacity-45 sm:opacity-60"
      />
      <div className="absolute inset-0 bg-gradient-to-r from-[#0b1424] via-[#0b1424]/70 to-transparent" />
      <div className="relative z-10 h-full px-6 sm:px-10 lg:px-14 flex items-center">
        <div className="max-w-md">
          <span className="badge-deal mb-3">{c.heroBadge}</span>
          <h1 className="display text-2xl sm:text-4xl lg:text-[44px] mb-3">
            {c.heroTitle.split('\n').map((line, i, arr) => (
              <span key={i}>
                {line}
                {i < arr.length - 1 && <br />}
              </span>
            ))}
          </h1>
          <p className="hidden sm:block text-white/80 mb-6">{c.heroSubtitle}</p>
          <div className="flex flex-wrap gap-2.5">
            <Link href={c.heroCtaHref} className="btn-primary">
              {c.heroCtaLabel} <ArrowRight aria-hidden className="w-4 h-4" />
            </Link>
            <Link
              href={c.heroCtaAltHref}
              className="hidden sm:inline-flex btn-ghost !bg-transparent !text-white !border-white/40 hover:!border-white"
            >
              {c.heroCtaAltLabel}
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
}
