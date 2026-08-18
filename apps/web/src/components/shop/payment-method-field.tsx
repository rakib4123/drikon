'use client';

import { useEffect, useState } from 'react';
import { Banknote, Smartphone } from 'lucide-react';
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

  if (!settings) return null;

  const bkashOn = settings.bkashEnabled !== false;
  const codOn = settings.codEnabled !== false;

  if (!bkashOn && !codOn) {
    return (
      <div className="card border-red-500/30 bg-red-500/5 text-sm text-red-600">
        Checkout is temporarily unavailable — no payment method is enabled. Please check back soon.
      </div>
    );
  }

  return (
    <div className="card space-y-4">
      <div className="font-semibold">Payment method</div>

      <div className="grid sm:grid-cols-2 gap-3">
        {bkashOn && (
          <button
            type="button"
            onClick={() => setMethod('BKASH_MANUAL')}
            className={`flex items-center gap-2 rounded-xl border px-4 py-3 text-sm text-left transition-colors ${
              method === 'BKASH_MANUAL'
                ? 'border-[color:var(--accent)] bg-[color:var(--accent)]/5'
                : 'border-[color:var(--border)]'
            }`}
          >
            <Smartphone className="w-4 h-4 shrink-0" />
            bKash (Send Money)
          </button>
        )}
        {codOn && (
          <button
            type="button"
            onClick={() => setMethod('COD')}
            className={`flex items-center gap-2 rounded-xl border px-4 py-3 text-sm text-left transition-colors ${
              method === 'COD'
                ? 'border-[color:var(--accent)] bg-[color:var(--accent)]/5'
                : 'border-[color:var(--border)]'
            }`}
          >
            <Banknote className="w-4 h-4 shrink-0" />
            Cash on delivery
          </button>
        )}
      </div>

      {method === 'BKASH_MANUAL' && (
        <div className="space-y-3 pt-1">
          <p className="text-xs text-[color:var(--fg-muted)] leading-relaxed">
            {settings.bkashInstructions ||
              `Open bKash → Send Money → send ${formatPrice(total, currency)} to ${
                settings.bkashNumber ?? 'our bKash number'
              } → enter the sender number and Transaction ID below.`}
          </p>
          <div>
            <span className="block text-xs font-medium text-[color:var(--fg-muted)] mb-1.5">
              Your bKash number
            </span>
            <input
              className="input"
              value={payerReference}
              onChange={(e) => setPayerReference(e.target.value)}
              placeholder="01XXXXXXXXX"
            />
          </div>
          <div>
            <span className="block text-xs font-medium text-[color:var(--fg-muted)] mb-1.5">
              Transaction ID (TrxID)
            </span>
            <input
              className="input"
              value={providerPaymentId}
              onChange={(e) => setProviderPaymentId(e.target.value)}
              placeholder="e.g. 8N7A6C5D4E"
            />
          </div>
        </div>
      )}

      {method === 'COD' && (
        <p className="text-xs text-[color:var(--fg-muted)]">
          Pay {formatPrice(total, currency)} in cash when your order arrives.
        </p>
      )}
    </div>
  );
}
