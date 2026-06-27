import type { MetadataRoute } from 'next';
import { SITE_URL } from '@/lib/site';
import { getCategories } from '@/lib/catalog';
import { apiGet } from '@/lib/api-client';

export const revalidate = 3600; // refresh hourly

type SitemapProduct = { slug: string; updatedAt?: string };

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const base = SITE_URL;

  const staticRoutes: MetadataRoute.Sitemap = [
    { url: `${base}/`, changeFrequency: 'daily', priority: 1 },
    { url: `${base}/products`, changeFrequency: 'daily', priority: 0.9 },
    { url: `${base}/login`, changeFrequency: 'yearly', priority: 0.2 },
    { url: `${base}/register`, changeFrequency: 'yearly', priority: 0.2 },
  ];

  // Best-effort: if the API is unreachable at build time, still emit static routes.
  let products: SitemapProduct[] = [];
  let categories: { slug: string }[] = [];
  try {
    const data = await apiGet<{ items: SitemapProduct[] }>('/api/v1/products?limit=60');
    products = data.items;
  } catch {
    /* ignore */
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
