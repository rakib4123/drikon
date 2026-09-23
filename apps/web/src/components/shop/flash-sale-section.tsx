'use client';

import { useEffect, useState } from 'react';
import { useTranslations } from 'next-intl';
import { Zap } from 'lucide-react';
import type { ProductSummary } from '@drikon/shared-types';
import { apiGet } from '@/lib/api-client';
import { ProductCard } from './product-card';

interface ActiveSale {
  id: string;
  name: string;
  endsAt: string;
  items: {
    salePrice: string | number;
    soldCount: number;
    inventoryCap: number | null;
    product: Omit<ProductSummary, 'salePrice' | 'saleEndsAt'>;
  }[];
}

type Remaining = { d: number; h: number; m: number; s: number; done: boolean };

function useCountdown(target: string | null): Remaining | null {
  const [left, setLeft] = useState<Remaining | null>(null);
  useEffect(() => {
    if (!target) return;
    const tick = () => {
      const ms = Math.max(0, new Date(target).getTime() - Date.now());
      setLeft({
        d: Math.floor(ms / 8.64e7),
        h: Math.floor((ms % 8.64e7) / 3.6e6),
        m: Math.floor((ms % 3.6e6) / 6e4),
        s: Math.floor((ms % 6e4) / 1000),
        done: ms === 0,
      });
    };
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [target]);
  return left;
}

/**
 * "Deal of the day" row. Renders only while a flash sale is live, using the
 * standard product card so sale items look and behave like every other product
 * (the sale price comes through `salePrice`, which the card already honours).
 */
export function FlashSaleSection() {
  const t = useTranslations('home');
  const [sale, setSale] = useState<ActiveSale | null>(null);
  const left = useCountdown(sale?.endsAt ?? null);

  useEffect(() => {
    apiGet<ActiveSale | null>('/api/v1/flash-sales/active')
      .then(setSale)
      .catch(() => setSale(null));
  }, []);

  if (!sale || sale.items.length === 0 || left?.done) return null;

  const products: ProductSummary[] = sale.items.slice(0, 5).map((it) => ({
    ...it.product,
    salePrice: it.salePrice,
    saleEndsAt: sale.endsAt,
  }));

  return (
    <section className="shell py-8" aria-labelledby="deal-heading">
      <div className="carbon rounded-[var(--radius-card)] bg-[color:var(--color-ink)] text-[color:var(--accent-fg)] p-4 sm:p-6 lg:p-8">
        <div className="flex flex-wrap items-center gap-x-6 gap-y-3 mb-5">
          <div>
            <span className="block text-xs font-bold uppercase tracking-[0.2em] text-[color:var(--accent-2)]">
              {t('dealOfTheDay')}
            </span>
            <h2 id="deal-heading" className="font-display mt-1 flex items-center gap-2.5 text-xl md:text-2xl text-white">
              <span className="w-9 h-9 rounded-full bg-[color:var(--accent-2)] text-[color:var(--color-ink)] grid place-items-center">
                <Zap aria-hidden className="w-5 h-5 fill-current" />
              </span>
              {sale.name}
            </h2>
          </div>

          {left && (
            <div className="flex items-center gap-2" role="timer" aria-label={t('endsIn')}>
              <span className="text-sm font-semibold text-[color:var(--accent-fg)]/70">{t('endsIn')}</span>
              <div className="flex items-center gap-1 font-extrabold tabular-nums">
                {left.d > 0 && <TimeBox value={left.d} unit={t('daysShort')} />}
                <TimeBox value={left.h} unit={t('hoursShort')} />
                <TimeBox value={left.m} unit={t('minutesShort')} />
                <TimeBox value={left.s} unit={t('secondsShort')} />
              </div>
            </div>
          )}

        </div>

        {/* Scopes the shared ProductCard onto the ink-soft surface: these CSS
            variables are what `.card`, `.price-now` etc. read, so overriding
            them here (rather than editing product-card.tsx) turns every card
            in this band dark without touching the component other rows use
            on the white page. --cta-bg/--cta-border likewise re-point the
            "Add to cart" button (normally --color-ink-on-ink) to a translucent
            white fill/border — --color-ink itself is barely distinguishable
            from this band's --color-ink-soft cards (contrast ~1.07:1), which
            left the button nearly invisible until it's hovered. */}
        <div
          className="grid-auto-products"
          style={{
            '--surface': 'var(--color-ink-soft)',
            '--image-well': '#1c1c1f',
            '--border': 'rgba(255,255,255,0.12)',
            '--border-strong': 'rgba(255,255,255,0.24)',
            '--fg': '#ffffff',
            '--fg-muted': '#a7acb8',
            '--shadow': 'rgba(0,0,0,0.6)',
            '--cta-bg': 'rgba(255,255,255,0.08)',
            '--cta-border': 'rgba(255,255,255,0.35)',
          } as React.CSSProperties}
        >
          {products.map((p, i) => {
            const it = sale.items[i];
            const claimed = it.inventoryCap ? Math.min(100, Math.round((it.soldCount / it.inventoryCap) * 100)) : null;
            return (
              <div key={p.id} className="flex flex-col gap-2 h-full">
                <ProductCard product={p} />
                {claimed !== null && (
                  <div>
                    <div className="h-1.5 rounded-full bg-white/15 overflow-hidden">
                      <div className="h-full rounded-full bg-[color:var(--accent-2)]" style={{ width: `${claimed}%` }} />
                    </div>
                    <div className="mt-1 text-2xs text-[color:var(--accent-fg)]/70">
                      {t('claimed', { percent: claimed })}
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}

function TimeBox({ value, unit }: { value: number; unit: string }) {
  return (
    <span className="inline-flex items-baseline gap-0.5 rounded-md bg-[color:var(--accent-2)] text-[color:var(--color-fg)] px-2 py-1 text-sm font-extrabold">
      {String(value).padStart(2, '0')}
      {/* Full-strength --color-fg, not a diluted /70: on the opaque orange
          accent-2 fill, the blended 70%-opacity dark text only reached
          ~4.2:1 — under the 4.5:1 minimum for this 2xs normal text. */}
      <span className="text-2xs font-semibold text-[color:var(--color-fg)]">{unit}</span>
    </span>
  );
}
