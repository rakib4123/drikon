'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useTranslations } from 'next-intl';
import { ArrowRight, Loader2, MailCheck } from 'lucide-react';
import { RegisterSchema, type RegisterInput } from '@drikon/shared-types';
import { useAuthStore } from '@/store/auth-store';
import { ApiError } from '@/lib/api-client';
import { useBrand } from '@/components/layout/settings-context';
import { AuthShell, AuthField, FormAlert } from '@/components/auth/auth-shell';
import { PasswordRules } from '@/components/auth/password-rules';

export default function RegisterPage() {
  const t = useTranslations('auth');
  const signUp = useAuthStore((s) => s.register);
  const { siteName } = useBrand();
  const [serverError, setServerError] = useState<string | null>(null);
  const [sentTo, setSentTo] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<RegisterInput>({ resolver: zodResolver(RegisterSchema) });

  const password = watch('password') ?? '';

  async function onSubmit(values: RegisterInput) {
    setServerError(null);
    try {
      await signUp(values);
      setSentTo(values.email);
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
          {/* The API answers identically whether or not the address was new, so it
              can't be used to discover who has an account — mirror that here. */}
          <p className="text-[color:var(--fg-muted)]">{t('checkEmailBody', { email: sentTo })}</p>
          <Link href="/login" className="btn-primary mt-6">
            {t('backToSignIn')}
          </Link>
        </div>
      </AuthShell>
    );
  }

  return (
    <AuthShell title={t('registerTitle', { site: siteName })} subtitle={t('registerSubtitle')}>
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-5" noValidate>
        {serverError && <FormAlert>{serverError}</FormAlert>}

        <AuthField id="name" label={t('fullName')} error={errors.name?.message}>
          <input id="name" autoComplete="name" aria-invalid={!!errors.name} className="input h-12" {...register('name')} />
        </AuthField>
        <AuthField id="email" label={t('email')} error={errors.email?.message}>
          <input id="email" type="email" autoComplete="email" aria-invalid={!!errors.email} className="input h-12" {...register('email')} />
        </AuthField>
        <AuthField id="password" label={t('password')} error={errors.password?.message}>
          <input
            id="password"
            type="password"
            autoComplete="new-password"
            aria-invalid={!!errors.password}
            className="input h-12"
            {...register('password')}
          />
          <PasswordRules password={password} />
        </AuthField>

        <button type="submit" disabled={isSubmitting} className="btn-primary w-full h-12">
          {isSubmitting ? (
            <Loader2 aria-label={t('creating')} className="w-4 h-4 animate-spin" />
          ) : (
            <>
              {t('createAccount')} <ArrowRight aria-hidden className="w-4 h-4" />
            </>
          )}
        </button>

        <p className="text-center text-sm text-[color:var(--fg-muted)]">
          {t('haveAccount')}{' '}
          <Link href="/login" className="text-[color:var(--accent)] font-bold hover:underline underline-offset-4">
            {t('signIn')}
          </Link>
        </p>
      </form>
    </AuthShell>
  );
}
