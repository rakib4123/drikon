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
  ScrollText,
  Settings as SettingsIcon,
  Store,
  type LucideIcon,
} from 'lucide-react';
import { BrandMark } from '@/components/layout/brand-mark';
import { useBrand } from '@/components/layout/settings-context';

export interface AdminNavItem {
  href: string;
  label: string;
  icon: LucideIcon;
  exact?: boolean;
}

/** Grouped by what an admin is trying to do, rather than one long flat list. */
export const ADMIN_NAV: { group: string | null; items: AdminNavItem[] }[] = [
  { group: null, items: [{ href: '/admin', label: 'Overview', icon: LayoutDashboard, exact: true }] },
  {
    group: 'Sales',
    items: [
      { href: '/admin/orders', label: 'Orders', icon: ShoppingCart },
      { href: '/admin/coupons', label: 'Coupons', icon: Ticket },
      { href: '/admin/flash-sales', label: 'Flash sales', icon: Zap },
    ],
  },
  {
    group: 'Catalogue',
    items: [
      { href: '/admin/products', label: 'Products', icon: Package },
      { href: '/admin/categories', label: 'Categories', icon: Tags },
      { href: '/admin/brands', label: 'Brands', icon: Tag },
      { href: '/admin/banners', label: 'Hero banners', icon: GalleryHorizontalEnd },
    ],
  },
  {
    group: 'Customers',
    items: [
      { href: '/admin/users', label: 'Users', icon: Users },
      { href: '/admin/reviews', label: 'Reviews', icon: Star },
    ],
  },
  {
    group: 'Insights',
    items: [
      { href: '/admin/recommendations', label: 'Recommendations', icon: Sparkles },
      { href: '/admin/audit-log', label: 'Audit log', icon: ScrollText },
    ],
  },
  { group: 'Store', items: [{ href: '/admin/settings', label: 'Settings', icon: SettingsIcon }] },
];

export function isActive(pathname: string, item: AdminNavItem) {
  return item.exact ? pathname === item.href : pathname.startsWith(item.href);
}

/** The navy admin rail. `onNavigate` lets the mobile drawer close after a click. */
export function AdminSidebar({ onNavigate }: { onNavigate?: () => void }) {
  const pathname = usePathname();
  const brand = useBrand();

  return (
    <div className="flex h-full flex-col bg-[color:var(--color-ink)] text-white/75">
      <div className="h-16 shrink-0 flex items-center px-5 border-b border-white/10">
        <BrandMark brand={brand} href="/admin" inverted />
      </div>

      <nav aria-label="Admin" className="flex-1 overflow-y-auto px-3 py-4 space-y-5">
        {ADMIN_NAV.map((section) => (
          <div key={section.group ?? 'root'}>
            {section.group && (
              <div className="px-3 mb-1.5 text-[10.5px] font-bold uppercase tracking-[0.12em] text-white/40">
                {section.group}
              </div>
            )}
            <ul className="space-y-0.5">
              {section.items.map((item) => {
                const Icon = item.icon;
                const active = isActive(pathname, item);
                return (
                  <li key={item.href}>
                    <Link
                      href={item.href}
                      onClick={onNavigate}
                      aria-current={active ? 'page' : undefined}
                      className={`relative flex items-center gap-3 rounded-[var(--radius-ctl)] px-3 py-2 text-[13.5px] font-medium transition-colors ${
                        active ? 'bg-[color:var(--accent)] text-[color:var(--accent-fg)]' : 'hover:bg-white/8 hover:text-white'
                      }`}
                    >
                      <Icon aria-hidden className="w-[18px] h-[18px] shrink-0" />
                      {item.label}
                    </Link>
                  </li>
                );
              })}
            </ul>
          </div>
        ))}
      </nav>

      <div className="shrink-0 p-3 border-t border-white/10">
        <Link
          href="/"
          onClick={onNavigate}
          className="flex items-center gap-3 rounded-[var(--radius-ctl)] px-3 py-2 text-[13.5px] font-medium hover:bg-white/8 hover:text-white transition-colors"
        >
          <Store aria-hidden className="w-[18px] h-[18px]" /> Back to store
        </Link>
      </div>
    </div>
  );
}
