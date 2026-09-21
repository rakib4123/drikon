'use client';

import dynamic from 'next/dynamic';
import { useCallback, useEffect, useState } from 'react';
import { Box, Images, Loader2 } from 'lucide-react';
import { useDeviceTier } from '@/lib/three/use-device-tier';
import { ProductGallery } from './product-gallery';
import { ProductThumb } from './product-thumb';
import { cn } from '@/lib/utils';

type Img = { url: string; alt?: string | null };
type Mode = '3d' | 'photos';
const KEY = 'drikon:viewer-mode';

const ProductViewer3D = dynamic(() => import('@/components/three/product-viewer-3d'), { ssr: false, loading: () => null });

/**
 * Product media with a 3D / Photos switch. 3D shows the .glb model when the
 * product has one, otherwise its photo on a lit plinth. Falls back to the 2D
 * gallery on no WebGL or any 3D failure; the 2D gallery is always one click away.
 */
export function ProductMedia({
  images,
  name,
  badge,
  modelUrl,
  labels,
}: {
  images: Img[];
  name: string;
  badge?: React.ReactNode;
  modelUrl: string | null;
  labels: { view3d: string; photos: string; hint: string };
}) {
  const tier = useDeviceTier();
  const [mode, setMode] = useState<Mode>('3d');
  const [failed, setFailed] = useState(false);
  const [active, setActive] = useState(0);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    try {
      if (localStorage.getItem(KEY) === 'photos') setMode('photos');
    } catch {
      /* storage blocked — default to 3D */
    }
  }, []);

  const choose = (m: Mode) => {
    // A fresh viewer mounts each time we come back to 3D — show the loader
    // again instead of leaving it hidden from the previous mount's onReady.
    if (m === '3d') setReady(false);
    setMode(m);
    try {
      localStorage.setItem(KEY, m);
    } catch {
      /* ignore */
    }
  };
  const onFail = useCallback(() => setFailed(true), []);
  const onReady = useCallback(() => setReady(true), []);

  const can3d = !!tier && tier !== 'none' && !failed && (!!modelUrl || images.length > 0);
  if (!can3d) return <ProductGallery images={images} name={name} badge={badge} />;

  const current = images[active];
  // can3d already excludes null/'none'; TypeScript can't see through the boolean.
  const viewerTier = tier === 'high' ? 'high' : 'low';

  return (
    <div className="flex flex-col gap-3">
      <div role="group" aria-label={name} className="inline-flex self-start rounded-full border border-[color:var(--border)] bg-[color:var(--surface)] p-1">
        {(['3d', 'photos'] as const).map((m) => (
          <button
            key={m}
            type="button"
            aria-pressed={mode === m}
            onClick={() => choose(m)}
            className={cn(
              'inline-flex items-center gap-1.5 rounded-full px-3.5 py-1.5 text-xs font-bold transition-colors',
              mode === m ? 'bg-[color:var(--accent)] text-[color:var(--accent-fg)]' : 'text-[color:var(--fg-muted)] hover:text-[color:var(--fg)]',
            )}
          >
            {m === '3d' ? <Box aria-hidden className="h-3.5 w-3.5" /> : <Images aria-hidden className="h-3.5 w-3.5" />}
            {m === '3d' ? labels.view3d : labels.photos}
          </button>
        ))}
      </div>

      {mode === 'photos' ? (
        <ProductGallery images={images} name={name} badge={badge} />
      ) : (
        <>
          <div className="relative aspect-square overflow-hidden rounded-[var(--radius-card)] border border-[color:var(--border)] bg-[#070914]">
            {!ready && (
              <div className="absolute inset-0 grid place-items-center">
                <div className="absolute inset-0 opacity-40 [background:var(--image-well)]">
                  <ProductThumb src={current?.url} alt={current?.alt ?? name} sizes="(min-width: 1024px) 45vw, 100vw" priority />
                </div>
                <Loader2 aria-hidden className="relative h-8 w-8 animate-spin text-[color:var(--accent)]" />
              </div>
            )}
            <div className="absolute inset-0">
              <ProductViewer3D tier={viewerTier} modelUrl={modelUrl} imageUrl={current?.url ?? null} onFail={onFail} onReady={onReady} />
            </div>
            {badge && <div className="absolute top-3 left-3 flex flex-col items-start gap-1.5 pointer-events-none">{badge}</div>}
            <p className="pointer-events-none absolute bottom-3 inset-x-0 text-center font-mono text-[11px] uppercase tracking-[0.2em] text-[color:var(--fg-muted)]">
              {labels.hint}
            </p>
          </div>
          {!modelUrl && images.length > 1 && (
            <ul className="flex gap-2 overflow-x-auto scrollbar-none">
              {images.slice(0, 6).map((img, i) => (
                <li key={img.url} className="shrink-0">
                  <button
                    type="button"
                    onClick={() => setActive(i)}
                    aria-pressed={active === i}
                    aria-label={`${name} — ${i + 1} / ${images.length}`}
                    className={cn(
                      'relative block h-16 w-16 overflow-hidden rounded-[var(--radius-ctl)] border-2 [background:var(--image-well)]',
                      active === i ? 'border-[color:var(--accent)]' : 'border-[color:var(--border)]',
                    )}
                  >
                    <ProductThumb src={img.url} sizes="64px" />
                  </button>
                </li>
              ))}
            </ul>
          )}
        </>
      )}
    </div>
  );
}
