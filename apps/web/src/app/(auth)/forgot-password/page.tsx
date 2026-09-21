'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useTranslations } from 'next-intl';
import { Loader2, MailCheck } from 'lucide-react';
import { ForgotPasswordSchema } from '@drikon/shared-types';
import { apiPost, ApiError } from '@/lib/api-client';
import { AuthShell, AuthField, FormAlert } from '@/components/auth/auth-shell';

type Input = { email: string };

/**
 * Request a password-reset email. The reset emails always linked here, but the
 * page didn't exist — a shopper who forgot their password had no way back in.
 */
export default function ForgotPasswordPage() {
  const t = useTranslations('auth');
  const [sentTo, setSentTo] = useState<string | null>(null);
  const [serverError, setServerError] = useState<string | null>(null);
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<Input>({ resolver: zodResolver(ForgotPasswordSchema) });

  async function onSubmit({ email }: Input) {
    setServerError(null);
    try {
      await apiPost('/api/v1/auth/forgot-password', { email });
      setSentTo(email);
    } catch (err) {
      setServerError(err instanceof ApiError ? err.message : t('genericError'));
    }
  }

  if (sentTo) {
    return (
      <AuthShell title={t('checkEmailTitle')}>
        <div className="text-center">
          <div className="w-14 h-14 mx-auto rounded-full bg-[color:var(--accent)]/10 text-[color:var(--accent)] grid place-items-center mb-4">
            <MailCheck aria-hidden className="w-7 h-7" />
          </div>
          {/* Same wording whether or not the account exists — the API does the
              same, so this page can't be used to test which emails are registered. */}
          <p className="text-[color:var(--fg-muted)]">{t('resetSentBody', { email: sentTo })}</p>
          <Link href="/login" className="btn-primary mt-6">{t('backToSignIn')}</Link>
        </div>
      </AuthShell>
    );
  }

  return (
    <AuthShell title={t('forgotTitle')} subtitle={t('forgotSubtitle')}>
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-5" noValidate>
        {serverError && <FormAlert>{serverError}</FormAlert>}
        <AuthField id="email" label={t('email')} error={errors.email?.message}>
          <input id="email" type="email" autoComplete="email" autoFocus aria-invalid={!!errors.email} className="input h-12" {...register('email')} />
        </AuthField>
        <button type="submit" disabled={isSubmitting} className="btn-primary w-full h-12">
          {isSubmitting ? <Loader2 aria-label={t('sending')} className="w-4 h-4 animate-spin" /> : t('sendResetLink')}
        </button>
        <p className="text-center text-sm">
          <Link href="/login" className="text-[color:var(--accent)] font-bold hover:underline underline-offset-4">
            {t('backToSignIn')}
          </Link>
        </p>
      </form>
    </AuthShell>
  );
}
