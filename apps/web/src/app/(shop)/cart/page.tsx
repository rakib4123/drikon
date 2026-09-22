'use client';

import { useCallback, useMemo } from 'react';
import Link from 'next/link';
import { useLocale, useTranslations } from 'next-intl';
import { Minus, Plus, Trash2, ArrowRight, ShoppingCart, Truck, AlertTriangle, Lock, Loader2 } from 'lucide-react';
import { useCartStore } from '@/store/cart-store';
import { useCartQuote } from '@/lib/use-cart-quote';
import { formatPrice } from '@/lib/utils';
import { localize } from '@/lib/localize';
import type { Locale } from '@/i18n/request';
import { CouponField } from '@/components/shop/coupon-field';
import { CartRecommendations } from '@/components/shop/cart-recommendations';
import { ProductThumb } from '@/components/shop/product-thumb';
import { Breadcrumbs } from '@/components/ui/breadcrumbs';

export default function CartPage() {
  const t = useTranslations('cart');
  const tNav = useTranslations('nav');
  const locale = useLocale() as Locale;
  const { items, updateQty, remove } = useCartStore();
  const { quote, loading, failed, issueFor } = useCartQuote();

  // The coupon field still validates for its own messages; totals come from the quote.
  const lines = useMemo(
    () => items.map((i) => ({ productId: i.productId, quantity: i.quantity, unitPrice: i.unitPrice })),
    [items],
  );
  const onCoupon = useCallback(() => {}, []);

  if (items.length === 0) {
    return (
      <div className="shell py-16">
        <div className="card max-w-lg mx-auto text-center !py-14">
          <div className="w-16 h-16 rounded-full bg-[color:var(--bg-soft)] grid place-items-center mx-auto mb-5 text-[color:var(--fg-muted)]">
            <ShoppingCart className="w-7 h-7" />
          </div>
          <h1 className="text-2xl font-extrabold mb-2">{t('emptyTitle')}</h1>
          <p className="text-[color:var(--fg-muted)] mb-6">{t('emptyBody')}</p>
          <Link href="/products" className="btn-primary">
            {t('browseShop')} <ArrowRight className="w-4 h-4" />
          </Link>
        </div>
      </div>
    );
  }

  const currency = quote?.currency ?? items[0]?.currency ?? 'BDT';
  const itemCount = items.reduce((n, i) => n + i.quantity, 0);
  const hasIssues = (quote?.issues.length ?? 0) > 0;
  const toFreeShipping = quote ? Math.max(0, quote.freeShippingThreshold - quote.subtotal) : null;
  const freeShipProgress = quote ? Math.min(100, (quote.subtotal / quote.freeShippingThreshold) * 100) : 0;

  return (
    <div className="shell py-6">
      <Breadcrumbs homeLabel={tNav('home')} items={[{ label: t('title') }]} />
      <h1 className="font-display mt-4 mb-6 text-2xl md:text-3xl">
        {t('title')} <span className="text-[color:var(--fg-muted)] font-semibold text-lg">({t('itemCount', { count: itemCount })})</span>
      </h1>

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_380px] items-start">
        <div className="card !p-0 overflow-hidden">
          <div className="hidden md:grid grid-cols-[minmax(0,1fr)_120px_140px_120px_44px] gap-4 px-5 py-3 bg-[color:var(--bg-soft)] text-xs font-bold uppercase tracking-wide text-[color:var(--fg-muted)] border-b border-[color:var(--border)]">
            <span>{t('product')}</span>
            <span>{t('price')}</span>
            <span>{t('quantity')}</span>
            <span className="text-right">{t('lineTotal')}</span>
            <span />
          </div>

          <ul className="divide-y divide-[color:var(--border)]">
            {items.map((item) => {
              const q = quote?.lines.find((l) => l.productId === item.productId && (l.variantId ?? undefined) === item.variantId);
              const issue = issueFor(item.productId, item.variantId);
              const name = q ? localize(q.name, q.nameBn, locale) : item.name;
              const unit = q?.unitPrice ?? item.unitPrice;
              const maxQty = q ? Math.max(1, q.stock) : 99;
              return (
                <li key={`${item.productId}-${item.variantId ?? ''}`} className="p-4 md:px-5">
                  <div className="grid grid-cols-[72px_minmax(0,1fr)] md:grid-cols-[minmax(0,1fr)_120px_140px_120px_44px] gap-x-4 gap-y-3 items-center">
                    <div className="flex items-center gap-4 min-w-0 md:col-span-1 col-span-2">
                      <Link href={`/products/${item.slug}`} className="relative w-[72px] h-[72px] shrink-0 rounded-[var(--radius-ctl)] overflow-hidden border border-[color:var(--border)] [background:var(--image-well)]">
                        <ProductThumb src={q?.image ?? item.image} sizes="72px" />
                      </Link>
                      <div className="min-w-0">
                        <Link href={`/products/${item.slug}`} className="font-semibold leading-snug line-clamp-2 hover:text-[color:var(--accent)]">
                          {name}
                        </Link>
                        {q?.onSale && <span className="badge-deal mt-1.5">{t('salePrice')}</span>}
                      </div>
                    </div>

                    <div className="md:block hidden">
                      <div className={`price-now text-sm ${q?.onSale ? 'is-sale' : ''}`}>{formatPrice(unit, currency)}</div>
                      {q?.onSale && <div className="price-was text-xs">{formatPrice(q.listPrice, currency)}</div>}
                    </div>

                    <div className="col-start-2 md:col-start-auto flex items-center gap-3">
                      <div className="inline-flex items-center h-10 border border-[color:var(--border-strong)] rounded-[var(--radius-ctl)] overflow-hidden">
                        <button
                          type="button"
                          onClick={() => updateQty(item.productId, item.quantity - 1, item.variantId)}
                          disabled={item.quantity <= 1}
                          aria-label={t('decrease', { name })}
                          className="h-full px-2.5 hover:bg-[color:var(--bg-soft)] disabled:opacity-40"
                        >
                          <Minus className="w-3.5 h-3.5" />
                        </button>
                        <span className="px-2 min-w-[2.25rem] text-center text-sm font-bold tabular-nums" aria-live="polite">
                          {item.quantity}
                        </span>
                        <button
                          type="button"
                          onClick={() => updateQty(item.productId, item.quantity + 1, item.variantId)}
                          disabled={item.quantity >= maxQty}
                          aria-label={t('increase', { name })}
                          className="h-full px-2.5 hover:bg-[color:var(--bg-soft)] disabled:opacity-40"
                        >
                          <Plus className="w-3.5 h-3.5" />
                        </button>
                      </div>
                      <span className="md:hidden price-now text-sm">{formatPrice(unit * item.quantity, currency)}</span>
                    </div>

                    <div className="hidden md:block text-right price-now">{formatPrice(unit * item.quantity, currency)}</div>

                    <button
                      type="button"
                      onClick={() => remove(item.productId, item.variantId)}
                      aria-label={t('remove', { name })}
                      className="hidden md:grid w-9 h-9 place-items-center rounded-[var(--radius-ctl)] text-[color:var(--fg-muted)] hover:bg-[color:var(--color-sale)]/10 hover:text-[color:var(--color-sale)] transition-colors"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                    <button
                      type="button"
                      onClick={() => remove(item.productId, item.variantId)}
                      className="md:hidden col-start-2 justify-self-start text-xs font-semibold text-[color:var(--fg-muted)] hover:text-[color:var(--color-sale)] inline-flex items-center gap-1"
                    >
                      <Trash2 className="w-3.5 h-3.5" /> {t('removeShort')}
                    </button>
                  </div>

                  {issue && (
                    <div role="alert" className="mt-3 flex items-start gap-2 rounded-[var(--radius-ctl)] bg-[color:var(--color-sale)]/8 text-[color:var(--color-sale)] px-3 py-2 text-sm font-semibold">
                      <AlertTriangle aria-hidden className="w-4 h-4 mt-0.5 shrink-0" />
                      {issue.reason === 'unavailable'
                        ? t('issueUnavailable')
                        : t('issueStock', { available: issue.available })}
                    </div>
                  )}
                </li>
              );
            })}
          </ul>
        </div>

        <aside className="card lg:sticky lg:top-[140px] space-y-5">
          <h2 className="text-lg font-extrabold">{t('summary')}</h2>

          {quote && toFreeShipping !== null && (
            <div className="rounded-[var(--radius-ctl)] bg-[color:var(--bg-soft)] p-3.5">
              <p className="text-sm flex items-center gap-2 font-semibold">
                <Truck aria-hidden className="w-4 h-4 text-[color:var(--accent)] shrink-0" />
                {toFreeShipping > 0
                  ? t('addForFreeShipping', { amount: formatPrice(toFreeShipping, currency) })
                  : t('freeShippingUnlocked')}
              </p>
              <div className="mt-2.5 h-2 rounded-full bg-[color:var(--bg-soft)] overflow-hidden" aria-hidden>
                <div className="h-full rounded-full bg-[color:var(--color-success)] transition-[width] duration-500" style={{ width: `${freeShipProgress}%` }} />
              </div>
            </div>
          )}

          <CouponField subtotal={quote?.subtotal ?? 0} items={lines} onChange={onCoupon} />

          {failed && !quote ? (
            <p role="alert" className="text-sm text-[color:var(--color-sale)]">{t('quoteFailed')}</p>
          ) : (
            <dl className={`space-y-2.5 text-sm transition-opacity ${loading ? 'opacity-60' : ''}`} aria-busy={loading}>
              <SummaryRow label={t('subtotal')} value={quote ? formatPrice(quote.subtotal, currency) : '—'} />
              <SummaryRow
                label={t('shipping')}
                value={quote ? (quote.shipping === 0 ? t('free') : formatPrice(quote.shipping, currency)) : '—'}
                highlight={quote?.shipping === 0}
              />
              {quote && quote.discount > 0 && (
                <SummaryRow
                  label={quote.coupon ? t('discountWithCode', { code: quote.coupon.code }) : t('discount')}
                  value={`− ${formatPrice(quote.discount, currency)}`}
                  highlight
                />
              )}
              <div className="pt-3 mt-1 border-t border-[color:var(--border)] flex items-baseline justify-between">
                <dt className="font-extrabold">{t('total')}</dt>
                <dd className="price-now text-2xl flex items-center gap-2">
                  {loading && <Loader2 aria-hidden className="w-4 h-4 animate-spin text-[color:var(--fg-muted)]" />}
                  {quote ? formatPrice(quote.total, currency) : '—'}
                </dd>
              </div>
            </dl>
          )}

          {hasIssues ? (
            <button type="button" disabled className="btn-primary w-full h-12">
              {t('fixIssuesFirst')}
            </button>
          ) : (
            <Link href="/checkout" className="btn-primary w-full h-12">
              {t('checkout')} <ArrowRight className="w-4 h-4" />
            </Link>
          )}
          <p className="text-xs text-[color:var(--fg-muted)] text-center inline-flex items-center justify-center gap-1.5 w-full">
            <Lock aria-hidden className="w-3.5 h-3.5" /> {t('paymentNote')}
          </p>
          <Link href="/products" className="block text-center text-sm font-bold text-[color:var(--accent)] hover:underline underline-offset-4">
            {t('continueShopping')}
          </Link>
        </aside>
      </div>

      <CartRecommendations />
    </div>
  );
}

function SummaryRow({ label, value, highlight }: { label: string; value: string; highlight?: boolean }) {
  return (
    <div className="flex items-center justify-between gap-4">
      <dt className="text-[color:var(--fg-muted)]">{label}</dt>
      <dd className={`font-semibold ${highlight ? 'text-[color:var(--color-success)]' : ''}`}>{value}</dd>
    </div>
  );
}
