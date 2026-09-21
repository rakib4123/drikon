'use client';

import dynamic from 'next/dynamic';
import { useEffect, useState } from 'react';
import { useDeviceTier } from '@/lib/three/use-device-tier';

const SpaceBackdrop = dynamic(() => import('./space-backdrop'), { ssr: false, loading: () => null });

/** Fixed layer behind the storefront: CSS space gradient always, WebGL on top once idle. */
export function BackdropLoader() {
  const tier = useDeviceTier();
  const [idle, setIdle] = useState(false);

  useEffect(() => {
    const ric = window.requestIdleCallback ?? ((cb: () => void) => window.setTimeout(cb, 400));
    const cancel = window.cancelIdleCallback ?? window.clearTimeout;
    const id = ric(() => setIdle(true));
    return () => cancel(id);
  }, []);

  return (
    <div aria-hidden data-scene-fallback="backdrop" className="space-fallback fixed inset-0 -z-10 pointer-events-none">
      {idle && tier && tier !== 'none' && (
        <div className="absolute inset-0 animate-dk-fade-in">
          <SpaceBackdrop tier={tier} />
        </div>
      )}
    </div>
  );
}
