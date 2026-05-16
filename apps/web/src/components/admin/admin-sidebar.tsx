'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { LayoutDashboard, Package, Tags, Users, FileText } from 'lucide-react';

const NAV = [
  { href: '/admin', label: 'Overview', icon: LayoutDashboard, exact: true },
  { href: '/admin/products', label: 'Products', icon: Package },
  { href: '/admin/categories', label: 'Categories', icon: Tags, disabled: true },
  { href: '/admin/users', label: 'Users', icon: Users, disabled: true },
  { href: '/admin/logs', label: 'Audit log', icon: FileText, disabled: true },
];

export function AdminSidebar() {
  const pathname = usePathname();

  return (
    <aside className="w-60 shrink-0 border-r border-[color:var(--border)] min-h-[calc(100vh-4rem)] sticky top-16">
      <div className="px-4 py-6">
        <div className="text-xs font-mono uppercase tracking-[0.2em] text-[color:var(--accent)] mb-4 px-3">
          Admin
        </div>
        <nav className="space-y-0.5">
          {NAV.map((item) => {
            const Icon = item.icon;
            const active = item.exact
              ? pathname === item.href
              : pathname.startsWith(item.href);
            const cls = `flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-colors ${
              active
                ? 'bg-[color:var(--bg-soft)] text-[color:var(--fg)] font-medium'
                : 'text-[color:var(--fg-muted)] hover:text-[color:var(--fg)] hover:bg-[color:var(--bg-soft)]/50'
            } ${item.disabled ? 'opacity-50 cursor-not-allowed' : ''}`;

            return item.disabled ? (
              <span key={item.href} className={cls} title="Coming soon">
                <Icon className="w-4 h-4" />
                {item.label}
                <span className="ml-auto text-[10px] text-[color:var(--fg-muted)]">soon</span>
              </span>
            ) : (
              <Link key={item.href} href={item.href} className={cls}>
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
