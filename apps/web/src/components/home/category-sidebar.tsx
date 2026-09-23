import Link from 'next/link';
import { ArrowRight } from 'lucide-react';
import { getLocale, getTranslations } from 'next-intl/server';
import { CategoryIcon } from '@/components/shop/category-icon';
import type { NavCategory } from '@/lib/catalog';
import { localize } from '@/lib/localize';
import type { Locale } from '@/i18n/request';

interface SidebarBrand {
  id: string;
  name: string;
  slug: string;
}

/**
 * The always-open category rail beside the homepage opening row — the
 * classic megastore left column. A black "All categories" header ties it to
 * the header's own category bar, then a dense list (icon, name, count) with
 * an orange left edge on hover, and a footer link out to the full catalogue.
 * Desktop only (`lg+`); phones get `CategoryGrid` further down the page.
 */
export async function CategorySidebar({
  categories,
  brands = [],
}: {
  categories: NavCategory[];
  brands?: SidebarBrand[];
}) {
  const locale = (await getLocale()) as Locale;
  const t = await getTranslations('home');
  const tn = await getTranslations('nav');
  const top = categories.filter((c) => !c.parentId).slice(0, 10);
  if (top.length === 0) return null;
  // Short category lists leave the 260px column looking half-empty next to
  // the hero — fill the remainder with a few top brand chips.
  const brandSlots = top.length <= 7 ? Math.min(brands.length, 8) : 0;

  return (
    <nav
      aria-label={t('allCategories')}
      className="hidden lg:flex flex-col card !p-0 overflow-hidden"
    >
      <div className="bg-[color:var(--color-ink)] px-4 py-3">
        <span className="text-sm font-bold text-white">{t('allCategories')}</span>
      </div>
      <ul className="flex-1 py-1.5">
        {top.map((c) => {
          const count = c._count?.products;
          return (
            <li key={c.id}>
              <Link
                href={`/products?category=${c.slug}`}
                className="group flex min-h-[44px] items-center gap-3 border-l-[3px] border-transparent px-[calc(1rem-3px)] py-2 text-sm font-medium transition-colors hover:border-[color:var(--accent-2)] hover:bg-[color:var(--bg-soft)]"
              >
                <CategoryIcon
                  slug={c.slug}
                  className="h-[18px] w-[18px] shrink-0 text-[color:var(--fg-muted)] transition-colors group-hover:text-[color:var(--accent)]"
                />
                <span className="min-w-0 flex-1 truncate">{localize(c.name, c.nameBn, locale)}</span>
                {count !== undefined && (
                  <span className="shrink-0 text-xs text-[color:var(--fg-muted)]">{count}</span>
                )}
              </Link>
            </li>
          );
        })}
      </ul>
      {brandSlots > 0 && (
        <div className="border-t border-[color:var(--border)] px-4 py-3">
          <div className="mb-2 text-2xs font-bold uppercase tracking-wide text-[color:var(--fg-muted)]">
            {t('topBrands')}
          </div>
          <ul className="flex flex-wrap gap-1.5">
            {brands.slice(0, brandSlots).map((b) => (
              <li key={b.id}>
                <Link
                  href={`/products?brand=${b.slug}`}
                  className="inline-block rounded-md border border-[color:var(--border)] px-2.5 py-1 text-xs font-semibold transition-colors hover:border-[color:var(--accent)] hover:text-[color:var(--accent)]"
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
        className="mt-auto flex min-h-[45px] items-center gap-2 border-t border-[color:var(--border)] px-4 py-3 text-sm font-bold text-[color:var(--accent)] transition-colors hover:bg-[color:var(--bg-soft)]"
      >
        {tn('allProducts')} <ArrowRight aria-hidden className="h-3.5 w-3.5" />
      </Link>
    </nav>
  );
}
