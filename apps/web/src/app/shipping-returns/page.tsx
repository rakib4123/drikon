import Link from 'next/link';
import { getTranslations } from 'next-intl/server';
import { getSettings } from '@/lib/settings';

export default async function ShippingReturnsPage() {
  const settings = await getSettings();
  const brand = settings.siteName || 'Drikon';
  const t = await getTranslations('shippingReturns');

  return (
    <section className="max-w-3xl mx-auto px-6 py-20">
      <div className="text-center mb-14">
        <div className="text-xs font-mono uppercase tracking-[0.2em] text-[color:var(--fg-muted)] mb-3">
          {t('eyebrow')}
        </div>
        <h1 className="display text-4xl md:text-5xl">{t('heading')}</h1>
      </div>

      <div className="space-y-12 text-[color:var(--fg-muted)] leading-relaxed">
        <Section title={t('shippingTitle')}>
          <p>{t('shippingP1')}</p>
          <p>
            {t('shippingP2Prefix')}{' '}
            <Link href="/orders" className="underline hover:text-[color:var(--fg)]">
              {t('shippingP2LinkLabel')}
            </Link>
            .
          </p>
        </Section>

        <Section title={t('paymentTitle')}>
          <p>
            {t('paymentBodyPrefix')}{' '}
            <strong className="text-[color:var(--fg)]">{t('paymentBodyBkash')}</strong>{' '}
            {t('paymentBodyMiddle')}{' '}
            <strong className="text-[color:var(--fg)]">{t('paymentBodyCod')}</strong>
            {t('paymentBodySuffix')}
          </p>
        </Section>

        <Section title={t('returnsTitle')}>
          <p>
            {t('returnsP1Prefix')} <strong className="text-[color:var(--fg)]">{t('returnsP1Days')}</strong>{' '}
            {t('returnsP1Suffix')}
          </p>
          <p>
            {t('returnsP2Prefix')}{' '}
            <a href="/contact" className="underline hover:text-[color:var(--fg)]">
              {t('returnsP2LinkLabel')}
            </a>{' '}
            {t('returnsP2Suffix')}
          </p>
        </Section>

        <Section title={t('refundsTitle')}>
          <p>{t('refundsBody')}</p>
        </Section>

        <Section title={t('warrantyTitle')}>
          <p>{t('warrantyBody', { brand })}</p>
        </Section>
      </div>
    </section>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <h2 className="display text-xl md:text-2xl text-[color:var(--fg)] mb-3">{title}</h2>
      <div className="space-y-3">{children}</div>
    </div>
  );
}
