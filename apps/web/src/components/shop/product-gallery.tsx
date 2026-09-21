'use client';

import { useState } from 'react';
import { ProductThumb } from './product-thumb';

interface GalleryImage {
  url: string;
  alt?: string | null;
}

/**
 * Product image gallery: large image plus a thumbnail strip. The product page
 * used to show only the first image even though the API returns them all.
 *
 * Thumbnails are real buttons with aria-pressed, so the gallery is fully
 * keyboard-operable.
 */
export function ProductGallery({
  images,
  name,
  badge,
}: {
  images: GalleryImage[];
  name: string;
  badge?: React.ReactNode;
}) {
  const [active, setActive] = useState(0);
  const current = images[active];

  return (
    <div className="flex flex-col-reverse sm:flex-row gap-3">
      {images.length > 1 && (
        <ul className="flex sm:flex-col gap-2 overflow-x-auto sm:overflow-visible scrollbar-none shrink-0">
          {images.slice(0, 6).map((img, i) => (
            <li key={img.url} className="shrink-0">
              <button
                type="button"
                onClick={() => setActive(i)}
                aria-pressed={active === i}
                aria-label={`${name} — ${i + 1} / ${images.length}`}
                className={`relative block w-16 h-16 sm:w-[72px] sm:h-[72px] rounded-[var(--radius-ctl)] overflow-hidden border-2 transition-colors [background:var(--image-well)] ${
                  active === i ? 'border-[color:var(--accent)]' : 'border-[color:var(--border)] hover:border-[color:var(--fg-muted)]'
                }`}
              >
                <ProductThumb src={img.url} sizes="72px" />
              </button>
            </li>
          ))}
        </ul>
      )}

      <div className="relative flex-1 aspect-square rounded-[var(--radius-card)] overflow-hidden border border-[color:var(--border)] [background:var(--image-well)]">
        <ProductThumb
          // Keyed by URL so a failed image's fallback doesn't stick to the next one.
          key={current?.url}
          src={current?.url}
          alt={current?.alt ?? name}
          priority={active === 0}
          sizes="(min-width: 1024px) 45vw, 100vw"
        />
        {badge && <div className="absolute top-3 left-3 flex flex-col items-start gap-1.5">{badge}</div>}
      </div>
    </div>
  );
}
