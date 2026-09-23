'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { usePathname } from 'next/navigation';
import { LayoutDashboard } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { useIsAdmin } from '@/store/auth-store';
import { MegaMenu } from '@/components/layout/mega-menu';
import type { NavCategory, NavBrand } from '@/lib/catalog';

/**
 * Full-width black bar below the header. Owns the "All categories" mega menu
 * plus the fixed set of shortcut links a megastore always keeps one tap away.
 * Hidden below `lg`, where the mobile drawer carries the same links.
 */
export function CategoryBar({
  categories,
  brands,
}: {
  categories: NavCategory[];
  brands: NavBrand[];
}) {
  const t = useTranslations('nav');
  const pathname = usePathname();
  const isAdmin = useIsAdmin();
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  const links = [
    { href: '/', label: t('home') },
    { href: '/products', label: t('allProducts') },
    { href: '/products?featured=true', label: t('deals') },
    { href: '/products?sort=newest', label: t('newArrivals') },
    { href: '/products?sort=popular', label: t('bestSellers') },
    { href: '/orders', label: t('trackOrder') },
  ];

  return (
    <div className="hidden lg:block bg-[color:var(--color-ink)] carbon">
      <div className="shell flex items-stretch h-11">
        <MegaMenu categories={categories} brands={brands} />

        <nav aria-label={t('mainNavigation')} className="flex items-stretch">
          {links.map((link) => (
            <CategoryLink key={link.href} href={link.href} active={pathname === link.href.split('?')[0]}>
              {link.label}
            </CategoryLink>
          ))}
        </nav>

        {mounted && isAdmin && (
          <Link
            href="/admin"
            className="ml-auto self-center inline-flex items-center gap-1.5 rounded-[var(--radius-ctl)] bg-white/10 hover:bg-white/20 px-3 py-1.5 text-xs font-bold text-white transition-colors"
          >
            <LayoutDashboard className="w-4 h-4" /> {t('admin')}
          </Link>
        )}
      </div>
    </div>
  );
}

function CategoryLink({
  href,
  active,
  children,
}: {
  href: string;
  active: boolean;
  children: React.ReactNode;
}) {
  return (
    <Link
      href={href}
      aria-current={active ? 'page' : undefined}
      className={`relative flex items-center px-3 text-sm font-semibold transition-colors
                  after:content-[''] after:absolute after:left-3 after:right-3 after:bottom-1
                  after:h-[3px] after:rounded-full after:origin-left after:scale-x-0
                  after:bg-[color:var(--accent-2)] after:transition-transform after:duration-200
                  hover:text-white hover:after:scale-x-100
                  ${active ? 'text-white after:scale-x-100' : 'text-white/85'}`}
    >
      {children}
    </Link>
  );
}
