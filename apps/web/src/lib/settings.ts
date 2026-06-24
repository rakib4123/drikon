import { cache } from 'react';
import type { SiteSettings } from '@drikon/shared-types';
import { apiGet } from './api-client';

export interface BrandInfo {
  siteName: string;
  logoUrl: string | null;
  tagline?: string | null;
}

export const DEFAULT_SETTINGS: SiteSettings = {
  id: 'singleton',
  siteName: 'Drikon',
  tagline: 'Vision, engineered.',
  logoUrl: null,
  faviconUrl: null,
  accentColor: null,
  accentColor2: null,
  supportEmail: null,
  socialFacebook: null,
  socialInstagram: null,
};

/**
 * Server-side fetch of the white-label branding. `cache()` dedupes the call
 * within a single request (layout + generateMetadata share one fetch).
 * Falls back to defaults so the storefront still renders if the API is down.
 */
export const getSettings = cache(async (): Promise<SiteSettings> => {
  try {
    return await apiGet<SiteSettings>('/api/v1/settings');
  } catch {
    return DEFAULT_SETTINGS;
  }
});
