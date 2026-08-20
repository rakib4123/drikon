import Link from 'next/link';
import { PackageX, SearchX } from 'lucide-react';
import { getTranslations } from 'next-intl/server';
import { apiGet, ApiError } from '@/lib/api-client';
import { getCategories } from '@/lib/catalog';
import { ProductGrid } from '@/components/shop/product-grid';
import { EmptyState } from '@/components/ui/empty-state';
import type { ProductListResponse } from '@drikon/shared-types';

interface PageProps {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}

export const dynamic = 'force-dynamic';

export default async function ProductsPage({ searchParams }: PageProps) {
  const params = await searchParams;
  const t = await getTranslations('products');
  const qs = new URLSearchParams();
  for (const [k, v] of Object.entries(params)) {
    if (typeof v === 'string' && v) qs.set(k, v);
  }

  let data: ProductListResponse | null = null;
  let error: string | null = null;
  try {
    data = await apiGet<ProductListResponse>(`/api/v1/products?${qs.toString()}`);
  } catch (e) {
    error = e instanceof ApiError ? e.message : t('failedToLoadProducts');
  }

  const allCats = await getCategories();
  const topCats = allCats.filter((c) => !c.parentId).slice(0, 8);

  const page = parseInt((params.page as string) ?? '1', 10);
  const currentSort = (params.sort as string) ?? 'newest';
  const currentCategory = params.category as string | undefined;
  const currentSearch = params.search as string | undefined;

  return (
    <div className="max-w-7xl mx-auto px-6 py-14">
      <div className="flex items-end justify-between mb-10 flex-wrap gap-4">
        <div>
          <div className="text-xs font-mono uppercase tracking-[0.2em] text-[color:var(--accent)] mb-2">
            {currentSearch ? t('search') : currentCategory ? currentCategory : t('shop')}
          </div>
          <h1 className="display text-4xl md:text-5xl">
            {currentSearch
              ? `“${currentSearch}”`
              : currentCategory
                ? capitalize(currentCategory)
                : t('allProducts')}
          </h1>
          {data && (
            <p className="text-sm text-[color:var(--fg-muted)] mt-2">
              {t('productsCount', { count: data.pagination.total })}
            </p>
          )}
        </div>

        {/* ─── Sort ─── */}
        <SortLinks current={currentSort} params={params} t={t} />
      </div>

      {/* ─── Quick category chips ─── */}
      <div className="flex flex-wrap gap-2 mb-10">
        <CategoryChip active={!currentCategory} href="/products">{t('all')}</CategoryChip>
        {topCats.map((c) => (
          <CategoryChip key={c.id} active={currentCategory === c.slug} href={`/products?category=${c.slug}`}>
            {c.name}
          </CategoryChip>
        ))}
      </div>

      {error ? (
        <div className="card !p-0">
          <EmptyState
            icon={<PackageX className="w-6 h-6" />}
            title={t('couldntLoadProducts')}
            description={error}
            action={<Link href="/products" className="btn-primary">{t('tryAgain')}</Link>}
          />
        </div>
      ) : !data || data.items.length === 0 ? (
        <div className="card !p-0">
          <EmptyState
            icon={<SearchX className="w-6 h-6" />}
            title={t('noProductsMatch')}
            description={currentSearch || currentCategory ? t('noResultsForFilters') : t('noProductsYet')}
            action={(currentSearch || currentCategory) && <Link href="/products" className="btn-primary">{t('clearFilters')}</Link>}
          />
        </div>
      ) : (
        <>
          <ProductGrid
            products={data.items}
            className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6"
          />

          {data.pagination.totalPages > 1 && (
            <div className="mt-12 flex items-center justify-center gap-2">
              {data.pagination.hasPrev && (
                <PageLink params={params} page={page - 1}>{t('previous')}</PageLink>
              )}
              <span className="px-4 py-2 text-sm text-[color:var(--fg-muted)]">
                {t('pageOf', { page, totalPages: data.pagination.totalPages })}
              </span>
              {data.pagination.hasNext && (
                <PageLink params={params} page={page + 1}>{t('next')}</PageLink>
              )}
            </div>
          )}
        </>
      )}
    </div>
  );
}

function capitalize(s: string) {
  return s.charAt(0).toUpperCase() + s.slice(1).replace('-', ' ');
}

function CategoryChip({ active, href, children }: { active: boolean; href: string; children: React.ReactNode }) {
  return (
    <Link
      href={href}
      className={`px-4 py-2 rounded-full text-sm font-medium border transition-colors ${
        active
          ? 'bg-[color:var(--fg)] text-[color:var(--bg)] border-[color:var(--fg)]'
          : 'border-[color:var(--border)] hover:border-[color:var(--fg-muted)]'
      }`}
    >
      {children}
    </Link>
  );
}

function SortLinks({
  current,
  params,
  t,
}: {
  current: string;
  params: Record<string, string | string[] | undefined>;
  t: Awaited<ReturnType<typeof getTranslations<'products'>>>;
}) {
  const options: Array<{ value: string; label: string }> = [
    { value: 'newest', label: t('sortNewest') },
    { value: 'popular', label: t('sortPopular') },
    { value: 'price_asc', label: t('sortPriceAsc') },
    { value: 'price_desc', label: t('sortPriceDesc') },
    { value: 'rating', label: t('sortRating') },
  ];
  return (
    <div className="flex gap-1.5 text-sm overflow-x-auto scrollbar-none max-w-full [&>*]:shrink-0">
      {options.map((o) => {
        const next = new URLSearchParams();
        for (const [k, v] of Object.entries(params)) {
          if (typeof v === 'string' && v) next.set(k, v);
        }
        next.set('sort', o.value);
        next.delete('page');
        return (
          <Link
            key={o.value}
            href={`/products?${next.toString()}`}
            className={`px-3 py-1.5 rounded-md ${
              current === o.value
                ? 'bg-[color:var(--bg-soft)] text-[color:var(--fg)]'
                : 'text-[color:var(--fg-muted)] hover:text-[color:var(--fg)]'
            }`}
          >
            {o.label}
          </Link>
        );
      })}
    </div>
  );
}

function PageLink({
  params,
  page,
  children,
}: {
  params: Record<string, string | string[] | undefined>;
  page: number;
  children: React.ReactNode;
}) {
  const next = new URLSearchParams();
  for (const [k, v] of Object.entries(params)) {
    if (typeof v === 'string' && v) next.set(k, v);
  }
  next.set('page', String(page));
  return (
    <Link href={`/products?${next.toString()}`} className="btn-ghost text-sm py-2 px-4">
      {children}
    </Link>
  );
}
