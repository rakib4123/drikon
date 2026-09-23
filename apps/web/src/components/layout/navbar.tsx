'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { ShoppingCart, User, Heart, GitCompare } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { useAuthStore } from '@/store/auth-store';
import { useCartStore } from '@/store/cart-store';
import { useWishlistStore } from '@/store/wishlist-store';
import { useCompareStore } from '@/store/compare-store';
import { SearchCommand } from '@/components/shop/search-command';
import { BrandMark } from '@/components/layout/brand-mark';
import { MobileMenu } from '@/components/layout/mobile-menu';
import { CountBadge } from '@/components/layout/count-badge';
import { HeaderSearch } from '@/components/layout/header-search';
import { formatPrice } from '@/lib/utils';
import type { BrandInfo } from '@/lib/settings';
import type { NavCategory } from '@/lib/catalog';

/**
 * White header row: sticky, full-width, with a hairline border and a shadow
 * once the page has scrolled past it. The category tree and its mega menu
 * live below in `CategoryBar`, and the utility links (track order, support,
 * language) live above in `TopBar` — this row is just brand · search ·
 * account actions.
 *
 * Counts read from persisted client stores, so they render only after mount
 * to avoid a server/client hydration mismatch.
 */
export function Navbar({ brand, categories }: { brand: BrandInfo; categories: NavCategory[] }) {
  const [mounted, setMounted] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const t = useTranslations('nav');
  const user = useAuthStore((s) => s.user);
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

  // Drop shadow only once the white row has something to separate itself
  // from — flush against the top bar/hero it reads as one flat surface.
  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 4);
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  const firstName = user?.name?.split(' ')[0];

  return (
    <header
      className={`sticky top-0 z-40 bg-white border-b border-[color:var(--border)] transition-shadow ${
        scrolled ? 'shadow-[0_2px_10px_rgba(10,12,20,0.08)]' : ''
      }`}
    >
      <div className="shell flex h-16 lg:h-[76px] items-center gap-3 lg:gap-6">
        <div className="flex items-center gap-1 shrink-0">
          <BrandMark brand={brand} />
        </div>

        <div className="hidden lg:block flex-1 min-w-0">
          <HeaderSearch />
        </div>

        {/* Desktop account actions */}
        <div className="hidden lg:flex items-center gap-1 sm:gap-2 ml-auto shrink-0">
          <Link
            href={user ? '/dashboard' : '/login'}
            className="flex items-center gap-2.5 pl-1 pr-2 py-1.5 rounded-[var(--radius-ctl)] hover:bg-[color:var(--bg-soft)] transition-colors"
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

          <HeaderIcon href="/compare" label={t('compare')}>
            <GitCompare className="w-5 h-5 text-[color:var(--fg)] group-hover:text-[color:var(--accent-2)] transition-colors" />
            {mounted && <CountBadge count={compareCount} />}
          </HeaderIcon>

          <HeaderIcon href="/wishlist" label={t('wishlist')}>
            <Heart className="w-5 h-5 text-[color:var(--fg)] group-hover:text-[color:var(--accent-2)] transition-colors" />
            {mounted && <CountBadge count={wishlistCount} />}
          </HeaderIcon>

          <Link
            href="/cart"
            aria-label={t('cart')}
            className="group flex items-center gap-2.5 pl-2 pr-1 py-1.5 min-h-[45px] rounded-[var(--radius-ctl)] hover:bg-[color:var(--bg-soft)] transition-colors"
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
        </div>

        {/* Mobile: search icon, cart, menu button — every control a 44px+ box. */}
        <div className="lg:hidden flex items-center gap-1 ml-auto shrink-0">
          <SearchCommand />

          <Link
            href="/cart"
            aria-label={t('cart')}
            className="relative min-h-[45px] min-w-[45px] grid place-items-center rounded-[var(--radius-ctl)] hover:bg-[color:var(--bg-soft)] transition-colors"
          >
            <ShoppingCart className="w-5 h-5 text-[color:var(--fg)]" />
            {mounted && <CountBadge count={cartCount} />}
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
      className={`group relative inline-flex items-center justify-center w-11 h-11 rounded-[var(--radius-ctl)] hover:bg-[color:var(--bg-soft)] transition-colors ${className}`}
    >
      {children}
    </Link>
  );
}
