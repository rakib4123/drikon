import { cache } from 'react';
import { apiGet } from './api-client';

export interface NavCategory {
  id: string;
  name: string;
  slug: string;
  description?: string | null;
  nameBn?: string | null;
  descriptionBn?: string | null;
  imageUrl?: string | null;
  parentId?: string | null;
  _count?: { products: number };
}

export interface NavBrand {
  id: string;
  name: string;
  slug: string;
  logoUrl?: string | null;
  _count?: { products: number };
}

/** Cached per request — feeds the mega-menu without a client fetch flash. */
export const getCategories = cache(async (): Promise<NavCategory[]> => {
  try {
    const [cats, brands] = await Promise.all([
      apiGet<NavCategory[]>('/api/v1/categories', { revalidate: 300 }),
      apiGet<NavBrand[]>('/api/v1/brands', { revalidate: 300 }).catch(() => []),
    ]);

    const smart = cats.find(c => c.slug === 'smartphones');
    if (smart) {
      smart.name = 'Mobile';

      const brandCats = brands.map(b => ({
        id: `virtual-brand-${b.id}`,
        name: b.name,
        slug: `smartphones&brand=${b.slug}`,
        parentId: smart.id,
      }));

      return [...cats, ...brandCats];
    }

    return cats;
  } catch {
    return [];
  }
});

/**
 * Cached per request — feeds the Shop menu's "top brands" column. Sorted by
 * product count (most-stocked first) rather than the alphabetical order the
 * API returns, since "top" here means prominence, not A–Z.
 */
export const getTopBrands = cache(async (limit = 6): Promise<NavBrand[]> => {
  try {
    const brands = await apiGet<NavBrand[]>('/api/v1/brands', { revalidate: 300 });
    return [...brands]
      .sort((a, b) => (b._count?.products ?? 0) - (a._count?.products ?? 0))
      .slice(0, limit);
  } catch {
    return [];
  }
});
