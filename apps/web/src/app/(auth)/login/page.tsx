'use client';

import { Suspense, useState } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { LoginSchema, type LoginInput } from '@drikon/shared-types';
import { useAuthStore } from '@/store/auth-store';
import { ApiError } from '@/lib/api-client';
import { useBrand } from '@/components/layout/settings-context';
import { ArrowRight, Loader2 } from 'lucide-react';

function LoginForm() {
  const router = useRouter();
  const search = useSearchParams();
  const login = useAuthStore((s) => s.login);
  const { siteName } = useBrand();
  const [serverError, setServerError] = useState<string | null>(null);
  const [requires2FA, setRequires2FA] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<LoginInput>({
    resolver: zodResolver(LoginSchema),
  });

  async function onSubmit(values: LoginInput) {
    setServerError(null);
    try {
      const { requiresTwoFactor } = await login(values);
      if (requiresTwoFactor) {
        setRequires2FA(true);
        return;
      }
      router.push(search.get('next') ?? '/dashboard');
      router.refresh();
    } catch (err) {
      setServerError(err instanceof ApiError ? err.message : 'Something went wrong');
    }
  }

  return (
    <div className="min-h-[calc(100vh-4rem)] grid lg:grid-cols-2">
      <div className="flex items-center justify-center px-6 py-16">
        <div className="w-full max-w-sm">
          <div className="text-xs font-mono uppercase tracking-[0.2em] text-[color:var(--accent)] mb-2">
            Welcome back
          </div>
          <h1 className="display text-3xl md:text-4xl mb-8">Sign in to {siteName}</h1>

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4" noValidate>
            <Field label="Email" error={errors.email?.message}>
              <input
                type="email"
                autoComplete="email"
                {...register('email')}
                className="w-full px-4 py-3 rounded-xl bg-[color:var(--bg-soft)] border border-[color:var(--border)] focus:border-[color:var(--accent)] outline-none transition-colors"
              />
            </Field>

            <Field label="Password" error={errors.password?.message}>
              <input
                type="password"
                autoComplete="current-password"
                {...register('password')}
                className="w-full px-4 py-3 rounded-xl bg-[color:var(--bg-soft)] border border-[color:var(--border)] focus:border-[color:var(--accent)] outline-none transition-colors"
              />
            </Field>

            {requires2FA && (
              <Field label="6-digit authenticator code" error={errors.twoFactorCode?.message}>
                <input
                  inputMode="numeric"
                  pattern="\d{6}"
                  maxLength={6}
                  autoComplete="one-time-code"
                  {...register('twoFactorCode')}
                  className="w-full px-4 py-3 rounded-xl bg-[color:var(--bg-soft)] border border-[color:var(--border)] focus:border-[color:var(--accent)] outline-none transition-colors font-mono text-center text-xl tracking-[0.5em]"
                />
              </Field>
            )}


            {serverError && (
              <div className="px-4 py-3 rounded-xl bg-red-500/10 border border-red-500/30 text-sm text-red-600">
                {serverError}
              </div>
            )}

            <button type="submit" disabled={isSubmitting} className="btn-primary w-full">
              {isSubmitting ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <>Sign in <ArrowRight className="w-4 h-4" /></>
              )}
            </button>

            <div className="flex items-center gap-3 my-6">
              <div className="flex-1 h-px bg-[color:var(--border)]" />
              <span className="text-xs text-[color:var(--fg-muted)]">or</span>
              <div className="flex-1 h-px bg-[color:var(--border)]" />
            </div>

            <a href={`${process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000'}/api/v1/auth/google`} className="btn-ghost w-full">
              Continue with Google
            </a>

            <p className="text-center text-sm text-[color:var(--fg-muted)] mt-6">
              New to {siteName}?{' '}
              <Link href="/register" className="text-[color:var(--accent)] font-medium hover:underline">
                Create an account
              </Link>
            </p>
          </form>
        </div>
      </div>

      <div className="hidden lg:block relative bg-drikon-gradient grain">
        <div className="absolute inset-0 grid place-items-center p-16">
          <div className="max-w-md text-white">
            <div className="display text-5xl leading-tight">
              Vision,<br />engineered.
            </div>
            <p className="mt-6 text-white/80">
              {siteName} is type-safe end to end, secure by default, and fast everywhere.
              Sign in to pick up your cart and continue where you left off.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-[calc(100vh-4rem)] grid place-items-center">
          <Loader2 className="w-6 h-6 animate-spin text-[color:var(--accent)]" />
        </div>
      }
    >
      <LoginForm />
    </Suspense>
  );
}

function Field({
  label,
  error,
  children,
}: {
  label: string;
  error?: string;
  children: React.ReactNode;
}) {
  return (
    <label className="block">
      <span className="block text-sm font-medium mb-1.5">{label}</span>
      {children}
      {error && <span className="block text-xs text-red-600 mt-1">{error}</span>}
    </label>
  );
}
