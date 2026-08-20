'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { ShoppingBag, User, Heart } from 'lucide-react';
import { useAuthStore, useIsAdmin } from '@/store/auth-store';
import { useCartStore } from '@/store/cart-store';
import { useWishlistStore } from '@/store/wishlist-store';
import { SearchCommand } from '@/components/shop/search-command';
import { LanguageSwitcher } from '@/components/layout/language-switcher';
import { BrandMark } from '@/components/layout/brand-mark';
import { MegaMenu } from '@/components/layout/mega-menu';
import { MobileMenu } from '@/components/layout/mobile-menu';
import { CountBadge } from '@/components/layout/count-badge';
import type { BrandInfo } from '@/lib/settings';
import type { NavCategory } from '@/lib/catalog';

export function Navbar({ brand, categories }: { brand: BrandInfo; categories: NavCategory[] }) {
  const [mounted, setMounted] = useState(false);
  const user = useAuthStore((s) => s.user);
  const isAdmin = useIsAdmin();
  const fetchMe = useAuthStore((s) => s.fetchMe);
  const cartCount = useCartStore((s) => s.items.reduce((n, i) => n + i.quantity, 0));
  const wishlistCount = useWishlistStore((s) => s.ids.length);
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

  return (
    <header className="sticky top-0 z-40 backdrop-blur-xl bg-[color:var(--bg)]/70 border-b border-[color:var(--border)]">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between gap-2">
        <div className="flex items-center gap-1">
          <MobileMenu brand={brand} categories={categories} />
          <BrandMark brand={brand} />
        </div>

        <nav className="hidden md:flex items-center gap-8 text-sm font-medium">
          <MegaMenu categories={categories} />
          <Link href="/showcase" className="hover:text-[color:var(--accent)] transition-colors">
            Featured
          </Link>
          <Link href="/products" className="hover:text-[color:var(--accent)] transition-colors">
            All products
          </Link>
          {isAdmin && (
            <Link href="/admin" className="text-[color:var(--accent)] hover:underline transition-colors">
              Admin
            </Link>
          )}
        </nav>

        <div className="flex items-center gap-2">
          <LanguageSwitcher />
          <SearchCommand />

          <Link
            href="/wishlist"
            aria-label="Wishlist"
            className="p-2 rounded-lg hover:bg-[color:var(--bg-soft)] transition-colors relative hidden sm:inline-flex"
          >
            <Heart className="w-5 h-5" />
            {mounted && <CountBadge count={wishlistCount} className="bg-rose-500" />}
          </Link>

          <Link
            href="/cart"
            aria-label="Cart"
            className="p-2 rounded-lg hover:bg-[color:var(--bg-soft)] transition-colors relative"
          >
            <ShoppingBag className="w-5 h-5" />
            {mounted && <CountBadge count={cartCount} className="bg-[color:var(--accent)]" />}
          </Link>

          {user ? (
            <Link
              href="/dashboard"
              className="flex items-center gap-2 px-3 py-2 rounded-lg hover:bg-[color:var(--bg-soft)] transition-colors text-sm font-medium"
            >
              <User className="w-4 h-4" />
              <span className="hidden md:inline">{user.name?.split(' ')[0]}</span>
            </Link>
          ) : (
            <div className="hidden sm:flex items-center gap-2">
              <Link href="/login" className="btn-ghost text-sm py-2 px-3">
                Sign in
              </Link>
              <Link href="/register" className="btn-primary text-sm py-2 px-3">
                Get started
              </Link>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
