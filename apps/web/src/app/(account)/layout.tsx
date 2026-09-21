'use client';

import { useEffect } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { LayoutDashboard, Package, Heart, ShieldCheck, LogOut, Loader2, Settings2 } from 'lucide-react';
import { useAuthStore, useIsAdmin } from '@/store/auth-store';

/**
 * Account area shell: sidebar navigation beside the page. Owns the sign-in
 * guard, so dashboard, orders and security don't each re-implement it.
 */
export default function AccountLayout({ children }: { children: React.ReactNode }) {
  const t = useTranslations('account');
  const router = useRouter();
  const pathname = usePathname();
  const { user, initialized, fetchMe, logout } = useAuthStore();
  const isAdmin = useIsAdmin();

  useEffect(() => {
    if (!initialized) fetchMe();
  }, [initialized, fetchMe]);

  useEffect(() => {
    if (initialized && !user) router.replace(`/login?next=${encodeURIComponent(pathname)}`);
  }, [initialized, user, router, pathname]);

  if (!user) {
    return (
      <div className="shell py-24 grid place-items-center text-[color:var(--fg-muted)]">
        <Loader2 aria-label={t('loading')} className="w-6 h-6 animate-spin" />
      </div>
    );
  }

  const links = [
    { href: '/dashboard', label: t('dashboard'), icon: LayoutDashboard, exact: true },
    { href: '/orders', label: t('orders'), icon: Package },
    { href: '/wishlist', label: t('wishlist'), icon: Heart },
    { href: '/security', label: t('security'), icon: ShieldCheck },
    ...(isAdmin ? [{ href: '/admin', label: t('adminPanel'), icon: Settings2 }] : []),
  ];

  return (
    <div className="shell py-6 grid gap-6 lg:grid-cols-[260px_minmax(0,1fr)] items-start">
      <aside className="card !p-0 overflow-hidden">
        <div className="flex items-center gap-3 p-5 bg-[color:var(--color-ink)] text-white">
          <span className="w-11 h-11 rounded-full bg-[color:var(--accent)] grid place-items-center text-lg font-extrabold shrink-0">
            {user.name?.charAt(0)?.toUpperCase() ?? '•'}
          </span>
          <span className="min-w-0">
            <span className="block font-bold truncate">{user.name}</span>
            <span className="block text-xs text-white/60 truncate">{user.email}</span>
          </span>
        </div>
        <nav aria-label={t('accountNavigation')} className="p-2">
          <ul className="flex lg:flex-col gap-1 overflow-x-auto scrollbar-none">
            {links.map(({ href, label, icon: Icon, exact }) => {
              const active = exact ? pathname === href : pathname.startsWith(href);
              return (
                <li key={href} className="shrink-0">
                  <Link
                    href={href}
                    aria-current={active ? 'page' : undefined}
                    className={`flex items-center gap-3 px-3 py-2.5 rounded-[var(--radius-ctl)] text-sm font-semibold whitespace-nowrap transition-colors ${
                      active ? 'bg-[color:var(--accent)]/10 text-[color:var(--accent)]' : 'hover:bg-[color:var(--bg-soft)]'
                    }`}
                  >
                    <Icon aria-hidden className="w-[18px] h-[18px]" />
                    {label}
                  </Link>
                </li>
              );
            })}
            <li className="shrink-0 lg:mt-1 lg:pt-1 lg:border-t border-[color:var(--border)]">
              <button
                type="button"
                onClick={async () => {
                  await logout();
                  // A full navigation, not router.push + refresh: those raced this
                  // layout's own "signed out → /login" redirect and the page stayed
                  // stuck on a spinner. It also drops every cached page that held
                  // this user's data.
                  window.location.assign('/');
                }}
                className="w-full flex items-center gap-3 px-3 py-2.5 rounded-[var(--radius-ctl)] text-sm font-semibold whitespace-nowrap text-[color:var(--fg-muted)] hover:text-[color:var(--color-sale)] hover:bg-[color:var(--color-sale)]/8 transition-colors"
              >
                <LogOut aria-hidden className="w-[18px] h-[18px]" />
                {t('signOut')}
              </button>
            </li>
          </ul>
        </nav>
      </aside>

      <div className="min-w-0">{children}</div>
    </div>
  );
}
