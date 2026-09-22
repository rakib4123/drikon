'use client';

import { Suspense, useState } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useTranslations } from 'next-intl';
import { ArrowRight, Loader2, ShieldCheck } from 'lucide-react';
import { LoginSchema, type LoginInput } from '@drikon/shared-types';
import { useAuthStore } from '@/store/auth-store';
import { ApiError } from '@/lib/api-client';
import { useBrand } from '@/components/layout/settings-context';
import { AuthShell, AuthField, FormAlert, safeNext } from '@/components/auth/auth-shell';

const API = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000';

/**
 * Sign in. Three states:
 *  - password: email + password (the usual)
 *  - code after password: the API said this account has 2FA, so re-submit with a code
 *  - code after Google (?step=2fa): Google sign-in left a pending cookie; the
 *    code alone finishes it via /auth/2fa/verify
 */
function LoginForm() {
  const t = useTranslations('auth');
  const router = useRouter();
  const search = useSearchParams();
  const login = useAuthStore((s) => s.login);
  const verifyTwoFactor = useAuthStore((s) => s.verifyTwoFactor);
  const { siteName } = useBrand();
  const [serverError, setServerError] = useState<string | null>(null);
  const [requires2FA, setRequires2FA] = useState(false);
  const googlePending = search.get('step') === '2fa';
  const next = safeNext(search.get('next'));

  const googleError = search.get('error');
  const googleErrorMessage =
    googleError === 'unverified_email'
      ? t('errorUnverifiedEmail')
      : googleError === 'locked'
        ? t('errorLocked')
        : googleError
          ? t('errorGoogle')
          : null;

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<LoginInput>({ resolver: zodResolver(LoginSchema) });

  const [pendingCode, setPendingCode] = useState('');
  const [verifying, setVerifying] = useState(false);

  const goOn = () => {
    router.push(next);
    router.refresh();
  };

  async function onSubmit(values: LoginInput) {
    setServerError(null);
    try {
      const { requiresTwoFactor } = await login(values);
      if (requiresTwoFactor) {
        setRequires2FA(true);
        return;
      }
      goOn();
    } catch (err) {
      setServerError(err instanceof ApiError ? err.message : t('genericError'));
    }
  }

  async function onVerifyPending(e: React.FormEvent) {
    e.preventDefault();
    setServerError(null);
    setVerifying(true);
    try {
      await verifyTwoFactor(pendingCode.trim());
      goOn();
    } catch (err) {
      setServerError(err instanceof ApiError ? err.message : t('genericError'));
    } finally {
      setVerifying(false);
    }
  }

  // ─── Google sign-in waiting on the second factor ───
  if (googlePending) {
    return (
      <AuthShell title={t('twoFactorTitle')} subtitle={t('twoFactorSubtitle')}>
        <form onSubmit={onVerifyPending} className="space-y-5" noValidate>
          {serverError && <FormAlert>{serverError}</FormAlert>}
          <AuthField id="pending-code" label={t('codeLabel')}>
            <CodeInput id="pending-code" value={pendingCode} onChange={setPendingCode} />
          </AuthField>
          <button type="submit" disabled={verifying || pendingCode.trim().length < 6} className="btn-primary w-full h-12">
            {verifying ? <Loader2 aria-label={t('verifying')} className="w-4 h-4 animate-spin" /> : t('verify')}
          </button>
          <p className="text-center text-sm">
            <Link href="/login" className="text-[color:var(--accent)] font-semibold hover:underline underline-offset-4">
              {t('startOver')}
            </Link>
          </p>
        </form>
      </AuthShell>
    );
  }

  return (
    <AuthShell title={t('signInTitle', { site: siteName })} subtitle={t('signInSubtitle')}>
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-5" noValidate>
        {googleErrorMessage && <FormAlert>{googleErrorMessage}</FormAlert>}
        {serverError && <FormAlert>{serverError}</FormAlert>}

        {!requires2FA ? (
          <>
            <AuthField id="email" label={t('email')} error={errors.email?.message}>
              <input
                id="email"
                type="email"
                autoComplete="email"
                aria-invalid={!!errors.email}
                aria-describedby={errors.email ? 'email-error' : undefined}
                className="input h-12"
                {...register('email')}
              />
            </AuthField>
            <AuthField
              id="password"
              label={t('password')}
              error={errors.password?.message}
              aside={
                <Link href="/forgot-password" className="inline-flex items-center min-h-[45px] text-xs font-bold text-[color:var(--accent)] hover:underline underline-offset-4">
                  {t('forgotPassword')}
                </Link>
              }
            >
              <input
                id="password"
                type="password"
                autoComplete="current-password"
                aria-invalid={!!errors.password}
                aria-describedby={errors.password ? 'password-error' : undefined}
                className="input h-12"
                {...register('password')}
              />
            </AuthField>
          </>
        ) : (
          <>
            <FormAlert tone="info">
              <span className="inline-flex items-center gap-2">
                <ShieldCheck aria-hidden className="w-4 h-4" /> {t('twoFactorSubtitle')}
              </span>
            </FormAlert>
            <AuthField id="twoFactorCode" label={t('codeLabel')} error={errors.twoFactorCode?.message}>
              <input
                id="twoFactorCode"
                autoFocus
                // Text, not numeric: recovery codes contain a-f. 10 chars fits both.
                inputMode="text"
                autoComplete="one-time-code"
                autoCapitalize="off"
                spellCheck={false}
                maxLength={10}
                placeholder="123456"
                className="input h-12 font-mono text-lg tracking-[0.25em] text-center"
                {...register('twoFactorCode')}
              />
            </AuthField>
          </>
        )}

        <button type="submit" disabled={isSubmitting} className="btn-primary w-full h-12">
          {isSubmitting ? (
            <Loader2 aria-label={t('signingIn')} className="w-4 h-4 animate-spin" />
          ) : (
            <>
              {requires2FA ? t('verify') : t('signIn')} <ArrowRight aria-hidden className="w-4 h-4" />
            </>
          )}
        </button>

        {!requires2FA && (
          <>
            <div className="flex items-center gap-3" aria-hidden>
              <div className="flex-1 h-px bg-[color:var(--border)]" />
              <span className="text-xs font-semibold text-[color:var(--fg-muted)]">{t('or')}</span>
              <div className="flex-1 h-px bg-[color:var(--border)]" />
            </div>
            <a href={`${API}/api/v1/auth/google`} className="btn-ghost w-full h-12">
              <GoogleMark /> {t('continueWithGoogle')}
            </a>
            <p className="text-center text-sm text-[color:var(--fg-muted)]">
              {t('newHere', { site: siteName })}{' '}
              <Link href="/register" className="text-[color:var(--accent)] font-bold hover:underline underline-offset-4">
                {t('createAccount')}
              </Link>
            </p>
          </>
        )}
      </form>
    </AuthShell>
  );
}

function CodeInput({ id, value, onChange }: { id: string; value: string; onChange: (v: string) => void }) {
  return (
    <input
      id={id}
      autoFocus
      value={value}
      onChange={(e) => onChange(e.target.value.trim().slice(0, 10))}
      inputMode="text"
      autoComplete="one-time-code"
      autoCapitalize="off"
      spellCheck={false}
      placeholder="123456"
      className="input h-12 font-mono text-lg tracking-[0.25em] text-center"
    />
  );
}

/** Google's "G" mark, as Google's sign-in branding guidelines require on this button. */
function GoogleMark() {
  return (
    <svg aria-hidden viewBox="0 0 48 48" className="w-[18px] h-[18px]">
      <path fill="#FFC107" d="M43.6 20.5H42V20H24v8h11.3C33.7 32.7 29.2 36 24 36c-6.6 0-12-5.4-12-12s5.4-12 12-12c3.1 0 5.8 1.2 7.9 3.1l5.7-5.7C34 6.1 29.3 4 24 4 12.9 4 4 12.9 4 24s8.9 20 20 20 20-8.9 20-20c0-1.3-.1-2.4-.4-3.5z" />
      <path fill="#FF3D00" d="M6.3 14.7l6.6 4.8C14.7 15.1 19 12 24 12c3.1 0 5.8 1.2 7.9 3.1l5.7-5.7C34 6.1 29.3 4 24 4 16.3 4 9.7 8.3 6.3 14.7z" />
      <path fill="#4CAF50" d="M24 44c5.2 0 9.9-2 13.4-5.2l-6.2-5.2C29.2 35.1 26.7 36 24 36c-5.2 0-9.6-3.3-11.3-8l-6.5 5C9.5 39.6 16.2 44 24 44z" />
      <path fill="#1976D2" d="M43.6 20.5H42V20H24v8h11.3c-.8 2.2-2.2 4.2-4.1 5.6l6.2 5.2C37 39.2 44 34 44 24c0-1.3-.1-2.4-.4-3.5z" />
    </svg>
  );
}

export default function LoginPage() {
  return (
    <Suspense
      fallback={
        <div className="shell py-24 grid place-items-center">
          <Loader2 className="w-6 h-6 animate-spin text-[color:var(--accent)]" />
        </div>
      }
    >
      <LoginForm />
    </Suspense>
  );
}
