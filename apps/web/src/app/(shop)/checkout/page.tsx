'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useLocale, useTranslations } from 'next-intl';
import { Loader2, Lock, ArrowRight, ShoppingCart, AlertTriangle } from 'lucide-react';
import { toast } from 'sonner';
import {
  ShippingAddressSchema,
  type ShippingAddressInput,
  type OrderSummary,
  type PaymentInput,
} from '@drikon/shared-types';
import { apiPost, ApiError } from '@/lib/api-client';
import { formatPrice } from '@/lib/utils';
import { localize } from '@/lib/localize';
import type { Locale } from '@/i18n/request';
import { useCartQuote } from '@/lib/use-cart-quote';
import { CouponField } from '@/components/shop/coupon-field';
import { PaymentMethodField } from '@/components/shop/payment-method-field';
import { ProductThumb } from '@/components/shop/product-thumb';
import { Breadcrumbs } from '@/components/ui/breadcrumbs';
import { useCartStore } from '@/store/cart-store';
import { useAuthStore } from '@/store/auth-store';

export default function CheckoutPage() {
  const router = useRouter();
  const t = useTranslations('checkout');
  const tCart = useTranslations('cart');
  const tNav = useTranslations('nav');
  const locale = useLocale() as Locale;
  const { items, clear } = useCartStore();
  const couponCode = useCartStore((s) => s.couponCode);
  const { user, initialized, fetchMe } = useAuthStore();
  const { quote, loading: quoting, issueFor } = useCartQuote();

  useEffect(() => {
    if (!initialized) fetchMe();
  }, [initialized, fetchMe]);

  useEffect(() => {
    if (initialized && !user) router.replace('/login?next=/checkout');
  }, [initialized, user, router]);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<ShippingAddressInput>({
    resolver: zodResolver(ShippingAddressSchema),
    defaultValues: { country: 'BD' },
  });

  const [payment, setPayment] = useState<PaymentInput | null>(null);
  const onPayment = useCallback((p: PaymentInput | null) => setPayment(p), []);
  const onCoupon = useCallback(() => {}, []);
  const lines = useMemo(
    () => items.map((i) => ({ productId: i.productId, quantity: i.quantity, unitPrice: i.unitPrice })),
    [items],
  );

  const currency = quote?.currency ?? items[0]?.currency ?? 'BDT';
  const hasIssues = (quote?.issues.length ?? 0) > 0;
  // Never let an order go in against a stale or missing quote: the bKash amount
  // shown to the customer must be the amount the order will record.
  const canPlace = !!quote && !quoting && !hasIssues && !!payment;

  const onSubmit = async (address: ShippingAddressInput) => {
    if (!canPlace) return;
    try {
      const order = await apiPost<OrderSummary>('/api/v1/orders', {
        items: items.map((i) => ({ productId: i.productId, variantId: i.variantId, quantity: i.quantity })),
        shippingAddress: address,
        couponCode: couponCode ?? undefined,
        payment,
      });
      clear();
      toast.success(t('orderPlaced'), { description: order.orderNumber });
      router.push(`/orders/${order.orderNumber}?new=1`);
    } catch (err) {
      toast.error(t('checkoutFailed'), { description: err instanceof ApiError ? err.message : t('tryAgain') });
    }
  };

  if (!user) {
    return (
      <div className="shell py-24 grid place-items-center text-[color:var(--fg-muted)]">
        <Loader2 aria-label={t('loading')} className="w-6 h-6 animate-spin" />
      </div>
    );
  }

  if (items.length === 0) {
    return (
      <div className="shell py-16">
        <div className="card max-w-lg mx-auto text-center !py-14">
          <div className="w-16 h-16 rounded-full bg-[color:var(--bg-soft)] grid place-items-center mx-auto mb-5 text-[color:var(--fg-muted)]">
            <ShoppingCart className="w-7 h-7" />
          </div>
          <h1 className="text-2xl font-extrabold mb-2">{t('nothingTitle')}</h1>
          <p className="text-[color:var(--fg-muted)] mb-6">{t('nothingBody')}</p>
          <Link href="/products" className="btn-primary">
            {tCart('browseShop')} <ArrowRight className="w-4 h-4" />
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="shell py-6">
      <Breadcrumbs homeLabel={tNav('home')} items={[{ label: tCart('title'), href: '/cart' }, { label: t('title') }]} />
      <h1 className="mt-4 mb-6 text-2xl md:text-3xl font-extrabold tracking-tight">{t('title')}</h1>

      <form onSubmit={handleSubmit(onSubmit)} className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_400px] items-start">
        <div className="space-y-5">
          <section className="card" aria-labelledby="step-address">
            <StepHeading id="step-address" n={1} title={t('shippingAddress')} />
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label={t('fullName')} error={errors.fullName?.message} className="sm:col-span-2">
                <input className="input" autoComplete="name" {...register('fullName')} />
              </Field>
              <Field label={t('phone')} error={errors.phone?.message}>
                <input className="input" type="tel" autoComplete="tel" {...register('phone')} placeholder="+880 1XXX-XXXXXX" />
              </Field>
              <Field label={t('city')} error={errors.city?.message}>
                <input className="input" autoComplete="address-level2" {...register('city')} />
              </Field>
              <Field label={t('line1')} error={errors.line1?.message} className="sm:col-span-2">
                <input className="input" autoComplete="address-line1" {...register('line1')} placeholder={t('line1Placeholder')} />
              </Field>
              <Field label={t('line2')} error={errors.line2?.message} className="sm:col-span-2">
                <input className="input" autoComplete="address-line2" {...register('line2')} placeholder={t('line2Placeholder')} />
              </Field>
              <Field label={t('state')} error={errors.state?.message}>
                <input className="input" autoComplete="address-level1" {...register('state')} />
              </Field>
              <Field label={t('postalCode')} error={errors.postalCode?.message}>
                <input className="input" autoComplete="postal-code" {...register('postalCode')} />
              </Field>
              <input type="hidden" {...register('country')} />
            </div>
          </section>

          <section className="card" aria-labelledby="step-payment">
            <StepHeading id="step-payment" n={2} title={t('payment')} />
            {quote ? (
              // The instructions ("send ৳X via bKash") use the server-quoted total.
              <PaymentMethodField total={quote.total} currency={currency} onChange={onPayment} />
            ) : (
              <div className="py-6 grid place-items-center text-[color:var(--fg-muted)]">
                <Loader2 aria-label={t('loading')} className="w-5 h-5 animate-spin" />
              </div>
            )}
          </section>
        </div>

        <aside className="card lg:sticky lg:top-[140px] space-y-5">
          <h2 className="text-lg font-extrabold">{t('orderSummary')}</h2>

          <ul className="space-y-3 max-h-72 overflow-y-auto -mr-2 pr-2 pt-2 -mt-2">
            {items.map((item) => {
              const q = quote?.lines.find((l) => l.productId === item.productId && (l.variantId ?? undefined) === item.variantId);
              const issue = issueFor(item.productId, item.variantId);
              return (
                <li key={`${item.productId}-${item.variantId ?? ''}`} className="flex gap-3 text-sm">
                  <div className="relative w-14 h-14 shrink-0">
                    <div className="absolute inset-0 rounded-[var(--radius-ctl)] overflow-hidden border border-[color:var(--border)] bg-white">
                      <ProductThumb src={q?.image ?? item.image} sizes="56px" />
                    </div>
                    <span className="absolute -top-1.5 -right-1.5 min-w-5 h-5 px-1 rounded-full bg-[color:var(--fg)] text-white text-[10px] font-bold grid place-items-center">
                      {item.quantity}
                    </span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <span className="line-clamp-2 font-medium">{q ? localize(q.name, q.nameBn, locale) : item.name}</span>
                    {issue && (
                      <span className="mt-1 flex items-center gap-1 text-xs font-semibold text-[color:var(--color-sale)]">
                        <AlertTriangle aria-hidden className="w-3.5 h-3.5" />
                        {issue.reason === 'unavailable' ? tCart('issueUnavailable') : tCart('issueStock', { available: issue.available })}
                      </span>
                    )}
                  </div>
                  <span className="font-bold shrink-0">{formatPrice(q?.lineTotal ?? item.unitPrice * item.quantity, currency)}</span>
                </li>
              );
            })}
          </ul>

          <CouponField subtotal={quote?.subtotal ?? 0} items={lines} onChange={onCoupon} />

          <dl className={`space-y-2.5 text-sm border-t border-[color:var(--border)] pt-4 transition-opacity ${quoting ? 'opacity-60' : ''}`} aria-busy={quoting}>
            <Row label={tCart('subtotal')} value={quote ? formatPrice(quote.subtotal, currency) : '—'} />
            <Row
              label={tCart('shipping')}
              value={quote ? (quote.shipping === 0 ? tCart('free') : formatPrice(quote.shipping, currency)) : '—'}
            />
            {quote && quote.discount > 0 && (
              <Row
                label={quote.coupon ? tCart('discountWithCode', { code: quote.coupon.code }) : tCart('discount')}
                value={`− ${formatPrice(quote.discount, currency)}`}
              />
            )}
            <div className="pt-3 border-t border-[color:var(--border)] flex items-baseline justify-between">
              <dt className="font-extrabold">{tCart('total')}</dt>
              <dd className="price-now text-2xl">{quote ? formatPrice(quote.total, currency) : '—'}</dd>
            </div>
          </dl>

          {hasIssues && (
            <p role="alert" className="text-sm font-semibold text-[color:var(--color-sale)]">
              {t('fixCartFirst')}{' '}
              <Link href="/cart" className="underline underline-offset-4">{t('backToCart')}</Link>
            </p>
          )}

          <button type="submit" disabled={!canPlace || isSubmitting} className="btn-primary w-full h-12">
            {isSubmitting ? (
              <Loader2 aria-label={t('placing')} className="w-4 h-4 animate-spin" />
            ) : (
              <>
                {t('placeOrder')} {quote && `· ${formatPrice(quote.total, currency)}`}
              </>
            )}
          </button>
          {!payment && quote && !hasIssues && (
            <p className="text-xs text-[color:var(--fg-muted)] text-center">{t('choosePaymentFirst')}</p>
          )}
          <p className="text-xs text-[color:var(--fg-muted)] text-center inline-flex items-center justify-center gap-1.5 w-full">
            <Lock aria-hidden className="w-3.5 h-3.5" />
            {payment?.method === 'BKASH_MANUAL' ? t('bkashNote') : t('placedNote')}
          </p>
        </aside>
      </form>
    </div>
  );
}

function StepHeading({ id, n, title }: { id: string; n: number; title: string }) {
  return (
    <h2 id={id} className="flex items-center gap-3 text-lg font-extrabold mb-5">
      <span className="w-8 h-8 rounded-full bg-[color:var(--accent)] text-white text-sm grid place-items-center">{n}</span>
      {title}
    </h2>
  );
}

function Field({
  label,
  error,
  className = '',
  children,
}: {
  label: string;
  error?: string;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <label className={`block ${className}`}>
      <span className="block text-[13px] font-semibold mb-1.5">{label}</span>
      {children}
      {error && <span role="alert" className="block text-xs text-[color:var(--color-sale)] mt-1">{error}</span>}
    </label>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-4">
      <dt className="text-[color:var(--fg-muted)]">{label}</dt>
      <dd className="font-semibold">{value}</dd>
    </div>
  );
}

