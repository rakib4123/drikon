'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { ShoppingBag, User, Heart } from 'lucide-react';
import { useAuthStore, useIsAdmin } from '@/store/auth-store';
import { useCartStore } from '@/store/cart-store';
import { useWishlistStore } from '@/store/wishlist-store';
import { SearchCommand } from '@/components/shop/search-command';
import { BrandMark } from '@/components/layout/brand-mark';
import { MegaMenu } from '@/components/layout/mega-menu';
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
      <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
        <BrandMark brand={brand} />

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
          <SearchCommand />

          <Link
            href="/wishlist"
            aria-label="Wishlist"
            className="p-2 rounded-lg hover:bg-[color:var(--bg-soft)] transition-colors relative hidden sm:inline-flex"
          >
            <Heart className="w-5 h-5" />
            {mounted && wishlistCount > 0 && (
              <span className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-rose-500 text-[10px] font-bold text-white grid place-items-center">
                {wishlistCount}
              </span>
            )}
          </Link>

          <Link
            href="/cart"
            aria-label="Cart"
            className="p-2 rounded-lg hover:bg-[color:var(--bg-soft)] transition-colors relative"
          >
            <ShoppingBag className="w-5 h-5" />
            {cartCount > 0 && (
              <span className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-[color:var(--accent)] text-[10px] font-bold text-white grid place-items-center">
                {cartCount}
              </span>
            )}
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
            <>
              <Link href="/login" className="btn-ghost text-sm py-2 px-3">
                Sign in
              </Link>
              <Link href="/register" className="btn-primary text-sm py-2 px-3 hidden sm:inline-flex">
                Get started
              </Link>
            </>
          )}
        </div>
      </div>
    </header>
  );
}
