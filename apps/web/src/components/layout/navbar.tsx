'use client';

import Link from 'next/link';
import { useTheme } from 'next-themes';
import { useEffect, useState } from 'react';
import { Moon, Sun, ShoppingBag, User } from 'lucide-react';
import { useAuthStore, useIsAdmin } from '@/store/auth-store';
import { useCartStore } from '@/store/cart-store';
import { SearchCommand } from '@/components/shop/search-command';

export function Navbar() {
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);
  const user = useAuthStore((s) => s.user);
  const isAdmin = useIsAdmin();
  const fetchMe = useAuthStore((s) => s.fetchMe);
  const cartCount = useCartStore((s) => s.items.reduce((n, i) => n + i.quantity, 0));

  useEffect(() => {
    setMounted(true);
    fetchMe();
  }, [fetchMe]);

  return (
    <header className="sticky top-0 z-40 backdrop-blur-xl bg-[color:var(--bg)]/70 border-b border-[color:var(--border)]">
      <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
        <Link href="/" className="flex items-center gap-2 group">
          <span
            className="w-8 h-8 rounded-lg bg-gradient-to-br from-indigo-500 to-cyan-500
                       grid place-items-center text-white font-bold shadow-lg shadow-indigo-500/30
                       transition-transform group-hover:scale-110"
            aria-hidden
          >
            দ
          </span>
          <span className="font-display text-xl tracking-tight">Drikon</span>
        </Link>

        <nav className="hidden md:flex items-center gap-8 text-sm font-medium">
          <Link href="/products" className="hover:text-[color:var(--accent)] transition-colors">
            Shop
          </Link>
          <Link href="/products?featured=true" className="hover:text-[color:var(--accent)] transition-colors">
            Featured
          </Link>
          <Link href="/products?category=electronics" className="hover:text-[color:var(--accent)] transition-colors">
            Electronics
          </Link>
          <Link href="/products?category=fashion" className="hover:text-[color:var(--accent)] transition-colors">
            Fashion
          </Link>
          {isAdmin && (
            <Link href="/admin" className="text-[color:var(--accent)] hover:underline transition-colors">
              Admin
            </Link>
          )}
        </nav>

        <div className="flex items-center gap-2">
          <SearchCommand />

          {mounted && (
            <button
              type="button"
              aria-label="Toggle theme"
              onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
              className="p-2 rounded-lg hover:bg-[color:var(--bg-soft)] transition-colors"
            >
              {theme === 'dark' ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
            </button>
          )}

          <Link
            href="/cart"
            aria-label="Cart"
            className="p-2 rounded-lg hover:bg-[color:var(--bg-soft)] transition-colors relative"
          >
            <ShoppingBag className="w-5 h-5" />
            {cartCount > 0 && (
              <span className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-[color:var(--accent-2)] text-[10px] font-bold text-white grid place-items-center">
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
