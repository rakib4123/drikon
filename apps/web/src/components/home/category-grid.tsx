import Link from 'next/link';
import Image from '@/components/ui/smart-image';
import { getLocale, getTranslations } from 'next-intl/server';
import { CategoryIcon } from '@/components/shop/category-icon';
import type { NavCategory } from '@/lib/catalog';
import { localize } from '@/lib/localize';
import type { Locale } from '@/i18n/request';
import { SectionHeader } from './section-header';

/**
 * "Shop by category" — dense auto-fit tiles (icon or photo, name, product
 * count) using the same fluid column floor as the product grids. Hover
 * lifts the card and turns the name red.
 */
export async function CategoryGrid({ categories }: { categories: NavCategory[] }) {
  const locale = (await getLocale()) as Locale;
  const t = await getTranslations('home');
  const top = categories.filter((c) => !c.parentId).slice(0, 10);
  if (top.length === 0) return null;

  return (
    <section className="shell py-8" aria-labelledby="shop-by-category">
      <SectionHeader id="shop-by-category" title={t('shopByCategory')} href="/products" linkLabel={t('viewAll')} />
      {/* Same fluid column floor as `.grid-auto-products`, but `auto-fit`
          instead of `auto-fill`: with only a handful of categories, `auto-fill`
          keeps phantom empty tracks around (so five tiles leave a dead gap on
          a wide screen instead of stretching to fill the row) — `auto-fit`
          collapses them. */}
      <ul
        className="grid gap-3 sm:gap-4"
        style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(clamp(9.5rem, 22vw, 13rem), 1fr))' }}
      >
        {top.map((c) => {
          const count = c._count?.products;
          return (
            <li key={c.id}>
              <Link
                href={`/products?category=${c.slug}`}
                className="card card-hover group flex h-full flex-col items-center gap-3 !p-4 text-center"
              >
                <span className="relative grid h-14 w-14 shrink-0 place-items-center overflow-hidden rounded-full bg-[color:var(--bg-soft)] transition-colors sm:h-16 sm:w-16 group-hover:bg-[color:var(--accent)]/10">
                  {c.imageUrl ? (
                    <Image src={c.imageUrl} alt="" fill sizes="64px" className="object-cover" />
                  ) : (
                    <CategoryIcon
                      slug={c.slug}
                      className="h-7 w-7 text-[color:var(--fg-muted)] transition-colors group-hover:text-[color:var(--accent)]"
                    />
                  )}
                </span>
                <span className="min-w-0">
                  <span className="block text-sm font-bold leading-tight line-clamp-2 transition-colors group-hover:text-[color:var(--accent)]">
                    {localize(c.name, c.nameBn, locale)}
                  </span>
                  {count !== undefined && (
                    <span className="mt-0.5 block text-xs text-[color:var(--fg-muted)]">
                      {t('categoryCount', { count })}
                    </span>
                  )}
                </span>
              </Link>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
