'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { Loader2, Menu, ExternalLink, LogOut } from 'lucide-react';
import { useAuthStore, useIsAdmin } from '@/store/auth-store';
import { AdminSidebar, ADMIN_NAV, isActive } from '@/components/admin/admin-sidebar';
import { Dialog, DialogContent, DialogTitle, DialogTrigger } from '@/components/ui/dialog';

/**
 * Admin shell: navy sidebar, slim top bar, grey workspace. The storefront's
 * header and footer are suppressed on /admin by SiteChrome, so this owns the
 * whole viewport. The API enforces roles; the redirect here is only UX.
 */
export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const { user, initialized, fetchMe, logout } = useAuthStore();
  const isAdmin = useIsAdmin();
  const [drawer, setDrawer] = useState(false);

  useEffect(() => {
    if (!initialized) fetchMe();
  }, [initialized, fetchMe]);

  useEffect(() => {
    if (initialized && !user) router.push('/login?next=/admin');
    else if (initialized && user && !isAdmin) router.push('/');
  }, [initialized, user, isAdmin, router]);

  if (!initialized || !user || !isAdmin) {
    return (
      <div className="min-h-screen grid place-items-center bg-[color:var(--bg-soft)]">
        <Loader2 aria-label="Loading" className="w-6 h-6 animate-spin text-[color:var(--accent)]" />
      </div>
    );
  }

  const current = ADMIN_NAV.flatMap((s) => s.items).find((i) => isActive(pathname, i));

  return (
    <div className="min-h-screen flex bg-[color:var(--bg-soft)]">
      <aside className="hidden lg:block w-64 shrink-0 sticky top-0 h-screen">
        <AdminSidebar />
      </aside>

      <div className="flex-1 min-w-0 flex flex-col">
        <header className="sticky top-0 z-30 h-16 shrink-0 bg-white border-b border-[color:var(--border)] flex items-center gap-3 px-4 sm:px-6">
          <Dialog open={drawer} onOpenChange={setDrawer}>
            <DialogTrigger asChild>
              <button type="button" aria-label="Open admin menu" className="lg:hidden -ml-1 p-2 rounded-lg hover:bg-[color:var(--bg-soft)]">
                <Menu className="w-5 h-5" />
              </button>
            </DialogTrigger>
            <DialogContent variant="drawer-left" className="!bg-[color:var(--color-ink)] !border-0 !w-72">
              <DialogTitle className="sr-only">Admin menu</DialogTitle>
              <AdminSidebar onNavigate={() => setDrawer(false)} />
            </DialogContent>
          </Dialog>

          <div className="min-w-0">
            <div className="text-[11px] font-semibold uppercase tracking-wide text-[color:var(--fg-muted)]">Admin</div>
            <div className="text-[15px] font-extrabold leading-tight truncate">{current?.label ?? 'Admin'}</div>
          </div>

          <div className="ml-auto flex items-center gap-2 sm:gap-3">
            <Link href="/" target="_blank" className="hidden sm:inline-flex btn-ghost !py-2 !px-3 !text-[13px]">
              View store <ExternalLink aria-hidden className="w-3.5 h-3.5" />
            </Link>
            <div className="flex items-center gap-2.5 pl-2 sm:pl-3 sm:border-l border-[color:var(--border)]">
              <span className="w-9 h-9 rounded-full bg-[color:var(--accent)] text-white grid place-items-center text-sm font-extrabold">
                {user.name?.charAt(0)?.toUpperCase() ?? '•'}
              </span>
              <span className="hidden md:block leading-tight">
                <span className="block text-[13px] font-bold">{user.name}</span>
                <span className="block text-[11px] text-[color:var(--fg-muted)]">
                  {user.role === 'SUPER_ADMIN' ? 'Super admin' : 'Admin'}
                </span>
              </span>
              <button
                type="button"
                aria-label="Sign out"
                title="Sign out"
                onClick={async () => {
                  await logout();
                  // Full navigation — see the account layout's sign-out for why.
                  window.location.assign('/');
                }}
                className="p-2 rounded-lg text-[color:var(--fg-muted)] hover:text-[color:var(--color-sale)] hover:bg-[color:var(--color-sale)]/8 transition-colors"
              >
                <LogOut className="w-[18px] h-[18px]" />
              </button>
            </div>
          </div>
        </header>

        <div className="flex-1 min-w-0">{children}</div>
      </div>
    </div>
  );
}
