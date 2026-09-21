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
import { formatPrice } from '@/lib/utils';
import type { BrandInfo } from '@/lib/settings';
import type { NavCategory } from '@/lib/catalog';

/**
 * Megastore header: a white main row (brand · search · account/wishlist/
 * compare/cart) above a category bar. Both rows stick together, so search and
 * the category menu stay reachable while scrolling a long catalogue.
 *
 * Counts read from persisted client stores, so they render only after mount to
 * avoid a server/client hydration mismatch.
 */
export function Navbar({ brand, categories }: { brand: BrandInfo; categories: NavCategory[] }) {
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
    <header className="sticky top-0 z-40 bg-[color:var(--surface-solid)]/90 backdrop-blur-md shadow-[0_1px_0_var(--border)]">
      {/* ─── Main row ─── */}
      <div className="shell h-16 md:h-[76px] flex items-center gap-3 md:gap-6">
        <div className="flex items-center gap-1 shrink-0">
          <MobileMenu brand={brand} categories={categories} />
          <BrandMark brand={brand} />
        </div>

        <div className="hidden md:block flex-1 max-w-2xl mx-auto">
          <HeaderSearch />
        </div>

        <div className="ml-auto md:ml-0 flex items-center gap-1 sm:gap-2 shrink-0">
          {/* Always mounted for ⌘K and voice search; its own trigger stays hidden
              because every width now shows a real search field. */}
          <div className="hidden">
            <SearchCommand />
          </div>

          <Link
            href={user ? '/dashboard' : '/login'}
            className="hidden lg:flex items-center gap-2.5 pl-1 pr-2 py-1.5 rounded-lg hover:bg-[color:var(--bg-soft)] transition-colors"
          >
            <span className="w-9 h-9 rounded-full border border-[color:var(--border)] grid place-items-center">
              <User className="w-[18px] h-[18px]" />
            </span>
            <span className="leading-tight">
              <span className="block text-[11px] text-[color:var(--fg-muted)]">
                {mounted && firstName ? t('hello', { name: firstName }) : t('helloSignIn')}
              </span>
              <span className="block text-[13px] font-bold">{mounted && user ? t('myAccount') : t('accountAndOrders')}</span>
            </span>
          </Link>

          <HeaderIcon href="/compare" label={t('compare')} className="hidden md:inline-flex">
            <GitCompare className="w-[21px] h-[21px]" />
            {mounted && <CountBadge count={compareCount} className="bg-[color:var(--fg)] text-[color:var(--accent-fg)]" />}
          </HeaderIcon>

          <HeaderIcon href="/wishlist" label={t('wishlist')} className="hidden sm:inline-flex">
            <Heart className="w-[21px] h-[21px]" />
            {mounted && <CountBadge count={wishlistCount} className="bg-[color:var(--color-sale)]" />}
          </HeaderIcon>

          <Link href="/cart" aria-label={t('cart')} className="flex items-center gap-2.5 pl-2 pr-1 py-1.5 rounded-lg hover:bg-[color:var(--bg-soft)] transition-colors">
            <span className="relative">
              <ShoppingCart className="w-6 h-6" />
              {mounted && <CountBadge count={cartCount} className="bg-[color:var(--accent)] text-[color:var(--accent-fg)]" />}
            </span>
            <span className="hidden xl:block leading-tight">
              <span className="block text-[11px] text-[color:var(--fg-muted)]">{t('cart')}</span>
              <span className="block text-[13px] font-bold">
                {mounted ? formatPrice(cartTotal, cartCurrency) : formatPrice(0, 'BDT')}
              </span>
            </span>
          </Link>
        </div>
      </div>

      {/* ─── Phone search row: megastores keep search visible on mobile too ─── */}
      <div className="md:hidden shell pb-3">
        <HeaderSearch />
      </div>

      {/* ─── Category bar ─── */}
      <nav aria-label={t('mainNavigation')} className="hidden lg:block bg-[color:var(--accent)] text-[color:var(--accent-fg)]">
        <div className="shell h-12 flex items-stretch gap-6">
          <MegaMenu categories={categories} />
          <ul className="flex items-center gap-1 text-[13.5px] font-semibold">
            <NavItem href="/">{t('home')}</NavItem>
            <NavItem href="/products">{t('allProducts')}</NavItem>
            <NavItem href="/showcase">{t('featured')}</NavItem>
            <NavItem href="/products?sort=popular">{t('bestSellers')}</NavItem>
            <NavItem href="/products?sort=newest">{t('newArrivals')}</NavItem>
            <NavItem href="/orders">{t('trackOrder')}</NavItem>
          </ul>
          {mounted && isAdmin && (
            <Link
              href="/admin"
              className="ml-auto self-center inline-flex items-center gap-1.5 rounded-md bg-white/15 hover:bg-white/25 px-3 py-1.5 text-[13px] font-bold transition-colors"
            >
              <LayoutDashboard className="w-4 h-4" /> {t('admin')}
            </Link>
          )}
        </div>
      </nav>
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
      className={`relative items-center justify-center w-11 h-11 rounded-lg hover:bg-[color:var(--bg-soft)] transition-colors ${className}`}
    >
      {children}
    </Link>
  );
}

function NavItem({ href, children }: { href: string; children: React.ReactNode }) {
  return (
    <li>
      <Link href={href} className="px-3 py-2 rounded-md hover:bg-white/15 transition-colors">
        {children}
      </Link>
    </li>
  );
}
