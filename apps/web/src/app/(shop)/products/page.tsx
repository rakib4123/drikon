import Link from 'next/link';
import { apiGet } from '@/lib/api-client';
import { ProductGrid } from '@/components/shop/product-grid';
import type { ProductListResponse } from '@drikon/shared-types';

interface PageProps {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}

export const dynamic = 'force-dynamic';

export default async function ProductsPage({ searchParams }: PageProps) {
  const params = await searchParams;
  const qs = new URLSearchParams();
  for (const [k, v] of Object.entries(params)) {
    if (typeof v === 'string' && v) qs.set(k, v);
  }

  let data: ProductListResponse | null = null;
  let error: string | null = null;
  try {
    data = await apiGet<ProductListResponse>(`/api/v1/products?${qs.toString()}`);
  } catch (e: any) {
    error = e?.message ?? 'Failed to load products';
  }

  const page = parseInt((params.page as string) ?? '1', 10);
  const currentSort = (params.sort as string) ?? 'newest';
  const currentCategory = params.category as string | undefined;
  const currentSearch = params.search as string | undefined;

  return (
    <div className="max-w-7xl mx-auto px-6 py-14">
      <div className="flex items-end justify-between mb-10 flex-wrap gap-4">
        <div>
          <div className="text-xs font-mono uppercase tracking-[0.2em] text-[color:var(--accent)] mb-2">
            {currentSearch ? 'Search' : currentCategory ? currentCategory : 'Shop'}
          </div>
          <h1 className="display text-4xl md:text-5xl">
            {currentSearch
              ? `“${currentSearch}”`
              : currentCategory
                ? capitalize(currentCategory)
                : 'All products'}
          </h1>
          {data && (
            <p className="text-sm text-[color:var(--fg-muted)] mt-2">
              {data.pagination.total} products
            </p>
          )}
        </div>

        {/* ─── Sort ─── */}
        <SortLinks current={currentSort} params={params} />
      </div>

      {/* ─── Quick category chips ─── */}
      <div className="flex flex-wrap gap-2 mb-10">
        <CategoryChip active={!currentCategory} href="/products">All</CategoryChip>
        <CategoryChip active={currentCategory === 'laptops-pcs'} href="/products?category=laptops-pcs">Laptops &amp; PCs</CategoryChip>
        <CategoryChip active={currentCategory === 'components'} href="/products?category=components">Components</CategoryChip>
        <CategoryChip active={currentCategory === 'peripherals'} href="/products?category=peripherals">Peripherals</CategoryChip>
      </div>

      {error ? (
        <div className="card text-center py-16 text-[color:var(--fg-muted)]">
          <p className="font-semibold mb-1">Couldn&apos;t load products.</p>
          <p className="text-xs">{error}</p>
        </div>
      ) : !data || data.items.length === 0 ? (
        <div className="card text-center py-16 text-[color:var(--fg-muted)]">
          <p>No products match those filters yet.</p>
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
                <PageLink params={params} page={page - 1}>← Previous</PageLink>
              )}
              <span className="px-4 py-2 text-sm text-[color:var(--fg-muted)]">
                Page {page} of {data.pagination.totalPages}
              </span>
              {data.pagination.hasNext && (
                <PageLink params={params} page={page + 1}>Next →</PageLink>
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
}: {
  current: string;
  params: Record<string, string | string[] | undefined>;
}) {
  const options: Array<{ value: string; label: string }> = [
    { value: 'newest', label: 'Newest' },
    { value: 'popular', label: 'Most popular' },
    { value: 'price_asc', label: 'Price ↑' },
    { value: 'price_desc', label: 'Price ↓' },
    { value: 'rating', label: 'Top rated' },
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
