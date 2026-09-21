'use client';

import { useState } from 'react';
import Image from '@/components/ui/smart-image';
import { Package } from 'lucide-react';

/**
 * Product image with a graceful fallback. Product photos are admin-pasted URLs
 * from anywhere, and they go dead (an Unsplash photo in the seed data already
 * 404s) — without this the browser shows its broken-image icon mid-grid.
 */
export function ProductThumb({
  src,
  sizes,
  className = '',
  dimmed = false,
  alt = '',
  priority = false,
}: {
  src?: string | null;
  sizes: string;
  className?: string;
  dimmed?: boolean;
  /** Empty by default: in cards the product name sits right beside the image. */
  alt?: string;
  /** The largest image on the page (product hero) — preloaded for LCP. */
  priority?: boolean;
}) {
  const [failed, setFailed] = useState(false);

  if (!src || failed) {
    return (
      <div className="w-full h-full bg-drikon-mesh grid place-items-center">
        <Package aria-hidden className="w-10 h-10 text-[color:var(--fg-muted)]/40" />
      </div>
    );
  }

  return (
    <Image
      src={src}
      alt={alt}
      fill
      priority={priority}
      sizes={sizes}
      onError={() => setFailed(true)}
      className={`object-cover ${dimmed ? 'opacity-50 grayscale' : ''} ${className}`}
    />
  );
}
