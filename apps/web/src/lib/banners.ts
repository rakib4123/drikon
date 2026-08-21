import { cache } from 'react';
import { apiGet } from './api-client';

export interface Banner {
  id: string;
  heading: string;
  subheading?: string | null;
  headingBn?: string | null;
  subheadingBn?: string | null;
  imageUrl?: string | null;
  ctaLabel?: string | null;
  ctaHref?: string | null;
  position: number;
  isActive: boolean;
}

/** Active hero slides, cached per request. */
export const getBanners = cache(async (): Promise<Banner[]> => {
  try {
    return await apiGet<Banner[]>('/api/v1/banners/active');
  } catch {
    return [];
  }
});
