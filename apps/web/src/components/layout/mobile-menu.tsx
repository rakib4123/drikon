'use client';

import { useState } from 'react';
import Link from 'next/link';
import * as Accordion from '@radix-ui/react-accordion';
import { useLocale } from 'next-intl';
import { Menu, X, ChevronDown, ChevronRight, Heart, ShoppingBag, LayoutDashboard, Sparkles, Package, GitCompare, PackageSearch } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { LanguageSwitcher } from '@/components/layout/language-switcher';
import { useAuthStore, useIsAdmin } from '@/store/auth-store';
import { useWishlistStore } from '@/store/wishlist-store';
import { BrandMark } from '@/components/layout/brand-mark';
import { Dialog, DialogClose, DialogContent, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import type { BrandInfo } from '@/lib/settings';
import type { NavCategory } from '@/lib/catalog';
import { localize } from '@/lib/localize';
import type { Locale } from '@/i18n/request';

/**
 * Mobile navigation drawer.
 *
 * Was a hand-rolled `createPortal` with a manual `document.body.style.overflow`
 * lock and no focus management — Tab walked straight out of the open drawer into
 * the page behind it. Dialog gives the focus trap, scroll lock, Escape and
 * focus restoration; the mount guard and body-style effect are gone with it.
 *
 * Categories are an Accordion now rather than a flat always-expanded list, so a
 * long catalogue doesn't bury the account links at the bottom of the sheet.
 */
export function MobileMenu({ brand, categories }: { brand: BrandInfo; categories: NavCategory[] }) {
  const locale = useLocale() as Locale;
  const t = useTranslations('nav');
  const [open, setOpen] = useState(false);
  const user = useAuthStore((s) => s.user);
  const isAdmin = useIsAdmin();
  const wishlistCount = useWishlistStore((s) => s.ids.length);

  const topLevel = (categories ?? []).filter((c) => !c.parentId);
  const childrenOf = (id: string) => (categories ?? []).filter((c) => c.parentId === id);
  const close = () => setOpen(false);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <button
          type="button"
          aria-label="Open menu"
          className="md:hidden p-2 -ml-2 rounded-lg hover:bg-[color:var(--bg-soft)] transition-colors"
        >
          <Menu className="w-6 h-6" />
        </button>
      </DialogTrigger>

      <DialogContent variant="drawer-left" className="md:hidden">
        <div className="flex items-center justify-between px-4 h-16 border-b border-[color:var(--border)] shrink-0">
          {/* Titles the dialog for screen readers; the brand mark is the visible label. */}
          <DialogTitle asChild>
            <div>
              <BrandMark brand={brand} href="/" />
            </div>
          </DialogTitle>
          <DialogClose
            aria-label="Close menu"
            className="p-2 rounded-lg hover:bg-[color:var(--bg-soft)] transition-colors"
          >
            <X className="w-5 h-5" />
          </DialogClose>
        </div>

        <nav className="flex-1 overflow-y-auto px-3 py-4">
          <NavLink href="/showcase" icon={<Sparkles className="w-4 h-4" />} onClick={close}>Featured</NavLink>
          <NavLink href="/products" icon={<Package className="w-4 h-4" />} onClick={close}>All products</NavLink>
          {isAdmin && (
            <NavLink href="/admin" icon={<LayoutDashboard className="w-4 h-4" />} onClick={close} accent>Admin</NavLink>
          )}

          {topLevel.length > 0 && (
            <div className="mt-4 pt-4 border-t border-[color:var(--border)]">
              <div className="px-3 text-[11px] font-bold uppercase tracking-wide text-[color:var(--fg-muted)] mb-2">
                Categories
              </div>

              <Accordion.Root type="single" collapsible className="w-full">
                {topLevel.map((cat) => {
                  const kids = childrenOf(cat.id);
                  const name = localize(cat.name, cat.nameBn, locale);

                  // Nothing to expand — a plain link reads better than an
                  // accordion header that opens onto an empty panel.
                  if (kids.length === 0) {
                    return (
                      <Link
                        key={cat.id}
                        href={`/products?category=${cat.slug}`}
                        onClick={close}
                        className="flex items-center justify-between px-3 py-2.5 rounded-lg text-sm font-medium hover:bg-[color:var(--bg-soft)]"
                      >
                        {name}
                        <ChevronRight className="w-4 h-4 text-[color:var(--fg-muted)]" />
                      </Link>
                    );
                  }

                  return (
                    <Accordion.Item key={cat.id} value={cat.id} className="border-none">
                      <Accordion.Header className="m-0">
                        <Accordion.Trigger className="group w-full flex items-center justify-between gap-2 px-3 py-2.5 rounded-lg text-sm font-medium hover:bg-[color:var(--bg-soft)] transition-colors outline-none">
                          {name}
                          <ChevronDown className="w-4 h-4 text-[color:var(--fg-muted)] transition-transform duration-200 group-data-[state=open]:rotate-180" />
                        </Accordion.Trigger>
                      </Accordion.Header>
                      <Accordion.Content className="overflow-hidden data-[state=open]:animate-dk-fade-in">
                        <div className="pl-4 pb-1">
                          <Link
                            href={`/products?category=${cat.slug}`}
                            onClick={close}
                            className="block px-3 py-1.5 rounded-lg text-sm text-[color:var(--accent)] hover:bg-[color:var(--bg-soft)]"
                          >
                            All {name}
                          </Link>
                          {kids.map((k) => (
                            <Link
                              key={k.id}
                              href={`/products?category=${k.slug}`}
                              onClick={close}
                              className="block px-3 py-1.5 rounded-lg text-sm text-[color:var(--fg-muted)] hover:text-[color:var(--fg)] hover:bg-[color:var(--bg-soft)]"
                            >
                              {localize(k.name, k.nameBn, locale)}
                            </Link>
                          ))}
                        </div>
                      </Accordion.Content>
                    </Accordion.Item>
                  );
                })}
              </Accordion.Root>
            </div>
          )}
        </nav>

        <div className="border-t border-[color:var(--border)] px-3 py-3 space-y-1 shrink-0">
          <NavLink href="/wishlist" icon={<Heart className="w-4 h-4" />} onClick={close}>
            {t('wishlist')}{wishlistCount > 0 ? ` (${wishlistCount})` : ''}
          </NavLink>
          <NavLink href="/compare" icon={<GitCompare className="w-4 h-4" />} onClick={close}>{t('compare')}</NavLink>
          <NavLink href="/cart" icon={<ShoppingBag className="w-4 h-4" />} onClick={close}>{t('cart')}</NavLink>
          <NavLink href="/orders" icon={<PackageSearch className="w-4 h-4" />} onClick={close}>{t('trackOrder')}</NavLink>
          {/* The navy utility bar (and its language switch) is hidden on phones. */}
          <div className="px-1.5 pt-1">
            <LanguageSwitcher />
          </div>
          {user ? (
            <Link href="/dashboard" onClick={close} className="btn-ghost w-full mt-2">My account</Link>
          ) : (
            <div className="flex gap-2 mt-2">
              <Link href="/login" onClick={close} className="btn-ghost flex-1">Sign in</Link>
              <Link href="/register" onClick={close} className="btn-primary flex-1">Get started</Link>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
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
