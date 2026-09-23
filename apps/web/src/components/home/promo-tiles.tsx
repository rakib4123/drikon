import Link from 'next/link';
import Image from '@/components/ui/smart-image';
import { ArrowRight } from 'lucide-react';
import { getLocale, getTranslations } from 'next-intl/server';
import type { ProductSummary } from '@drikon/shared-types';
import { effectivePrice, formatPrice } from '@/lib/utils';
import { localize } from '@/lib/localize';
import type { Locale } from '@/i18n/request';

/**
 * The two stacked promo tiles beside the opening row, `xl` only. The top
 * tile is the admin's "deals" content on the house black/red gradient; the
 * bottom is a single featured pick on a plain card — both real data, never
 * placeholder promotions.
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
  pick?: ProductSummary | null;
}) {
  const t = await getTranslations('home');
  const locale = (await getLocale()) as Locale;

  return (
    <div className="hidden xl:flex xl:flex-col gap-4">
      <Link
        href="/products?featured=true"
        className="group relative flex min-h-[180px] flex-1 flex-col justify-end overflow-hidden rounded-[var(--radius-card)] bg-drikon-gradient p-5 text-white"
      >
        {dealsImage && (
          <Image
            src={dealsImage}
            alt=""
            fill
            sizes="280px"
            className="object-cover opacity-40 transition-transform duration-500 group-hover:scale-105"
          />
        )}
        <span className="relative">
          <span className="badge-deal mb-2 inline-block">{t('hotDeals')}</span>
          <span className="font-display block text-lg font-extrabold leading-tight">{dealsTitle}</span>
          <span className="mt-1 block text-xs text-white/75 line-clamp-2">{dealsBlurb}</span>
          <span className="mt-3 inline-flex items-center gap-1 text-[13px] font-bold text-[color:var(--accent-2)]">
            {t('shopNow')} <ArrowRight aria-hidden className="h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5" />
          </span>
        </span>
      </Link>

      {pick && (
        <Link
          href={`/products/${pick.slug}`}
          className="card card-hover group relative flex min-h-[140px] flex-1 items-center gap-3 !p-5"
        >
          <span className="flex min-w-0 flex-1 flex-col justify-between self-stretch gap-2">
            <span>
              <span className="badge-soft mb-2 inline-block">{t('featuredPick')}</span>
              <span className="block text-sm font-bold leading-snug line-clamp-2">
                {localize(pick.name, pick.nameBn, locale)}
              </span>
            </span>
            <span className="price-now text-base">{formatPrice(effectivePrice(pick).price, pick.currency)}</span>
          </span>
          {pick.images?.[0]?.url && (
            <span className="relative w-24 shrink-0 self-stretch">
              <Image
                src={pick.images[0].url}
                alt=""
                fill
                sizes="96px"
                className="object-contain transition-transform duration-500 group-hover:scale-105"
              />
            </span>
          )}
        </Link>
      )}
    </div>
  );
}
