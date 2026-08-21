import { getTranslations } from 'next-intl/server';
import { getSettings } from '@/lib/settings';

export default async function PrivacyPage() {
  const settings = await getSettings();
  const brand = settings.siteName || 'Drikon';
  const email = settings.supportEmail || 'support@drikon.example';
  const updated = new Intl.DateTimeFormat('en-US', { year: 'numeric', month: 'long', day: 'numeric' }).format(
    new Date(),
  );
  const t = await getTranslations('privacy');

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
        <Section title={t('collectTitle')}>
          <p>{t('collectIntro')}</p>
          <ul className="list-disc pl-5 space-y-2">
            <li>
              <strong className="text-[color:var(--fg)]">{t('collectAccountLabel')}</strong> {t('collectAccountBody')}
            </li>
            <li>
              <strong className="text-[color:var(--fg)]">{t('collectOrderLabel')}</strong> {t('collectOrderBody')}
            </li>
            <li>
              <strong className="text-[color:var(--fg)]">{t('collectPaymentLabel')}</strong> {t('collectPaymentBody')}
            </li>
            <li>
              <strong className="text-[color:var(--fg)]">{t('collectSecurityLabel')}</strong> {t('collectSecurityBody')}
            </li>
          </ul>
        </Section>

        <Section title={t('useTitle')}>
          <p>{t('useBody', { brand })}</p>
        </Section>

        <Section title={t('protectTitle')}>
          <p>{t('protectBody')}</p>
        </Section>

        <Section title={t('shareTitle')}>
          <p>{t('shareBody')}</p>
        </Section>

        <Section title={t('cookiesTitle')}>
          <p>{t('cookiesBody')}</p>
        </Section>

        <Section title={t('rightsTitle')}>
          <p>
            {t('rightsBodyPrefix')}{' '}
            <a href={`mailto:${email}`} className="underline hover:text-[color:var(--fg)]">
              {email}
            </a>
            .
          </p>
        </Section>

        <Section title={t('changesTitle')}>
          <p>{t('changesBody')}</p>
        </Section>

        <Section title={t('contactTitle')}>
          <p>
            {t('contactBodyPrefix')}{' '}
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
