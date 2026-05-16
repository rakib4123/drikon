'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuthStore } from '@/store/auth-store';
import { LogOut, ShoppingBag, Settings, ShieldCheck } from 'lucide-react';

export default function DashboardPage() {
  const router = useRouter();
  const { user, initialized, fetchMe, logout } = useAuthStore();

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

      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
        <DashCard icon={<ShoppingBag className="w-5 h-5" />} title="Orders" href="/dashboard/orders">
          Track shipments, request returns, download invoices.
        </DashCard>
        <DashCard icon={<Settings className="w-5 h-5" />} title="Profile" href="/dashboard/profile">
          Update your name, phone, and shipping addresses.
        </DashCard>
        <DashCard icon={<ShieldCheck className="w-5 h-5" />} title="Security" href="/dashboard/security">
          Manage 2FA, devices, and active sessions.
        </DashCard>
      </div>

      <button
        type="button"
        onClick={async () => {
          await logout();
          router.push('/');
          router.refresh();
        }}
        className="btn-ghost mt-10 inline-flex"
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
