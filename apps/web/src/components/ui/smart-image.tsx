import NextImage, { type ImageProps } from 'next/image';

/**
 * Hosts the Next image optimizer will fetch from. Set in next.config (one
 * source of truth) and inlined here at build time.
 */
const OPTIMIZED_HOSTS = (process.env.IMAGE_HOSTS ?? '').split(',').filter(Boolean);

/** True for local paths and allow-listed hosts (".example.com" entries match subdomains). */
export function canOptimize(src: ImageProps['src']): boolean {
  if (typeof src !== 'string') return true; // static import
  if (src.startsWith('/') && !src.startsWith('//')) return true;
  try {
    const host = new URL(src).hostname;
    return OPTIMIZED_HOSTS.some((h) => (h.startsWith('.') ? host.endsWith(h) || host === h.slice(1) : host === h));
  } catch {
    return false;
  }
}

/**
 * Drop-in for next/image. Allow-listed images go through the optimizer; images
 * from any other host (admins paste URLs from anywhere) load straight from their
 * source instead of being refused.
 *
 * This is what lets next.config restrict `remotePatterns`. It used to allow
 * `https://**`, which turned /_next/image into an open proxy: anyone could run
 * any image on the internet through the optimizer on your hosting bill.
 */
export default function Image(props: ImageProps) {
  return <NextImage {...props} unoptimized={props.unoptimized ?? !canOptimize(props.src)} />;
}
