'use client';

import dynamic from 'next/dynamic';
import { useDeviceTier } from '@/lib/three/use-device-tier';

/** Module scope so the same static ring covers the dynamic chunk still
 * loading, no-WebGL/low tier, and any in-scene failure (passed to CartOrb's
 * SceneCanvas). */
const cartFallback = (
  <div data-scene-fallback="cart" className="absolute inset-2 rounded-full border-2 border-[color:var(--accent)] shadow-[0_0_24px_var(--glow)]" />
);

const CartOrb = dynamic(() => import('./cart-orb'), { ssr: false, loading: () => cartFallback });

/** Holographic ring around the item count. Decorative — the count is also in the <h1>. */
export function CartOrbLoader({ count }: { count: number }) {
  const tier = useDeviceTier();
  return (
    <div aria-hidden className="relative h-24 w-24 shrink-0">
      {tier && tier !== 'none' ? <CartOrb tier={tier} fallback={cartFallback} /> : cartFallback}
      <span className="absolute inset-0 grid place-items-center font-display text-2xl font-bold text-[color:var(--accent)]">{count}</span>
    </div>
  );
}
