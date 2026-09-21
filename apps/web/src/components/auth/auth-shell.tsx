'use client';

import { useTranslations } from 'next-intl';
import { Package, Heart, Zap, ShieldCheck } from 'lucide-react';

/**
 * Shared frame for every sign-in page: the form in a card, beside a navy panel
 * listing what an account gets you. The panel hides on phones.
 */
export function AuthShell({
  title,
  subtitle,
  children,
}: {
  title: string;
  subtitle?: string;
  children: React.ReactNode;
}) {
  const t = useTranslations('auth');
  const perks = [
    { icon: Package, label: t('perkOrders') },
    { icon: Heart, label: t('perkWishlist') },
    { icon: Zap, label: t('perkCheckout') },
    { icon: ShieldCheck, label: t('perkSecurity') },
  ];

  return (
    <div className="shell py-8 sm:py-12">
      <div className="mx-auto max-w-4xl grid md:grid-cols-[minmax(0,1.1fr)_minmax(0,0.9fr)] rounded-[var(--radius-card)] border border-[color:var(--border)] bg-white shadow-[0_24px_60px_-30px_rgba(16,24,40,0.35)] overflow-hidden">
        <div className="p-6 sm:p-10">
          <h1 className="text-2xl sm:text-[28px] font-extrabold tracking-tight">{title}</h1>
          {subtitle && <p className="mt-1.5 text-sm text-[color:var(--fg-muted)]">{subtitle}</p>}
          <div className="mt-7">{children}</div>
        </div>

        <aside className="hidden md:flex flex-col justify-center gap-6 bg-drikon-gradient text-white p-10">
          <p className="text-xl font-extrabold leading-snug">{t('panelTitle')}</p>
          <ul className="space-y-4">
            {perks.map(({ icon: Icon, label }) => (
              <li key={label} className="flex items-center gap-3 text-sm text-white/85">
                <span className="w-9 h-9 rounded-full bg-white/10 grid place-items-center shrink-0">
                  <Icon aria-hidden className="w-[18px] h-[18px] text-[color:var(--accent-2)]" />
                </span>
                {label}
              </li>
            ))}
          </ul>
        </aside>
      </div>
    </div>
  );
}

/** Labelled form field with an error slot wired to the input by `aria-describedby`. */
export function AuthField({
  id,
  label,
  error,
  aside,
  children,
}: {
  id: string;
  label: string;
  error?: string;
  /** Rendered at the right of the label row — e.g. a "Forgot password?" link. */
  aside?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <div>
      <div className="flex items-baseline justify-between gap-3 mb-1.5">
        <label htmlFor={id} className="text-[13px] font-semibold">{label}</label>
        {aside}
      </div>
      {children}
      {error && (
        <p id={`${id}-error`} role="alert" className="text-xs text-[color:var(--color-sale)] mt-1.5">
          {error}
        </p>
      )}
    </div>
  );
}

export function FormAlert({ tone = 'error', children }: { tone?: 'error' | 'success' | 'info'; children: React.ReactNode }) {
  const styles = {
    error: 'bg-[color:var(--color-sale)]/8 text-[color:var(--color-sale)] border-[color:var(--color-sale)]/25',
    success: 'bg-[color:var(--color-success)]/8 text-[color:var(--color-success)] border-[color:var(--color-success)]/25',
    info: 'bg-[color:var(--accent)]/6 text-[color:var(--accent)] border-[color:var(--accent)]/20',
  }[tone];
  return (
    <div role={tone === 'error' ? 'alert' : 'status'} className={`rounded-[var(--radius-ctl)] border px-4 py-3 text-sm font-semibold ${styles}`}>
      {children}
    </div>
  );
}

/**
 * Where to send someone after signing in. `next` comes from the URL, so it must
 * be a same-site path: `/login?next=https://evil.example` used to bounce a
 * freshly signed-in shopper to any site — a phishing-grade open redirect.
 * `//evil.example` is protocol-relative and also off-site, so it's rejected too.
 */
export function safeNext(next: string | null, fallback = '/dashboard'): string {
  if (!next || !next.startsWith('/') || next.startsWith('//') || next.startsWith('/\\')) return fallback;
  return next;
}
