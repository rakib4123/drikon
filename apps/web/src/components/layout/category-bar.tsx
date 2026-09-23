'use client';

import Link from 'next/link';
import { Suspense, useEffect, useState } from 'react';
import { usePathname, useSearchParams } from 'next/navigation';
import { LayoutDashboard } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { useIsAdmin } from '@/store/auth-store';
import { MegaMenu } from '@/components/layout/mega-menu';
import type { NavCategory, NavBrand } from '@/lib/catalog';

type CategoryLinkDef = { href: string; label: string };

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
  const isAdmin = useIsAdmin();
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  const links: CategoryLinkDef[] = [
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
          {/* useSearchParams() opts its subtree out of static rendering unless
              wrapped in Suspense — scoping that to just this leaf (rather than
              reading it in CategoryBar itself, which sits in the root layout
              above every route) keeps the rest of the app on its current
              rendering mode. The fallback renders the same links with nothing
              marked active, so there's no layout shift while it resolves. */}
          <Suspense fallback={<CategoryLinkList links={links} activeHref={null} />}>
            <ActiveCategoryLinkList links={links} />
          </Suspense>
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

/** Reads the current route so exactly one link — if any — lights up as active. */
function ActiveCategoryLinkList({ links }: { links: CategoryLinkDef[] }) {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const currentQuery = searchParams.toString();
  const activeHref = currentQuery ? `${pathname}?${currentQuery}` : pathname;
  return <CategoryLinkList links={links} activeHref={activeHref} />;
}

/**
 * Compares each link's full href — path *and* query — against the current
 * one, so `/products`, `/products?featured=true`, `/products?sort=newest` and
 * `/products?sort=popular` are mutually exclusive instead of all matching on
 * pathname alone. `/products` with no query means "All products"; it does
 * NOT light up while any of the query-bearing siblings are active.
 */
function isLinkActive(href: string, activeHref: string | null): boolean {
  if (activeHref === null) return false;
  const [path, query = ''] = href.split('?');
  const [activePath, activeQuery = ''] = activeHref.split('?');
  if (path !== activePath) return false;

  const linkParams = new URLSearchParams(query);
  const activeParams = new URLSearchParams(activeQuery);
  const linkEntries = [...linkParams.entries()];
  if (linkEntries.length !== [...activeParams.entries()].length) return false;
  return linkEntries.every(([key, value]) => activeParams.get(key) === value);
}

function CategoryLinkList({ links, activeHref }: { links: CategoryLinkDef[]; activeHref: string | null }) {
  return (
    <>
      {links.map((link) => (
        <CategoryLink key={link.href} href={link.href} active={isLinkActive(link.href, activeHref)}>
          {link.label}
        </CategoryLink>
      ))}
    </>
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
