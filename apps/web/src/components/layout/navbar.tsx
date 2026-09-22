'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { ShoppingCart, User, Heart, GitCompare, LayoutDashboard } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { useAuthStore, useIsAdmin } from '@/store/auth-store';
import { useCartStore } from '@/store/cart-store';
import { useWishlistStore } from '@/store/wishlist-store';
import { useCompareStore } from '@/store/compare-store';
import { SearchCommand } from '@/components/shop/search-command';
import { BrandMark } from '@/components/layout/brand-mark';
import { MegaMenu } from '@/components/layout/mega-menu';
import { MobileMenu } from '@/components/layout/mobile-menu';
import { CountBadge } from '@/components/layout/count-badge';
import { HeaderSearch } from '@/components/layout/header-search';
import { LanguageSwitcher } from '@/components/layout/language-switcher';
import { formatPrice } from '@/lib/utils';
import type { BrandInfo } from '@/lib/settings';
import type { NavCategory, NavBrand } from '@/lib/catalog';

/**
 * Floating cream header: a single rounded pill, sticky with a 12px inset from
 * the top. It replaces the old white main row + full-width accent category
 * bar — the "Shop ▾" mega menu now carries the category tree, so there's no
 * second row at all.
 *
 * Counts read from persisted client stores, so they render only after mount to
 * avoid a server/client hydration mismatch.
 */
export function Navbar({
  brand,
  categories,
  brands = [],
}: {
  brand: BrandInfo;
  categories: NavCategory[];
  /** Top brands shown in the Shop ▾ panel's second column. */
  brands?: NavBrand[];
}) {
  const [mounted, setMounted] = useState(false);
  const t = useTranslations('nav');
  const user = useAuthStore((s) => s.user);
  const isAdmin = useIsAdmin();
  const fetchMe = useAuthStore((s) => s.fetchMe);
  const cartCount = useCartStore((s) => s.items.reduce((n, i) => n + i.quantity, 0));
  const cartTotal = useCartStore((s) => s.items.reduce((n, i) => n + i.unitPrice * i.quantity, 0));
  const cartCurrency = useCartStore((s) => s.items[0]?.currency ?? 'BDT');
  const wishlistCount = useWishlistStore((s) => s.ids.length);
  const compareCount = useCompareStore((s) => s.items.length);
  const fetchWishlist = useWishlistStore((s) => s.fetch);
  const resetWishlist = useWishlistStore((s) => s.reset);

  useEffect(() => {
    setMounted(true);
    fetchMe();
  }, [fetchMe]);

  // Hydrate / clear the wishlist as auth state changes.
  useEffect(() => {
    if (user) fetchWishlist();
    else resetWishlist();
  }, [user, fetchWishlist, resetWishlist]);

  const firstName = user?.name?.split(' ')[0];

  return (
    <header className="sticky top-3 z-40 px-3 sm:px-4">
      <div className="mx-auto flex h-16 max-w-[1320px] items-center gap-3 rounded-full border border-[color:var(--border)] bg-[color:var(--surface-solid)] px-4 shadow-[0_8px_30px_-12px_rgba(28,25,23,0.18)] sm:px-6">
        <div className="flex items-center gap-1 shrink-0">
          <BrandMark brand={brand} />
        </div>

        {/* Desktop nav: Shop ▾ panel, Deals, New, Track order. Below `lg` this
            collapses into the drawer MobileMenu opens. */}
        <nav aria-label={t('mainNavigation')} className="hidden lg:flex items-center gap-1 shrink-0">
          <MegaMenu categories={categories} brands={brands} />
          <NavItem href="/products?featured=true">{t('deals')}</NavItem>
          <NavItem href="/products?sort=newest">{t('new')}</NavItem>
          <NavItem href="/orders">{t('trackOrder')}</NavItem>
          {mounted && isAdmin && (
            <Link
              href="/admin"
              className="ml-1 inline-flex items-center gap-1.5 rounded-full bg-[color:var(--bg-soft)] hover:bg-[color:var(--border)] px-3 py-1.5 text-xs font-bold transition-colors"
            >
              <LayoutDashboard className="w-4 h-4" /> {t('admin')}
            </Link>
          )}
        </nav>

        <div className="hidden lg:block flex-1 min-w-0">
          <HeaderSearch />
        </div>

        {/* Always mounted for ⌘K and voice search; on `lg`+ its own trigger
            stays hidden because the pill search field is visible instead. On
            phones and tablets it IS the visible search entry point. */}
        <div className="lg:hidden">
          <SearchCommand />
        </div>

        <div className="ml-auto flex items-center gap-1 sm:gap-2 shrink-0">
          <span className="hidden lg:inline-flex">
            <LanguageSwitcher />
          </span>

          <Link
            href={user ? '/dashboard' : '/login'}
            className="hidden lg:flex items-center gap-2.5 pl-1 pr-2 py-1.5 rounded-full hover:bg-[color:var(--bg-soft)] transition-colors"
          >
            <span className="w-9 h-9 rounded-full border border-[color:var(--border)] grid place-items-center">
              <User className="w-5 h-5" />
            </span>
            <span className="hidden xl:inline leading-tight">
              <span className="block text-2xs text-[color:var(--fg-muted)]">
                {mounted && firstName ? t('hello', { name: firstName }) : t('helloSignIn')}
              </span>
              <span className="block text-xs font-bold">{mounted && user ? t('myAccount') : t('accountAndOrders')}</span>
            </span>
          </Link>

          <HeaderIcon href="/compare" label={t('compare')} className="hidden lg:inline-flex">
            <GitCompare className="w-5 h-5 text-[color:var(--fg)] group-hover:text-[color:var(--accent-2)] transition-colors" />
            {mounted && <CountBadge count={compareCount} />}
          </HeaderIcon>

          <HeaderIcon href="/wishlist" label={t('wishlist')} className="hidden lg:inline-flex">
            <Heart className="w-5 h-5 text-[color:var(--fg)] group-hover:text-[color:var(--accent-2)] transition-colors" />
            {mounted && <CountBadge count={wishlistCount} />}
          </HeaderIcon>

          <Link
            href="/cart"
            aria-label={t('cart')}
            className="group flex items-center gap-2.5 pl-2 pr-1 py-1.5 rounded-full hover:bg-[color:var(--bg-soft)] transition-colors"
          >
            <span className="relative">
              <ShoppingCart className="w-5 h-5 text-[color:var(--fg)] group-hover:text-[color:var(--accent-2)] transition-colors" />
              {mounted && <CountBadge count={cartCount} />}
            </span>
            <span className="hidden xl:block leading-tight">
              <span className="block text-2xs text-[color:var(--fg-muted)]">{t('cart')}</span>
              <span className="block text-xs font-bold">
                {mounted ? formatPrice(cartTotal, cartCurrency) : formatPrice(0, 'BDT')}
              </span>
            </span>
          </Link>

          <MobileMenu brand={brand} categories={categories} />
        </div>
      </div>
    </header>
  );
}

function HeaderIcon({
  href,
  label,
  className = '',
  children,
}: {
  href: string;
  label: string;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <Link
      href={href}
      aria-label={label}
      title={label}
      className={`group relative items-center justify-center w-11 h-11 rounded-full hover:bg-[color:var(--bg-soft)] transition-colors ${className}`}
    >
      {children}
    </Link>
  );
}

function NavItem({ href, children }: { href: string; children: React.ReactNode }) {
  return (
    <Link
      href={href}
      className="px-3 py-2 rounded-full text-sm font-semibold text-[color:var(--fg)] hover:text-[color:var(--accent-2)] hover:bg-[color:var(--bg-soft)] transition-colors"
    >
      {children}
    </Link>
  );
}
