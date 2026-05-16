'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuthStore, useIsAdmin } from '@/store/auth-store';
import { LogOut, ShoppingBag, LayoutDashboard } from 'lucide-react';

export default function DashboardPage() {
  const router = useRouter();
  const { user, initialized, fetchMe, logout } = useAuthStore();
  const isAdmin = useIsAdmin();

  useEffect(() => {
    if (!initialized) fetchMe();
  }, [initialized, fetchMe]);

  useEffect(() => {
    if (initialized && !user) router.push('/login?next=/dashboard');
  }, [initialized, user, router]);

  if (!user) {
    return (
      <div className="max-w-7xl mx-auto px-6 py-24 text-center text-[color:var(--fg-muted)]">
        Loading…
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto px-6 py-14">
      <div className="text-xs font-mono uppercase tracking-[0.2em] text-[color:var(--accent)] mb-2">
        Your account
      </div>
      <h1 className="display text-4xl md:text-5xl mb-2">Hi, {user?.name?.split(' ')[0]}.</h1>
      <p className="text-[color:var(--fg-muted)] mb-10">{user.email}</p>

      {/* Profile summary card — always visible */}
      <div className="card max-w-xl mb-6">
        <div className="text-xs font-mono uppercase tracking-[0.2em] text-[color:var(--accent)] mb-2">
          Profile
        </div>
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-full bg-[color:var(--bg)] border border-[color:var(--border)] grid place-items-center font-bold text-lg">
            {user?.name?.charAt(0)?.toUpperCase() ?? "?"}
          </div>
          <div className="min-w-0">
            <div className="font-semibold truncate">{user.name}</div>
            <div className="text-sm text-[color:var(--fg-muted)] truncate">{user.email}</div>
            <div className="text-[10px] font-mono uppercase tracking-wider text-[color:var(--accent)] mt-1">
              {user.role === 'SUPER_ADMIN' ? 'Super Admin' : user.role === 'ADMIN' ? 'Admin' : 'Customer'}
            </div>
          </div>
        </div>
      </div>

      {/* Quick links */}
      <div className="grid sm:grid-cols-2 gap-5 max-w-xl mb-10">
        <DashCard icon={<ShoppingBag className="w-5 h-5" />} title="Continue shopping" href="/products">
          Discover new arrivals and curated essentials.
        </DashCard>
        {isAdmin && (
          <DashCard icon={<LayoutDashboard className="w-5 h-5" />} title="Admin panel" href="/admin">
            Manage products, orders, and users.
          </DashCard>
        )}
      </div>

      <button
        type="button"
        onClick={async () => {
          await logout();
          router.push('/');
          router.refresh();
        }}
        className="btn-ghost inline-flex"
      >
        <LogOut className="w-4 h-4" /> Sign out
      </button>
    </div>
  );
}

function DashCard({
  icon,
  title,
  href,
  children,
}: {
  icon: React.ReactNode;
  title: string;
  href: string;
  children: React.ReactNode;
}) {
  return (
    <Link href={href} className="card group">
      <div className="w-10 h-10 rounded-lg bg-[color:var(--bg)] border border-[color:var(--border)] grid place-items-center text-[color:var(--accent)] mb-4 group-hover:bg-[color:var(--accent)] group-hover:text-white group-hover:border-[color:var(--accent)] transition-colors">
        {icon}
      </div>
      <div className="font-semibold mb-1">{title}</div>
      <div className="text-sm text-[color:var(--fg-muted)]">{children}</div>
    </Link>
  );
}
