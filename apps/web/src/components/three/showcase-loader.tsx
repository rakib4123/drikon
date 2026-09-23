'use client';

import dynamic from 'next/dynamic';
import { useDeviceTier } from '@/lib/three/use-device-tier';
import { ProductThumb } from '@/components/shop/product-thumb';
import { cn } from '@/lib/utils';

const ShowcaseScene = dynamic(() => import('./showcase-scene'), { ssr: false });

/**
 * A product on a dark stand. The 2D fallback (photo on a dark disc) renders
 * on the server and on devices without WebGL; the 3D scene replaces it once
 * the device qualifies. Non-interactive — the page always scrolls.
 */
export function ShowcaseLoader({
  name,
  imageUrl,
  modelUrl = null,
  alt,
  className,
}: {
  name: 'spotlight';
  imageUrl: string | null;
  modelUrl?: string | null;
  alt: string;
  className?: string;
}) {
  const tier = useDeviceTier();
  const fallback = (
    <div data-scene-fallback={name} className="relative grid h-full w-full place-items-center">
      <div className="absolute bottom-[12%] h-[16%] w-[62%] rounded-[50%] bg-[color:var(--color-ink-soft)] shadow-[0_18px_30px_-12px_rgba(0,0,0,0.6)]" />
      <div className="relative aspect-square w-[58%] overflow-hidden rounded-[var(--radius-card)]">
        {imageUrl && <ProductThumb src={imageUrl} alt={alt} sizes="(min-width: 1024px) 30vw, 60vw" />}
      </div>
    </div>
  );
  const can3d = !!tier && tier !== 'none' && (!!imageUrl || !!modelUrl);
  return (
    <div className={cn('relative', className)}>
      {can3d ? (
        <ShowcaseScene name={name} tier={tier === 'high' ? 'high' : 'low'} imageUrl={imageUrl} modelUrl={modelUrl} fallback={fallback} />
      ) : (
        fallback
      )}
    </div>
  );
}
