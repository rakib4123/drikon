import { getTranslations } from 'next-intl/server';
import { getSettings } from '@/lib/settings';

export default async function TermsPage() {
  const settings = await getSettings();
  const brand = settings.siteName || 'Drikon';
  const email = settings.supportEmail || 'support@drikon.example';
  const updated = new Intl.DateTimeFormat('en-US', { year: 'numeric', month: 'long', day: 'numeric' }).format(
    new Date(),
  );
  const t = await getTranslations('terms');

  return (
    <section className="max-w-3xl mx-auto px-6 py-20">
      <div className="mb-14">
        <div className="text-xs font-mono uppercase tracking-[0.2em] text-[color:var(--fg-muted)] mb-3">
          {t('eyebrow')}
        </div>
        <h1 className="display text-4xl md:text-5xl">{t('heading')}</h1>
        <p className="mt-4 text-sm text-[color:var(--fg-muted)]">{t('lastUpdated', { date: updated })}</p>
      </div>

      <div className="space-y-10 text-[color:var(--fg-muted)] leading-relaxed">
        <Section title={t('s1Title')}>
          <p>{t('s1Body', { brand })}</p>
        </Section>

        <Section title={t('s2Title')}>
          <p>{t('s2Body')}</p>
        </Section>

        <Section title={t('s3Title')}>
          <p>{t('s3Body')}</p>
        </Section>

        <Section title={t('s4Title')}>
          <p>
            {t('s4BodyPrefix')}{' '}
            <strong className="text-[color:var(--fg)]">{t('s4BodyBkash')}</strong>
            {t('s4BodyMiddle')}{' '}
            <strong className="text-[color:var(--fg)]">{t('s4BodyCod')}</strong>
            {t('s4BodySuffix')}
          </p>
        </Section>

        <Section title={t('s5Title')}>
          <p>
            {t('s5BodyPrefix')}{' '}
            <a href="/shipping-returns" className="underline hover:text-[color:var(--fg)]">
              {t('s5BodyLinkLabel')}
            </a>{' '}
            {t('s5BodySuffix')}
          </p>
        </Section>

        <Section title={t('s6Title')}>
          <p>{t('s6Body')}</p>
        </Section>

        <Section title={t('s7Title')}>
          <p>{t('s7Body', { brand })}</p>
        </Section>

        <Section title={t('s8Title')}>
          <p>{t('s8Body')}</p>
        </Section>

        <Section title={t('s9Title')}>
          <p>{t('s9Body', { brand })}</p>
        </Section>

        <Section title={t('s10Title')}>
          <p>
            {t('s10BodyPrefix')}{' '}
            <a href={`mailto:${email}`} className="underline hover:text-[color:var(--fg)]">
              {email}
            </a>
            .
          </p>
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
