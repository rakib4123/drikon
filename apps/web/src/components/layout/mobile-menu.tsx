'use client';

import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import Link from 'next/link';
import { AnimatePresence, motion } from 'motion/react';
import { Menu, X, ChevronRight, Heart, ShoppingBag, LayoutDashboard, Sparkles, Package } from 'lucide-react';
import { useAuthStore, useIsAdmin } from '@/store/auth-store';
import { useWishlistStore } from '@/store/wishlist-store';
import { BrandMark } from '@/components/layout/brand-mark';
import type { BrandInfo } from '@/lib/settings';
import type { NavCategory } from '@/lib/catalog';

export function MobileMenu({ brand, categories }: { brand: BrandInfo; categories: NavCategory[] }) {
  const [open, setOpen] = useState(false);
  const [mounted, setMounted] = useState(false);
  const user = useAuthStore((s) => s.user);
  const isAdmin = useIsAdmin();
  const wishlistCount = useWishlistStore((s) => s.ids.length);

  useEffect(() => setMounted(true), []);

  const topLevel = (categories ?? []).filter((c) => !c.parentId);
  const childrenOf = (id: string) => (categories ?? []).filter((c) => c.parentId === id);

  useEffect(() => {
    document.body.style.overflow = open ? 'hidden' : '';
    return () => {
      document.body.style.overflow = '';
    };
  }, [open]);

  const close = () => setOpen(false);

  return (
    <>
      <button
        type="button"
        aria-label="Open menu"
        onClick={() => setOpen(true)}
        className="md:hidden p-2 -ml-2 rounded-lg hover:bg-[color:var(--bg-soft)] transition-colors"
      >
        <Menu className="w-6 h-6" />
      </button>

      {mounted &&
        createPortal(
          <AnimatePresence>
            {open && (
          <motion.div
            className="fixed inset-0 z-[80] md:hidden"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            <div className="absolute inset-0 bg-black/50" onClick={close} aria-hidden />
            <motion.aside
              initial={{ x: '-100%' }}
              animate={{ x: 0 }}
              exit={{ x: '-100%' }}
              transition={{ type: 'spring', stiffness: 320, damping: 34 }}
              className="absolute left-0 top-0 bottom-0 w-[84%] max-w-sm bg-[color:var(--bg)] border-r border-[color:var(--border)] flex flex-col shadow-2xl"
            >
              <div className="flex items-center justify-between px-4 h-16 border-b border-[color:var(--border)]">
                <BrandMark brand={brand} href="/" />
                <button type="button" aria-label="Close menu" onClick={close} className="p-2 rounded-lg hover:bg-[color:var(--bg-soft)]">
                  <X className="w-5 h-5" />
                </button>
              </div>

              <nav className="flex-1 overflow-y-auto px-3 py-4">
                <NavLink href="/showcase" icon={<Sparkles className="w-4 h-4" />} onClick={close}>Featured</NavLink>
                <NavLink href="/products" icon={<Package className="w-4 h-4" />} onClick={close}>All products</NavLink>
                {isAdmin && (
                  <NavLink href="/admin" icon={<LayoutDashboard className="w-4 h-4" />} onClick={close} accent>Admin</NavLink>
                )}

                {topLevel.length > 0 && (
                  <div className="mt-4 pt-4 border-t border-[color:var(--border)]">
                    <div className="px-3 text-[11px] font-mono uppercase tracking-[0.2em] text-[color:var(--fg-muted)] mb-2">Categories</div>
                    {topLevel.map((cat) => {
                      const kids = childrenOf(cat.id);
                      return (
                        <div key={cat.id} className="mb-1">
                          <Link href={`/products?category=${cat.slug}`} onClick={close} className="flex items-center justify-between px-3 py-2 rounded-lg text-sm font-medium hover:bg-[color:var(--bg-soft)]">
                            {cat.name}
                            <ChevronRight className="w-4 h-4 text-[color:var(--fg-muted)]" />
                          </Link>
                          {kids.length > 0 && (
                            <div className="pl-4">
                              {kids.map((k) => (
                                <Link key={k.id} href={`/products?category=${k.slug}`} onClick={close} className="block px-3 py-1.5 rounded-lg text-sm text-[color:var(--fg-muted)] hover:text-[color:var(--fg)] hover:bg-[color:var(--bg-soft)]">
                                  {k.name}
                                </Link>
                              ))}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </nav>

              <div className="border-t border-[color:var(--border)] px-3 py-3 space-y-1">
                <NavLink href="/wishlist" icon={<Heart className="w-4 h-4" />} onClick={close}>
                  Wishlist{wishlistCount > 0 ? ` (${wishlistCount})` : ''}
                </NavLink>
                <NavLink href="/cart" icon={<ShoppingBag className="w-4 h-4" />} onClick={close}>Cart</NavLink>
                {user ? (
                  <Link href="/dashboard" onClick={close} className="btn-ghost w-full mt-2">My account</Link>
                ) : (
                  <div className="flex gap-2 mt-2">
                    <Link href="/login" onClick={close} className="btn-ghost flex-1">Sign in</Link>
                    <Link href="/register" onClick={close} className="btn-primary flex-1">Get started</Link>
                  </div>
                )}
              </div>
            </motion.aside>
          </motion.div>
            )}
          </AnimatePresence>,
          document.body,
        )}
    </>
  );
}

function NavLink({
  href,
  icon,
  children,
  onClick,
  accent,
}: {
  href: string;
  icon: React.ReactNode;
  children: React.ReactNode;
  onClick: () => void;
  accent?: boolean;
}) {
  return (
    <Link
      href={href}
      onClick={onClick}
      className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium hover:bg-[color:var(--bg-soft)] ${
        accent ? 'text-[color:var(--accent)]' : ''
      }`}
    >
      {icon}
      {children}
    </Link>
  );
}
