'use client';

import { useEffect, useId, useState } from 'react';
import { useTranslations } from 'next-intl';
import { Banknote, Smartphone, Check, Loader2 } from 'lucide-react';
import { apiGet } from '@/lib/api-client';
import { formatPrice } from '@/lib/utils';
import type { PaymentInput, PaymentMethod } from '@drikon/shared-types';

interface SettingsSubset {
  bkashEnabled?: boolean;
  codEnabled?: boolean;
  bkashNumber?: string | null;
  bkashInstructions?: string | null;
}

export function PaymentMethodField({
  total,
  currency,
  onChange,
}: {
  total: number;
  currency: string;
  onChange: (payment: PaymentInput | null) => void;
}) {
  const t = useTranslations('checkout');
  const ids = useId();
  const [settings, setSettings] = useState<SettingsSubset | null>(null);
  const [method, setMethod] = useState<PaymentMethod | null>(null);
  const [payerReference, setPayerReference] = useState('');
  const [providerPaymentId, setProviderPaymentId] = useState('');

  useEffect(() => {
    apiGet<SettingsSubset>('/api/v1/settings')
      .then(setSettings)
      .catch(() => setSettings({}));
  }, []);

  useEffect(() => {
    if (!settings || method) return;
    if (settings.bkashEnabled !== false) setMethod('BKASH_MANUAL');
    else if (settings.codEnabled !== false) setMethod('COD');
  }, [settings, method]);

  useEffect(() => {
    if (method === 'COD') {
      onChange({ method: 'COD' });
    } else if (
      method === 'BKASH_MANUAL' &&
      payerReference.trim().length >= 5 &&
      providerPaymentId.trim().length >= 4
    ) {
      onChange({
        method: 'BKASH_MANUAL',
        payerReference: payerReference.trim(),
        providerPaymentId: providerPaymentId.trim(),
      });
    } else {
      onChange(null);
    }
  }, [method, payerReference, providerPaymentId, onChange]);

  if (!settings) {
    return (
      <div className="py-4 grid place-items-center text-[color:var(--fg-muted)]">
        <Loader2 aria-label={t('loading')} className="w-5 h-5 animate-spin" />
      </div>
    );
  }

  const bkashOn = settings.bkashEnabled !== false;
  const codOn = settings.codEnabled !== false;

  if (!bkashOn && !codOn) {
    return (
      <p role="alert" className="rounded-[var(--radius-ctl)] bg-[color:var(--color-sale)]/8 p-4 text-sm font-semibold text-[color:var(--color-sale)]">
        {t('noPaymentMethods')}
      </p>
    );
  }

  return (
    <div className="space-y-4">
      <div role="radiogroup" aria-label={t('payment')} className="grid sm:grid-cols-2 gap-3">
        {bkashOn && (
          <MethodOption
            selected={method === 'BKASH_MANUAL'}
            onSelect={() => setMethod('BKASH_MANUAL')}
            icon={<Smartphone className="w-5 h-5 text-[#e2136e]" />}
            title={t('bkash')}
            subtitle={t('bkashSub')}
          />
        )}
        {codOn && (
          <MethodOption
            selected={method === 'COD'}
            onSelect={() => setMethod('COD')}
            icon={<Banknote className="w-5 h-5 text-[color:var(--color-success)]" />}
            title={t('cod')}
            subtitle={t('codSub')}
          />
        )}
      </div>

      {method === 'BKASH_MANUAL' && (
        <div className="rounded-[var(--radius-card)] border border-[color:var(--border)] bg-[color:var(--bg-soft)]/60 p-4 space-y-4">
          {/* Always shown, whatever the admin's custom instructions say: custom
              instructions used to replace this text entirely, and it was the only
              place the amount appeared. */}
          <div className="grid sm:grid-cols-2 gap-3">
            <div className="rounded-[var(--radius-ctl)] bg-[color:var(--surface-solid)] border border-[color:var(--border)] p-3">
              <div className="text-xs font-semibold text-[color:var(--fg-muted)]">{t('amountToSend')}</div>
              <div className="price-now text-xl mt-0.5">{formatPrice(total, currency)}</div>
            </div>
            {settings.bkashNumber && (
              <div className="rounded-[var(--radius-ctl)] bg-[color:var(--surface-solid)] border border-[color:var(--border)] p-3">
                <div className="text-xs font-semibold text-[color:var(--fg-muted)]">{t('sendTo')}</div>
                <div className="font-mono text-lg font-bold mt-0.5 select-all">{settings.bkashNumber}</div>
              </div>
            )}
          </div>

          <p className="text-sm text-[color:var(--fg-muted)] leading-relaxed">
            {settings.bkashInstructions || t('bkashSteps')}
          </p>

          <div className="grid sm:grid-cols-2 gap-3">
            <label className="block" htmlFor={`${ids}-payer`}>
              <span className="block text-xs font-semibold mb-1.5">{t('yourBkashNumber')}</span>
              <input
                id={`${ids}-payer`}
                className="input"
                type="tel"
                inputMode="tel"
                value={payerReference}
                onChange={(e) => setPayerReference(e.target.value)}
                placeholder="01XXXXXXXXX"
              />
            </label>
            <label className="block" htmlFor={`${ids}-trx`}>
              <span className="block text-xs font-semibold mb-1.5">{t('trxId')}</span>
              <input
                id={`${ids}-trx`}
                className="input font-mono uppercase"
                autoCapitalize="characters"
                spellCheck={false}
                value={providerPaymentId}
                onChange={(e) => setProviderPaymentId(e.target.value)}
                placeholder="8N7A6C5D4E"
              />
            </label>
          </div>
        </div>
      )}

      {method === 'COD' && (
        <p className="rounded-[var(--radius-ctl)] bg-[color:var(--bg-soft)] p-4 text-sm">
          {t('codNote', { amount: formatPrice(total, currency) })}
        </p>
      )}
    </div>
  );
}

function MethodOption({
  selected,
  onSelect,
  icon,
  title,
  subtitle,
}: {
  selected: boolean;
  onSelect: () => void;
  icon: React.ReactNode;
  title: string;
  subtitle: string;
}) {
  return (
    <button
      type="button"
      role="radio"
      aria-checked={selected}
      onClick={onSelect}
      className={`relative flex items-center gap-3 rounded-[var(--radius-card)] border-2 p-4 text-left transition-colors ${
        selected ? 'border-[color:var(--accent)] bg-[color:var(--accent)]/5' : 'border-[color:var(--border)] hover:border-[color:var(--border-strong)]'
      }`}
    >
      <span className="w-10 h-10 rounded-full bg-[color:var(--surface-solid)] border border-[color:var(--border)] grid place-items-center shrink-0">{icon}</span>
      <span className="min-w-0">
        <span className="block font-bold text-sm">{title}</span>
        <span className="block text-xs text-[color:var(--fg-muted)]">{subtitle}</span>
      </span>
      {selected && (
        <span className="absolute top-2.5 right-2.5 w-5 h-5 rounded-full bg-[color:var(--accent)] text-[color:var(--accent-fg)] grid place-items-center">
          <Check aria-hidden className="w-3 h-3" />
        </span>
      )}
    </button>
  );
}
