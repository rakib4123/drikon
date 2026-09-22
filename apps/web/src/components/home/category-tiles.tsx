import Link from 'next/link';
import { ArrowRight } from 'lucide-react';
import { getLocale, getTranslations } from 'next-intl/server';
import Image from '@/components/ui/smart-image';
import { CategoryIcon } from '@/components/shop/category-icon';
import { TiltCard } from '@/components/ui/tilt-card';
import { Reveal } from '@/components/ui/reveal';
import type { NavCategory } from '@/lib/catalog';
import { localize } from '@/lib/localize';
import { cn } from '@/lib/utils';
import type { Locale } from '@/i18n/request';
import { SectionHeader } from './section-header';

/**
 * The top 3 categories as large editorial tiles (photo or icon, Fraunces
 * name, "Shop the category"), each with a gentle 5° tilt. A chip row below
 * lists every top-level category for quick browsing.
 */
export async function CategoryTiles({ categories }: { categories: NavCategory[] }) {
  const locale = (await getLocale()) as Locale;
  const t = await getTranslations('home');
  const top = categories.filter((c) => !c.parentId);
  if (top.length === 0) return null;
  const tiles = top.slice(0, 3);

  return (
    <section className="shell py-8 @container" aria-labelledby="shop-by-category">
      <SectionHeader id="shop-by-category" title={t('shopByCategory')} href="/products" linkLabel={t('viewAll')} />
      <div className="grid grid-cols-1 @[34rem]:grid-cols-2 @[52rem]:grid-cols-3 gap-4 sm:gap-5">
        {tiles.map((cat, i) => {
          const count = cat._count?.products;
          return (
            <Reveal key={cat.id} delay={i * 0.08}>
              <TiltCard className="h-full">
                <Link
                  href={`/products?category=${cat.slug}`}
                  className="card card-hover group !p-0 flex h-full flex-col overflow-hidden"
                >
                  <div
                    className={cn(
                      'relative overflow-hidden',
                      cat.imageUrl ? 'aspect-[4/3] [background:var(--image-well)]' : 'h-40',
                    )}
                    style={cat.imageUrl ? undefined : { background: 'radial-gradient(circle at 50% 42%, #fffdf9, #efe9df)' }}
                  >
                    {cat.imageUrl ? (
                      <Image
                        src={cat.imageUrl}
                        alt=""
                        fill
                        sizes="(min-width: 1024px) 30vw, 90vw"
                        className="object-cover transition-transform duration-500 group-hover:scale-105"
                      />
                    ) : (
                      <div className="absolute inset-0 grid place-items-center">
                        <span className="grid h-24 w-24 place-items-center rounded-full bg-[#fffdf9] shadow-[0_6px_18px_-8px_rgba(28,25,23,0.18)] transition-transform duration-500 group-hover:scale-105">
                          <CategoryIcon slug={cat.slug} className="h-16 w-16 text-[color:var(--fg)]" />
                        </span>
                      </div>
                    )}
                  </div>
                  <div className="flex flex-1 flex-col px-5 py-4">
                    <h3 className="font-display text-lg">{localize(cat.name, cat.nameBn, locale)}</h3>
                    {count !== undefined && (
                      <p className="mt-0.5 text-sm text-[color:var(--fg-muted)]">{t('categoryCount', { count })}</p>
                    )}
                    <span className="mt-3 inline-flex items-center gap-1.5 text-sm font-bold text-[color:var(--accent-2)]">
                      {t('shopTheCategory')}
                      <ArrowRight aria-hidden className="h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5" />
                    </span>
                  </div>
                </Link>
              </TiltCard>
            </Reveal>
          );
        })}
      </div>
      <ul className="mt-5 flex flex-wrap gap-2">
        {top.map((cat) => (
          <li key={cat.id}>
            <Link
              href={`/products?category=${cat.slug}`}
              className="inline-flex items-center min-h-[45px] rounded-full border border-[color:var(--border)] bg-[color:var(--surface)] px-4 py-2 text-sm font-semibold transition-colors hover:border-[color:var(--accent-2)] hover:text-[color:var(--accent-2)]"
            >
              {localize(cat.name, cat.nameBn, locale)}
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}
