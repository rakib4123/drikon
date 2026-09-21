import Link from 'next/link';
import Image from '@/components/ui/smart-image';
import { getLocale, getTranslations } from 'next-intl/server';
import { CategoryIcon } from '@/components/shop/category-icon';
import type { NavCategory } from '@/lib/catalog';
import { localize } from '@/lib/localize';
import type { Locale } from '@/i18n/request';
import { SectionHeader } from './section-header';

/** "Shop by category" — round tiles with the category image, or its icon when there's none. */
export async function CategoryGrid({ categories }: { categories: NavCategory[] }) {
  const locale = (await getLocale()) as Locale;
  const t = await getTranslations('home');
  const top = categories.filter((c) => !c.parentId).slice(0, 8);
  if (top.length === 0) return null;

  return (
    <section className="shell py-8" aria-labelledby="shop-by-category">
      <SectionHeader id="shop-by-category" title={t('shopByCategory')} href="/products" linkLabel={t('viewAll')} />
      <ul
        className="grid grid-cols-3 sm:grid-cols-4 lg:[grid-template-columns:repeat(var(--cat-cols),minmax(0,1fr))] gap-3 sm:gap-4"
        // Column count follows the catalogue: five categories fill the row
        // instead of leaving three empty cells in a fixed 8-column grid.
        style={{ '--cat-cols': top.length } as React.CSSProperties}
      >
        {top.map((c) => {
          const count = c._count?.products;
          return (
            <li key={c.id}>
              <Link
                href={`/products?category=${c.slug}`}
                className="group flex flex-col items-center text-center gap-2.5 rounded-[var(--radius-card)] border border-[color:var(--border)] bg-white px-2 py-4
                           hover:border-[color:var(--accent)] hover:shadow-[0_10px_24px_-14px_rgba(16,24,40,0.3)] transition"
              >
                <span className="relative w-16 h-16 sm:w-[72px] sm:h-[72px] rounded-full bg-[color:var(--bg-soft)] grid place-items-center overflow-hidden
                                 group-hover:bg-[color:var(--accent)]/10 transition-colors">
                  {c.imageUrl ? (
                    <Image src={c.imageUrl} alt="" fill sizes="72px" className="object-cover" />
                  ) : (
                    <CategoryIcon
                      slug={c.slug}
                      className="w-7 h-7 text-[color:var(--fg-muted)] group-hover:text-[color:var(--accent)] group-hover:scale-110 transition"
                    />
                  )}
                </span>
                <span className="min-w-0 w-full">
                  <span className="block text-[13px] font-bold leading-tight line-clamp-2 min-h-[2.5em] sm:min-h-0 sm:line-clamp-1 group-hover:text-[color:var(--accent)] transition-colors">
                    {localize(c.name, c.nameBn, locale)}
                  </span>
                  {count !== undefined && (
                    <span className="block text-[11px] text-[color:var(--fg-muted)] mt-0.5">
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
