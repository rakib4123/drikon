'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { RegisterSchema, type RegisterInput } from '@drikon/shared-types';
import { useAuthStore } from '@/store/auth-store';
import { ApiError } from '@/lib/api-client';
import { useBrand } from '@/components/layout/settings-context';
import { ArrowRight, Check, Loader2 } from 'lucide-react';

export default function RegisterPage() {
  const register = useAuthStore((s) => s.register);
  const { siteName } = useBrand();
  const [serverError, setServerError] = useState<string | null>(null);
  const [done, setDone] = useState<string | null>(null);

  const {
    register: rhfRegister,
    handleSubmit,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<RegisterInput>({
    resolver: zodResolver(RegisterSchema),
  });

  const password = watch('password') ?? '';

  const rules = [
    { label: '10+ characters', ok: password.length >= 10 },
    { label: 'Lowercase letter', ok: /[a-z]/.test(password) },
    { label: 'Uppercase letter', ok: /[A-Z]/.test(password) },
    { label: 'A digit', ok: /\d/.test(password) },
    { label: 'A symbol', ok: /[^A-Za-z0-9]/.test(password) },
  ];

  async function onSubmit(values: RegisterInput) {
    setServerError(null);
    try {
      const res = await register(values);
      setDone(res.message);
    } catch (err) {
      setServerError(err instanceof ApiError ? err.message : 'Something went wrong');
    }
  }

  if (done) {
    return (
      <div className="min-h-[calc(100vh-4rem)] grid place-items-center px-6 py-16">
        <div className="card max-w-md text-center">
          <div className="w-12 h-12 mx-auto rounded-full bg-[color:var(--accent)]/15 grid place-items-center text-[color:var(--accent)] mb-4">
            <Check className="w-6 h-6" />
          </div>
          <h2 className="display text-2xl mb-2">Check your email</h2>
          <p className="text-[color:var(--fg-muted)] text-sm">{done}</p>
          <Link href="/login" className="btn-ghost mt-6 inline-flex">
            Back to sign in
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-[calc(100vh-4rem)] grid lg:grid-cols-2">
      <div className="flex items-center justify-center px-6 py-16">
        <div className="w-full max-w-sm">
          <div className="text-xs font-mono uppercase tracking-[0.2em] text-[color:var(--accent)] mb-2">
            Create an account
          </div>
          <h1 className="display text-3xl md:text-4xl mb-8">Welcome to {siteName}</h1>

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4" noValidate>
            <Field label="Full name" error={errors.name?.message}>
              <input
                type="text"
                autoComplete="name"
                {...rhfRegister('name')}
                className="w-full px-4 py-3 rounded-xl bg-[color:var(--bg-soft)] border border-[color:var(--border)] focus:border-[color:var(--accent)] outline-none transition-colors"
              />
            </Field>
            <Field label="Email" error={errors.email?.message}>
              <input
                type="email"
                autoComplete="email"
                {...rhfRegister('email')}
                className="w-full px-4 py-3 rounded-xl bg-[color:var(--bg-soft)] border border-[color:var(--border)] focus:border-[color:var(--accent)] outline-none transition-colors"
              />
            </Field>
            <Field label="Password" error={errors.password?.message}>
              <input
                type="password"
                autoComplete="new-password"
                {...rhfRegister('password')}
                className="w-full px-4 py-3 rounded-xl bg-[color:var(--bg-soft)] border border-[color:var(--border)] focus:border-[color:var(--accent)] outline-none transition-colors"
              />
              <ul className="mt-2 grid grid-cols-2 gap-1 text-xs">
                {rules.map((r) => (
                  <li key={r.label} className={`flex items-center gap-1 ${r.ok ? 'text-[color:var(--accent-2)]' : 'text-[color:var(--fg-muted)]'}`}>
                    <Check className={`w-3 h-3 ${r.ok ? 'opacity-100' : 'opacity-30'}`} />
                    {r.label}
                  </li>
                ))}
              </ul>
            </Field>

            {serverError && (
              <div className="px-4 py-3 rounded-xl bg-red-500/10 border border-red-500/30 text-sm text-red-400">
                {serverError}
              </div>
            )}

            <button type="submit" disabled={isSubmitting} className="btn-primary w-full">
              {isSubmitting ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <>Create account <ArrowRight className="w-4 h-4" /></>
              )}
            </button>

            <p className="text-center text-sm text-[color:var(--fg-muted)] mt-6">
              Already have an account?{' '}
              <Link href="/login" className="text-[color:var(--accent)] font-medium hover:underline">
                Sign in
              </Link>
            </p>
          </form>
        </div>
      </div>

      <div className="hidden lg:block relative bg-drikon-gradient grain">
        <div className="absolute inset-0 grid place-items-center p-16">
          <div className="max-w-md text-white">
            <div className="display text-5xl leading-tight">A marketplace<br />for the curious.</div>
            <p className="mt-6 text-white/80">
              Free to join. No spam, ever. Your data lives in encrypted-at-rest cookies — never in localStorage.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

function Field({ label, error, children }: { label: string; error?: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="block text-sm font-medium mb-1.5">{label}</span>
      {children}
      {error && <span className="block text-xs text-red-400 mt-1">{error}</span>}
    </label>
  );
}
