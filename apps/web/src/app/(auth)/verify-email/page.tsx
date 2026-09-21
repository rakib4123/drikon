'use client';

import { Suspense, useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { Loader2, CheckCircle2, XCircle } from 'lucide-react';
import { apiPost } from '@/lib/api-client';
import { AuthShell } from '@/components/auth/auth-shell';

type State = 'verifying' | 'ok' | 'failed';

/**
 * Landing page for the verification email (/verify-email?token=…). The email
 * always linked here; the page was missing, so no address could be verified.
 */
function Verify() {
  const t = useTranslations('auth');
  const token = useSearchParams().get('token');
  const [state, setState] = useState<State>(token ? 'verifying' : 'failed');
  // Tokens are single-use: React's dev double-invoke must not spend it twice.
  const sent = useRef(false);

  useEffect(() => {
    if (!token || sent.current) return;
    sent.current = true;
    apiPost('/api/v1/auth/verify-email', { token })
      .then(() => setState('ok'))
      .catch(() => setState('failed'));
  }, [token]);

  return (
    <AuthShell title={t('verifyTitle')}>
      <div className="text-center py-4" role="status" aria-live="polite">
        {state === 'verifying' && (
          <>
            <Loader2 aria-hidden className="w-12 h-12 mx-auto animate-spin text-[color:var(--accent)] mb-4" />
            <p className="text-[color:var(--fg-muted)]">{t('verifying')}</p>
          </>
        )}
        {state === 'ok' && (
          <>
            <CheckCircle2 aria-hidden className="w-14 h-14 mx-auto text-[color:var(--color-success)] mb-4" />
            <p className="font-bold text-lg">{t('verifiedTitle')}</p>
            <p className="text-[color:var(--fg-muted)] mt-1">{t('verifiedBody')}</p>
            <Link href="/products" className="btn-primary mt-6">{t('startShopping')}</Link>
          </>
        )}
        {state === 'failed' && (
          <>
            <XCircle aria-hidden className="w-14 h-14 mx-auto text-[color:var(--color-sale)] mb-4" />
            <p className="font-bold text-lg">{t('verifyFailedTitle')}</p>
            <p className="text-[color:var(--fg-muted)] mt-1">{t('verifyFailedBody')}</p>
            <Link href="/login" className="btn-ghost mt-6">{t('backToSignIn')}</Link>
          </>
        )}
      </div>
    </AuthShell>
  );
}

export default function VerifyEmailPage() {
  return (
    <Suspense fallback={<div className="shell py-24" />}>
      <Verify />
    </Suspense>
  );
}
