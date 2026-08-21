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

interface NavBrand {
  id: string;
  name: string;
  slug: string;
}

/** Cached per request — feeds the mega-menu without a client fetch flash. */
export const getCategories = cache(async (): Promise<NavCategory[]> => {
  try {
    const [cats, brands] = await Promise.all([
      apiGet<NavCategory[]>('/api/v1/categories'),
      apiGet<NavBrand[]>('/api/v1/brands').catch(() => []),
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
