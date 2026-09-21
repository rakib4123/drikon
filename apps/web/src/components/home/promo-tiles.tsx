import Link from 'next/link';
import Image from '@/components/ui/smart-image';
import { ArrowRight } from 'lucide-react';
import { getLocale, getTranslations } from 'next-intl/server';
import type { ProductSummary } from '@drikon/shared-types';
import { effectivePrice, formatPrice } from '@/lib/utils';
import { localize } from '@/lib/localize';
import type { Locale } from '@/i18n/request';

/**
 * The two stacked promo tiles to the right of the hero (wide screens only).
 * Both are driven by real data: the deals tile by the admin's "deals" content,
 * the second by the top featured product — never placeholder promotions.
 */
export async function PromoTiles({
  dealsTitle,
  dealsBlurb,
  dealsImage,
  pick,
}: {
  dealsTitle: string;
  dealsBlurb: string;
  dealsImage: string;
  pick?: ProductSummary;
}) {
  const t = await getTranslations('home');
  const locale = (await getLocale()) as Locale;

  return (
    <div className="flex flex-col gap-4 w-full">
      <Link
        href="/products?featured=true"
        className="group relative flex-1 overflow-hidden rounded-[var(--radius-card)] bg-drikon-gradient text-white p-5 flex flex-col justify-end"
      >
        {dealsImage && (
          <Image src={dealsImage} alt="" fill sizes="280px" className="object-cover opacity-45 group-hover:scale-105 transition-transform duration-500" />
        )}
        <span className="relative">
          <span className="badge-deal mb-2">{t('hotDeals')}</span>
          <span className="block text-lg font-extrabold leading-tight">{dealsTitle}</span>
          <span className="block text-xs text-white/75 mt-1 line-clamp-2">{dealsBlurb}</span>
          <span className="mt-3 inline-flex items-center gap-1 text-[13px] font-bold text-[color:var(--accent-2)]">
            {t('shopNow')} <ArrowRight aria-hidden className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition-transform" />
          </span>
        </span>
      </Link>

      {pick && (
        <Link
          href={`/products/${pick.slug}`}
          className="group relative flex-1 overflow-hidden rounded-[var(--radius-card)] border border-[color:var(--border)] bg-[color:var(--surface)] neon-edge p-5 flex gap-3"
        >
          <span className="flex flex-col justify-between min-w-0">
            <span>
              <span className="badge-soft mb-2">{t('featuredPick')}</span>
              <span className="block text-sm font-bold leading-snug line-clamp-2">
                {localize(pick.name, pick.nameBn, locale)}
              </span>
            </span>
            <span className="price-now text-base">{formatPrice(effectivePrice(pick).price, pick.currency)}</span>
          </span>
          {pick.images?.[0]?.url && (
            <span className="relative w-24 shrink-0 self-stretch">
              <Image src={pick.images[0].url} alt="" fill sizes="96px" className="object-contain group-hover:scale-105 transition-transform duration-500" />
            </span>
          )}
        </Link>
      )}
    </div>
  );
}
