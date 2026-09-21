import Link from 'next/link';
import { ChevronRight, LayoutGrid } from 'lucide-react';
import { getLocale, getTranslations } from 'next-intl/server';
import { CategoryIcon } from '@/components/shop/category-icon';
import type { NavCategory } from '@/lib/catalog';
import { localize } from '@/lib/localize';
import type { Locale } from '@/i18n/request';

/**
 * The always-open category list beside the homepage hero. It sits flush under
 * the header's "All categories" button (same 260px width), so the two read as
 * one column — the classic megastore opening layout. Desktop only; phones get
 * the category grid further down.
 */
export async function CategorySidebar({
  categories,
  brands = [],
}: {
  categories: NavCategory[];
  /** Fills the column under a short category list, so it doesn't sit half-empty beside the hero. */
  brands?: { id: string; name: string; slug: string }[];
}) {
  const locale = (await getLocale()) as Locale;
  const t = await getTranslations('nav');
  const th = await getTranslations('home');
  const top = categories.filter((c) => !c.parentId).slice(0, 9);
  // Brands render as wrapping chips (~3 per line). With six or fewer categories
  // there's room for two or three lines of them beside the 420px hero.
  const brandSlots = top.length <= 6 ? Math.min(brands.length, 8) : 0;
  if (top.length === 0) return null;

  return (
    <nav
      aria-label={t('allCategories')}
      className="hidden lg:flex flex-col bg-white border border-t-0 border-[color:var(--border)] rounded-b-[var(--radius-card)]"
    >
      <ul className="py-1.5">
        {top.map((c) => (
          <li key={c.id}>
            <Link
              href={`/products?category=${c.slug}`}
              className="group flex items-center gap-3 px-4 py-[9px] text-sm font-medium hover:text-[color:var(--accent)] hover:bg-[color:var(--bg-soft)] transition-colors"
            >
              <CategoryIcon slug={c.slug} className="w-[18px] h-[18px] text-[color:var(--fg-muted)] group-hover:text-[color:var(--accent)] transition-colors" />
              <span className="flex-1 truncate">{localize(c.name, c.nameBn, locale)}</span>
              <ChevronRight aria-hidden className="w-3.5 h-3.5 opacity-40 group-hover:opacity-100 group-hover:translate-x-0.5 transition" />
            </Link>
          </li>
        ))}
      </ul>
      {brandSlots > 0 && (
        <div className="px-4 pb-3">
          <div className="text-[11px] font-bold uppercase tracking-wide text-[color:var(--fg-muted)] mb-2">
            {th('topBrands')}
          </div>
          <ul className="flex flex-wrap gap-1.5">
            {brands.slice(0, brandSlots).map((b) => (
              <li key={b.id}>
                <Link
                  href={`/products?brand=${b.slug}`}
                  className="inline-block rounded-md border border-[color:var(--border)] px-2.5 py-1 text-xs font-semibold
                             hover:border-[color:var(--accent)] hover:text-[color:var(--accent)] transition-colors"
                >
                  {b.name}
                </Link>
              </li>
            ))}
          </ul>
        </div>
      )}
      <Link
        href="/products"
        className="mt-auto flex items-center gap-3 px-4 py-3 border-t border-[color:var(--border)] text-sm font-bold text-[color:var(--accent)] hover:bg-[color:var(--bg-soft)] transition-colors"
      >
        <LayoutGrid aria-hidden className="w-[18px] h-[18px]" />
        {t('allProducts')}
      </Link>
    </nav>
  );
}
