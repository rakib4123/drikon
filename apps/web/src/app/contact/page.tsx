import { Mail, Facebook, Instagram, Clock } from 'lucide-react';
import { getTranslations } from 'next-intl/server';
import { getSettings } from '@/lib/settings';

export default async function ContactPage() {
  const settings = await getSettings();
  const brand = settings.siteName || 'Drikon';
  const email = settings.supportEmail || 'support@drikon.example';
  const t = await getTranslations('contact');

  return (
    <section className="max-w-3xl mx-auto px-6 py-20">
      <div className="text-center mb-14">
        <div className="text-xs font-mono uppercase tracking-[0.2em] text-[color:var(--fg-muted)] mb-3">
          {t('eyebrow')}
        </div>
        <h1 className="display text-4xl md:text-5xl">{t('heading', { brand })}</h1>
        <p className="mt-4 text-[color:var(--fg-muted)] max-w-lg mx-auto">{t('subheading')}</p>
      </div>

      <div className="grid sm:grid-cols-2 gap-4">
        <a
          href={`mailto:${email}`}
          className="card flex items-start gap-4 hover:border-[color:var(--accent)] transition-colors"
        >
          <div className="w-10 h-10 rounded-xl bg-[color:var(--bg)] border border-[color:var(--border)] grid place-items-center shrink-0">
            <Mail className="w-4 h-4" />
          </div>
          <div>
            <div className="font-semibold text-sm">{t('emailLabel')}</div>
            <div className="text-sm text-[color:var(--fg-muted)] mt-1">{email}</div>
          </div>
        </a>

        <div className="card flex items-start gap-4">
          <div className="w-10 h-10 rounded-xl bg-[color:var(--bg)] border border-[color:var(--border)] grid place-items-center shrink-0">
            <Clock className="w-4 h-4" />
          </div>
          <div>
            <div className="font-semibold text-sm">{t('responseTimeLabel')}</div>
            <div className="text-sm text-[color:var(--fg-muted)] mt-1">{t('responseTimeValue')}</div>
          </div>
        </div>
      </div>

      {(settings.socialFacebook || settings.socialInstagram) && (
        <div className="mt-10 flex items-center justify-center gap-4">
          {settings.socialFacebook && (
            <a
              href={settings.socialFacebook}
              target="_blank"
              rel="noopener noreferrer"
              aria-label="Facebook"
              className="w-10 h-10 rounded-full border border-[color:var(--border)] grid place-items-center hover:border-[color:var(--accent)] hover:text-[color:var(--accent)] transition-colors"
            >
              <Facebook className="w-4 h-4" />
            </a>
          )}
          {settings.socialInstagram && (
            <a
              href={settings.socialInstagram}
              target="_blank"
              rel="noopener noreferrer"
              aria-label="Instagram"
              className="w-10 h-10 rounded-full border border-[color:var(--border)] grid place-items-center hover:border-[color:var(--accent)] hover:text-[color:var(--accent)] transition-colors"
            >
              <Instagram className="w-4 h-4" />
            </a>
          )}
        </div>
      )}

      <p className="mt-14 text-center text-sm text-[color:var(--fg-muted)]">
        {t('footerPrefix')}{' '}
        <a href="/shipping-returns" className="underline hover:text-[color:var(--fg)]">
          {t('footerLinkLabel')}
        </a>
        .
      </p>
    </section>
  );
}
