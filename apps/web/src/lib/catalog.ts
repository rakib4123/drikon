import { cache } from 'react';
import { apiGet } from './api-client';

export interface NavCategory {
  id: string;
  name: string;
  slug: string;
  description?: string | null;
  imageUrl?: string | null;
  parentId?: string | null;
  _count?: { products: number };
}

/** Cached per request — feeds the mega-menu without a client fetch flash. */
export const getCategories = cache(async (): Promise<NavCategory[]> => {
  try {
    return await apiGet<NavCategory[]>('/api/v1/categories');
  } catch {
    return [];
  }
});
