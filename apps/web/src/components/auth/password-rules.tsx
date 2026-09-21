'use client';

import { useTranslations } from 'next-intl';
import { Check } from 'lucide-react';

/** Live checklist for the shared password policy (register and reset use the same one). */
export function PasswordRules({ password }: { password: string }) {
  const t = useTranslations('auth');
  const rules = [
    { label: t('rule10'), ok: password.length >= 10 },
    { label: t('ruleLower'), ok: /[a-z]/.test(password) },
    { label: t('ruleUpper'), ok: /[A-Z]/.test(password) },
    { label: t('ruleDigit'), ok: /\d/.test(password) },
    { label: t('ruleSymbol'), ok: /[^A-Za-z0-9]/.test(password) },
  ];
  return (
    <ul className="mt-2.5 grid grid-cols-2 gap-x-4 gap-y-1.5" aria-label={t('passwordRules')}>
      {rules.map((r) => (
        <li
          key={r.label}
          className={`flex items-center gap-1.5 text-xs transition-colors ${r.ok ? 'text-[color:var(--color-success)] font-semibold' : 'text-[color:var(--fg-muted)]'}`}
        >
          <span
            aria-hidden
            className={`w-4 h-4 rounded-full grid place-items-center shrink-0 ${r.ok ? 'bg-[color:var(--color-success)] text-white' : 'border border-[color:var(--border-strong)]'}`}
          >
            {r.ok && <Check className="w-2.5 h-2.5" strokeWidth={3.5} />}
          </span>
          {r.label}
          <span className="sr-only">{r.ok ? t('ruleMet') : t('ruleNotMet')}</span>
        </li>
      ))}
    </ul>
  );
}
