'use client';

import { Suspense, useState } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useTranslations } from 'next-intl';
import { z } from 'zod';
import { Loader2, CheckCircle2 } from 'lucide-react';
import { passwordSchema } from '@drikon/shared-types';
import { apiPost, ApiError } from '@/lib/api-client';
import { AuthShell, AuthField, FormAlert } from '@/components/auth/auth-shell';
import { PasswordRules } from '@/components/auth/password-rules';

/**
 * Set a new password from the emailed link (/reset-password?token=…). Resetting
 * also signs the account out everywhere (the API revokes every session).
 */
function ResetForm() {
  const t = useTranslations('auth');
  const token = useSearchParams().get('token') ?? '';
  const [done, setDone] = useState(false);
  const [serverError, setServerError] = useState<string | null>(null);

  const schema = z
    .object({ password: passwordSchema, confirm: z.string() })
    .refine((v) => v.password === v.confirm, { message: t('passwordsDontMatch'), path: ['confirm'] });
  type Input = z.infer<typeof schema>;

  const {
    register,
    handleSubmit,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<Input>({ resolver: zodResolver(schema) });

  if (!token) {
    return (
      <AuthShell title={t('resetTitle')}>
        <FormAlert>{t('resetLinkInvalid')}</FormAlert>
        <Link href="/forgot-password" className="btn-primary w-full h-12 mt-5">{t('requestNewLink')}</Link>
      </AuthShell>
    );
  }

  if (done) {
    return (
      <AuthShell title={t('resetDoneTitle')}>
        <div className="text-center">
          <CheckCircle2 aria-hidden className="w-14 h-14 mx-auto text-[color:var(--color-success)] mb-4" />
          <p className="text-[color:var(--fg-muted)]">{t('resetDoneBody')}</p>
          <Link href="/login" className="btn-primary mt-6">{t('signIn')}</Link>
        </div>
      </AuthShell>
    );
  }

  async function onSubmit({ password }: Input) {
    setServerError(null);
    try {
      await apiPost('/api/v1/auth/reset-password', { token, password });
      setDone(true);
    } catch (err) {
      setServerError(err instanceof ApiError ? err.message : t('genericError'));
    }
  }

  return (
    <AuthShell title={t('resetTitle')} subtitle={t('resetSubtitle')}>
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-5" noValidate>
        {serverError && (
          <FormAlert>
            {serverError}{' '}
            <Link href="/forgot-password" className="underline underline-offset-4">{t('requestNewLink')}</Link>
          </FormAlert>
        )}
        <AuthField id="password" label={t('newPassword')} error={errors.password?.message}>
          <input id="password" type="password" autoComplete="new-password" autoFocus aria-invalid={!!errors.password} className="input h-12" {...register('password')} />
          <PasswordRules password={watch('password') ?? ''} />
        </AuthField>
        <AuthField id="confirm" label={t('confirmPassword')} error={errors.confirm?.message}>
          <input id="confirm" type="password" autoComplete="new-password" aria-invalid={!!errors.confirm} className="input h-12" {...register('confirm')} />
        </AuthField>
        <button type="submit" disabled={isSubmitting} className="btn-primary w-full h-12">
          {isSubmitting ? <Loader2 aria-label={t('saving')} className="w-4 h-4 animate-spin" /> : t('setNewPassword')}
        </button>
      </form>
    </AuthShell>
  );
}

export default function ResetPasswordPage() {
  return (
    <Suspense fallback={<div className="shell py-24" />}>
      <ResetForm />
    </Suspense>
  );
}
