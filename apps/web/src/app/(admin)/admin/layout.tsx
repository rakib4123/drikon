'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Loader2 } from 'lucide-react';
import { useAuthStore, useIsAdmin } from '@/store/auth-store';
import { AdminSidebar } from '@/components/admin/admin-sidebar';

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const { user, initialized, fetchMe } = useAuthStore();
  const isAdmin = useIsAdmin();

  useEffect(() => {
    if (!initialized) fetchMe();
  }, [initialized, fetchMe]);

  useEffect(() => {
    if (initialized && !user) router.push('/login?next=/admin');
    else if (initialized && user && !isAdmin) router.push('/');
  }, [initialized, user, isAdmin, router]);

  if (!initialized || !user) {
    return (
      <div className="min-h-[calc(100vh-4rem)] grid place-items-center">
        <Loader2 className="w-6 h-6 animate-spin text-[color:var(--accent)]" />
      </div>
    );
  }
  if (!isAdmin) {
    return (
      <div className="min-h-[calc(100vh-4rem)] grid place-items-center text-center px-6">
        <div>
          <h1 className="display text-3xl mb-2">Not authorized</h1>
          <p className="text-sm text-[color:var(--fg-muted)]">Redirecting…</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col lg:flex-row">
      <AdminSidebar />
      <main className="flex-1 min-w-0">
        {children}
      </main>
    </div>
  );
}
