import type { MetadataRoute } from 'next';
import { SITE_URL } from '@/lib/site';

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: '*',
      allow: '/',
      // Private / user-specific areas shouldn't be indexed.
      disallow: ['/admin', '/dashboard', '/account', '/cart', '/checkout', '/orders', '/wishlist'],
    },
    sitemap: `${SITE_URL}/sitemap.xml`,
    host: SITE_URL,
  };
}
