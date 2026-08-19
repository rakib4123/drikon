'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  LayoutDashboard,
  ShoppingCart,
  Package,
  Tags,
  Tag,
  Star,
  Users,
  Ticket,
  Zap,
  Sparkles,
  GalleryHorizontalEnd,
  Settings as SettingsIcon,
} from 'lucide-react';

type NavItem = {
  href: string;
  label: string;
  icon: typeof LayoutDashboard;
  exact?: boolean;
  soon?: boolean;
};

const NAV: NavItem[] = [
  { href: '/admin', label: 'Overview', icon: LayoutDashboard, exact: true },
  { href: '/admin/banners', label: 'Hero banners', icon: GalleryHorizontalEnd },
  { href: '/admin/orders', label: 'Orders', icon: ShoppingCart },
  { href: '/admin/products', label: 'Products', icon: Package },
  { href: '/admin/categories', label: 'Categories', icon: Tags },
  { href: '/admin/brands', label: 'Brands', icon: Tag },
  { href: '/admin/reviews', label: 'Reviews', icon: Star },
  { href: '/admin/users', label: 'Users', icon: Users },
  { href: '/admin/coupons', label: 'Coupons', icon: Ticket },
  { href: '/admin/flash-sales', label: 'Flash sales', icon: Zap },
  { href: '/admin/recommendations', label: 'Recommendations', icon: Sparkles },
  { href: '/admin/settings', label: 'Settings', icon: SettingsIcon },
];

export function AdminSidebar() {
  const pathname = usePathname();

  return (
    <aside
      className="lg:w-60 lg:shrink-0 lg:min-h-[calc(100vh-4rem)] lg:sticky lg:top-16 glass
                 border-b lg:border-b-0 lg:border-r border-[color:var(--border)]
                 sticky top-16 z-20"
    >
      <div className="px-3 lg:px-4 py-2 lg:py-6">
        <div className="hidden lg:block text-xs font-mono uppercase tracking-[0.2em] text-[color:var(--accent)] mb-4 px-3">
          Admin
        </div>
        {/* Horizontal scroll on mobile, vertical list on desktop */}
        <nav className="flex lg:flex-col gap-1 lg:gap-0.5 overflow-x-auto lg:overflow-visible -mx-1 px-1 lg:mx-0 lg:px-0 scrollbar-none">
          {NAV.map((item) => {
            const Icon = item.icon;
            const active = item.exact
              ? pathname === item.href
              : pathname.startsWith(item.href);
            if (item.soon) {
              return (
                <span
                  key={item.href}
                  title="Coming soon"
                  className="flex items-center gap-2 lg:gap-3 px-3 py-2 rounded-lg text-sm text-[color:var(--fg-muted)] opacity-50 cursor-not-allowed shrink-0 whitespace-nowrap"
                >
                  <Icon className="w-4 h-4" />
                  {item.label}
                </span>
              );
            }
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`relative flex items-center gap-2 lg:gap-3 px-3 py-2 rounded-lg text-sm transition-colors shrink-0 whitespace-nowrap ${
                  active
                    ? 'bg-[color:var(--accent)]/10 text-[color:var(--accent)] font-medium'
                    : 'text-[color:var(--fg-muted)] hover:text-[color:var(--fg)] hover:bg-[color:var(--bg-soft)]/60'
                }`}
              >
                {active && (
                  <span className="hidden lg:block absolute left-0 top-1.5 bottom-1.5 w-0.5 rounded-full bg-[color:var(--accent)] shadow-[0_0_8px_var(--glow)]" />
                )}
                <Icon className="w-4 h-4" />
                {item.label}
              </Link>
            );
          })}
        </nav>
      </div>
    </aside>
  );
}
