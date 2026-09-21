import Link from 'next/link';
import { Suspense } from 'react';
import { PackageX, SearchX } from 'lucide-react';
import { getTranslations, getLocale } from 'next-intl/server';
import { apiGet, ApiError } from '@/lib/api-client';
import { getCategories } from '@/lib/catalog';
import { ProductGrid } from '@/components/shop/product-grid';
import { ProductSort } from '@/components/shop/product-sort';
import { FilterPanel, type FilterBrand } from '@/components/shop/filter-panel';
import { ActiveFilters } from '@/components/shop/active-filters';
import { MobileFilters } from '@/components/shop/mobile-filters';
import { EmptyState } from '@/components/ui/empty-state';
import { Breadcrumbs } from '@/components/ui/breadcrumbs';
import { Pagination } from '@/components/ui/pagination';
import { localize } from '@/lib/localize';
import type { Locale } from '@/i18n/request';
import type { ProductListResponse } from '@drikon/shared-types';

interface PageProps {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}

export const dynamic = 'force-dynamic';

const PAGE_SIZE = 20;

export default async function ProductsPage({ searchParams }: PageProps) {
  const params = await searchParams;
  const t = await getTranslations('products');
  const tNav = await getTranslations('nav');
  const locale = (await getLocale()) as Locale;

  const qs = new URLSearchParams();
  for (const [k, v] of Object.entries(params)) {
    if (typeof v === 'string' && v) qs.set(k, v);
  }
  if (!qs.has('limit')) qs.set('limit', String(PAGE_SIZE));

  let data: ProductListResponse | null = null;
  let error: string | null = null;
  try {
    data = await apiGet<ProductListResponse>(`/api/v1/products?${qs.toString()}`, { revalidate: 60 });
  } catch (e) {
    error = e instanceof ApiError ? e.message : t('failedToLoadProducts');
  }

  const [categories, brands] = await Promise.all([
    getCategories(),
    // Feeds the filters; a failure must not take the catalogue page down.
    apiGet<FilterBrand[]>('/api/v1/brands', { revalidate: 300 }).catch(() => [] as FilterBrand[]),
  ]);

  const page = Math.max(1, parseInt((params.page as string) ?? '1', 10) || 1);
  const currentSort = (params.sort as string) ?? 'newest';
  const currentCategory = params.category as string | undefined;
  const currentSearch = params.search as string | undefined;
  const category = categories.find((c) => c.slug === currentCategory);
  const categoryName = category ? localize(category.name, category.nameBn, locale) : undefined;

  const title = currentSearch ? `“${currentSearch}”` : (categoryName ?? t('allProducts'));
  const filtered = !!(currentSearch || currentCategory || params.brand || params.minPrice || params.maxPrice || params.inStock);

  return (
    <div className="shell py-6">
      <Breadcrumbs
        homeLabel={tNav('home')}
        items={[
          { label: t('shop'), href: '/products' },
          ...(currentSearch ? [{ label: t('search') }] : categoryName ? [{ label: categoryName }] : []),
        ]}
      />

      <div className="mt-5 grid gap-6 lg:grid-cols-[260px_minmax(0,1fr)] items-start">
        {/* Filters read the URL via useSearchParams, which needs a Suspense boundary. */}
        <aside className="hidden lg:block card !p-0">
          <Suspense>
            <FilterPanel brands={brands} categories={categories} />
          </Suspense>
        </aside>

        <div className="min-w-0">
          <h1 className="text-2xl md:text-3xl font-extrabold tracking-tight mb-4">{title}</h1>

          <Suspense>
            <div className="card !p-3 mb-3 flex flex-wrap items-center gap-3">
              <MobileFilters brands={brands} categories={categories} />
              {data && data.pagination.total > 0 && (
                <p className="flex-1 min-w-0 text-sm text-[color:var(--fg-muted)]">
                  {t('showingRange', {
                    from: (page - 1) * data.pagination.limit + 1,
                    to: (page - 1) * data.pagination.limit + data.items.length,
                    total: data.pagination.total,
                  })}
                </p>
              )}
              <div className="ml-auto">
                <ProductSort current={currentSort} />
              </div>
            </div>
            <div className="mb-5 empty:mb-2">
              <ActiveFilters brands={brands} categories={categories} />
            </div>
          </Suspense>

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
                description={filtered ? t('noResultsForFilters') : t('noProductsYet')}
                action={filtered && <Link href="/products" className="btn-primary">{t('clearFilters')}</Link>}
              />
            </div>
          ) : (
            <>
              <ProductGrid
                products={data.items}
                className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-3 sm:gap-4"
              />
              <div className="mt-10">
                <Pagination
                  page={page}
                  totalPages={data.pagination.totalPages}
                  params={params}
                  basePath="/products"
                  labels={{
                    previous: t('previous'),
                    next: t('next'),
                    page: (n) => t('goToPage', { page: n }),
                  }}
                />
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
