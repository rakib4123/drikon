'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { ShieldCheck, ShieldOff, Loader2, Copy, Download, KeyRound, LogOut, Check } from 'lucide-react';
import { toast } from 'sonner';
import { apiPost, ApiError } from '@/lib/api-client';
import { useAuthStore } from '@/store/auth-store';

type Step = 'idle' | 'scan' | 'codes';

/**
 * Two-factor authentication and session management.
 *
 * The 2FA API (setup → enable → recovery codes → disable) existed with no UI at
 * all, so no shopper could turn it on. The flow here mirrors it exactly:
 * setup returns a QR + secret without enabling anything; confirming a live code
 * enables it and returns ten one-time recovery codes, shown once.
 */
export default function SecurityPage() {
  const t = useTranslations('security');
  const router = useRouter();
  const user = useAuthStore((s) => s.user);
  const fetchMe = useAuthStore((s) => s.fetchMe);
  const logout = useAuthStore((s) => s.logout);

  const [step, setStep] = useState<Step>('idle');
  const [setup, setSetup] = useState<{ secret: string; qrCodeDataUrl: string } | null>(null);
  const [recoveryCodes, setRecoveryCodes] = useState<string[]>([]);
  const [code, setCode] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!user) return null;
  const enabled = !!user.twoFactorEnabled;

  const run = async (fn: () => Promise<void>) => {
    setBusy(true);
    setError(null);
    try {
      await fn();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : t('genericError'));
    } finally {
      setBusy(false);
    }
  };

  const startSetup = () =>
    run(async () => {
      setSetup(await apiPost<{ secret: string; qrCodeDataUrl: string }>('/api/v1/auth/2fa/setup'));
      setCode('');
      setStep('scan');
    });

  const confirmEnable = () =>
    run(async () => {
      const res = await apiPost<{ recoveryCodes: string[] }>('/api/v1/auth/2fa/enable', { code: code.trim() });
      setRecoveryCodes(res.recoveryCodes);
      setStep('codes');
      await fetchMe();
    });

  const disable = () =>
    run(async () => {
      await apiPost('/api/v1/auth/2fa/disable', { code: code.trim() });
      setCode('');
      await fetchMe();
      toast.success(t('disabledToast'));
    });

  const codesText = recoveryCodes.join('\n');

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl md:text-3xl font-extrabold tracking-tight">{t('title')}</h1>
        <p className="text-[color:var(--fg-muted)] mt-1">{t('intro')}</p>
      </div>

      <section className="card" aria-labelledby="twofa-heading">
        <div className="flex items-start gap-4">
          <span
            className={`w-12 h-12 rounded-full grid place-items-center shrink-0 ${
              enabled ? 'bg-[color:var(--color-success)]/12 text-[color:var(--color-success)]' : 'bg-[color:var(--bg-soft)] text-[color:var(--fg-muted)]'
            }`}
          >
            {enabled ? <ShieldCheck aria-hidden className="w-6 h-6" /> : <ShieldOff aria-hidden className="w-6 h-6" />}
          </span>
          <div className="flex-1 min-w-0">
            <h2 id="twofa-heading" className="text-lg font-extrabold flex items-center gap-2 flex-wrap">
              {t('twoFactor')}
              <span className={enabled ? 'badge-soft !bg-[color:var(--color-success)]/12 !text-[color:var(--color-success)]' : 'badge-soft !bg-[color:var(--bg-soft)] !text-[color:var(--fg-muted)]'}>
                {enabled ? t('on') : t('off')}
              </span>
            </h2>
            <p className="text-sm text-[color:var(--fg-muted)] mt-1">{t('twoFactorBody')}</p>
          </div>
        </div>

        <div className="mt-6">
          {/* ─── Off: start setup ─── */}
          {!enabled && step === 'idle' && (
            <button type="button" onClick={startSetup} disabled={busy} className="btn-primary">
              {busy ? <Loader2 aria-hidden className="w-4 h-4 animate-spin" /> : <KeyRound aria-hidden className="w-4 h-4" />}
              {t('setUp')}
            </button>
          )}

          {/* ─── Scan + confirm ─── */}
          {!enabled && step === 'scan' && setup && (
            <div className="grid gap-6 md:grid-cols-[220px_minmax(0,1fr)] items-start">
              <div className="rounded-[var(--radius-card)] border border-[color:var(--border)] bg-white p-3">
                {/* eslint-disable-next-line @next/next/no-img-element -- a data: URL, nothing for next/image to optimise */}
                <img src={setup.qrCodeDataUrl} alt={t('qrAlt')} className="w-full h-auto" />
              </div>
              <div className="space-y-4">
                <ol className="list-decimal pl-5 space-y-1.5 text-sm">
                  <li>{t('step1')}</li>
                  <li>{t('step2')}</li>
                  <li>{t('step3')}</li>
                </ol>
                <div>
                  <div className="text-xs font-semibold text-[color:var(--fg-muted)] mb-1">{t('manualKey')}</div>
                  <div className="flex items-center gap-2">
                    <code className="flex-1 min-w-0 truncate rounded-[var(--radius-ctl)] bg-[color:var(--bg-soft)] px-3 py-2 font-mono text-sm select-all">
                      {setup.secret}
                    </code>
                    <CopyButton text={setup.secret} label={t('copy')} copiedLabel={t('copied')} />
                  </div>
                </div>
                <form
                  onSubmit={(e) => {
                    e.preventDefault();
                    confirmEnable();
                  }}
                  className="flex flex-wrap items-end gap-3"
                >
                  <label className="block">
                    <span className="block text-[13px] font-semibold mb-1.5">{t('enterCode')}</span>
                    <input
                      value={code}
                      onChange={(e) => setCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                      inputMode="numeric"
                      autoComplete="one-time-code"
                      className="input !w-40 font-mono text-lg tracking-[0.3em] text-center"
                      placeholder="000000"
                      aria-invalid={!!error}
                    />
                  </label>
                  <button type="submit" disabled={busy || code.length !== 6} className="btn-primary h-[46px]">
                    {busy && <Loader2 aria-hidden className="w-4 h-4 animate-spin" />}
                    {t('confirm')}
                  </button>
                  <button type="button" onClick={() => setStep('idle')} className="btn-ghost h-[46px]">
                    {t('cancel')}
                  </button>
                </form>
              </div>
            </div>
          )}

          {/* ─── Recovery codes, shown once ─── */}
          {step === 'codes' && (
            <div className="space-y-4">
              <div role="alert" className="rounded-[var(--radius-ctl)] border border-[#f79009]/40 bg-[#fffaeb] p-4 text-sm">
                <strong className="block mb-1">{t('codesTitle')}</strong>
                {t('codesBody')}
              </div>
              <ul className="grid grid-cols-2 sm:grid-cols-5 gap-2 font-mono text-sm">
                {recoveryCodes.map((c) => (
                  <li key={c} className="rounded-[var(--radius-ctl)] bg-[color:var(--bg-soft)] px-3 py-2 text-center select-all">
                    {c}
                  </li>
                ))}
              </ul>
              <div className="flex flex-wrap gap-2">
                <CopyButton text={codesText} label={t('copyAll')} copiedLabel={t('copied')} wide />
                <button
                  type="button"
                  className="btn-ghost"
                  onClick={() => {
                    const url = URL.createObjectURL(new Blob([`${codesText}\n`], { type: 'text/plain' }));
                    const a = Object.assign(document.createElement('a'), { href: url, download: 'drikon-recovery-codes.txt' });
                    a.click();
                    URL.revokeObjectURL(url);
                  }}
                >
                  <Download aria-hidden className="w-4 h-4" /> {t('download')}
                </button>
                <button type="button" className="btn-primary" onClick={() => setStep('idle')}>
                  {t('savedThem')}
                </button>
              </div>
            </div>
          )}

          {/* ─── On: disable ─── */}
          {enabled && step !== 'codes' && (
            <form
              onSubmit={(e) => {
                e.preventDefault();
                disable();
              }}
              className="flex flex-wrap items-end gap-3"
            >
              <label className="block">
                <span className="block text-[13px] font-semibold mb-1.5">{t('disableLabel')}</span>
                <input
                  value={code}
                  onChange={(e) => setCode(e.target.value.trim().slice(0, 10))}
                  autoComplete="one-time-code"
                  className="input !w-56 font-mono"
                  placeholder={t('disablePlaceholder')}
                  aria-invalid={!!error}
                />
              </label>
              <button type="submit" disabled={busy || code.length < 6} className="btn-ghost h-[46px] hover:!border-[color:var(--color-sale)] hover:!text-[color:var(--color-sale)]">
                {busy && <Loader2 aria-hidden className="w-4 h-4 animate-spin" />}
                {t('turnOff')}
              </button>
            </form>
          )}

          {error && (
            <p role="alert" className="mt-3 text-sm font-semibold text-[color:var(--color-sale)]">
              {error}
            </p>
          )}
        </div>
      </section>

      <section className="card flex flex-wrap items-center gap-4" aria-labelledby="sessions-heading">
        <div className="flex-1 min-w-[16rem]">
          <h2 id="sessions-heading" className="text-lg font-extrabold">{t('sessions')}</h2>
          <p className="text-sm text-[color:var(--fg-muted)] mt-1">{t('sessionsBody')}</p>
        </div>
        <button
          type="button"
          disabled={busy}
          className="btn-ghost"
          onClick={() =>
            run(async () => {
              await apiPost('/api/v1/auth/logout-everywhere');
              // The API already cleared this session's cookies, so the local
              // logout's own request is expected to fail — only its state reset matters.
              await logout().catch(() => {});
              window.location.assign('/login');
            })
          }
        >
          <LogOut aria-hidden className="w-4 h-4" /> {t('signOutEverywhere')}
        </button>
      </section>
    </div>
  );
}

function CopyButton({ text, label, copiedLabel, wide }: { text: string; label: string; copiedLabel: string; wide?: boolean }) {
  const [copied, setCopied] = useState(false);
  return (
    <button
      type="button"
      className={wide ? 'btn-ghost' : 'btn-ghost !px-3 !py-2'}
      onClick={async () => {
        await navigator.clipboard.writeText(text);
        setCopied(true);
        setTimeout(() => setCopied(false), 1800);
      }}
    >
      {copied ? <Check aria-hidden className="w-4 h-4 text-[color:var(--color-success)]" /> : <Copy aria-hidden className="w-4 h-4" />}
      {wide || copied ? (copied ? copiedLabel : label) : <span className="sr-only">{label}</span>}
    </button>
  );
}
