import type { MetadataRoute } from 'next';
import { SITE_URL } from '@/lib/site';
import { getCategories } from '@/lib/catalog';
import { apiGet } from '@/lib/api-client';

export const revalidate = 3600; // refresh hourly

type SitemapProduct = { slug: string; updatedAt?: string };

/** 60 × 200 = 12,000 products — far past this catalogue, and bounded so a bad response can't loop forever. */
const MAX_PAGES = 200;

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const base = SITE_URL;

  const staticRoutes: MetadataRoute.Sitemap = [
    { url: `${base}/`, changeFrequency: 'daily', priority: 1 },
    { url: `${base}/products`, changeFrequency: 'daily', priority: 0.9 },
    { url: `${base}/login`, changeFrequency: 'yearly', priority: 0.2 },
    { url: `${base}/register`, changeFrequency: 'yearly', priority: 0.2 },
  ];

  // Best-effort: if the API is unreachable at build time, still emit static routes.
  const products: SitemapProduct[] = [];
  let categories: { slug: string }[] = [];
  try {
    // Page through the whole catalogue. The API caps a page at 60, and this used
    // to fetch just the first page — product 61 onward never reached search engines.
    for (let page = 1; page <= MAX_PAGES; page++) {
      const data = await apiGet<{ items: SitemapProduct[]; pagination: { hasNext: boolean } }>(
        `/api/v1/products?limit=60&page=${page}`,
        { revalidate: 3600 },
      );
      products.push(...data.items);
      if (!data.pagination.hasNext) break;
    }
  } catch {
    /* API unreachable: emit what we have (static routes at minimum). */
  }
  try {
    categories = await getCategories();
  } catch {
    /* ignore */
  }

  return [
    ...staticRoutes,
    ...categories.map((c) => ({
      url: `${base}/products?category=${c.slug}`,
      changeFrequency: 'weekly' as const,
      priority: 0.7,
    })),
    ...products.map((p) => ({
      url: `${base}/products/${p.slug}`,
      lastModified: p.updatedAt ? new Date(p.updatedAt) : undefined,
      changeFrequency: 'weekly' as const,
      priority: 0.8,
    })),
  ];
}
