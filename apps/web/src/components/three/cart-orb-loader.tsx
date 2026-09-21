'use client';

import dynamic from 'next/dynamic';
import { useDeviceTier } from '@/lib/three/use-device-tier';

const CartOrb = dynamic(() => import('./cart-orb'), { ssr: false, loading: () => null });

/** Holographic ring around the item count. Decorative — the count is also in the <h1>. */
export function CartOrbLoader({ count }: { count: number }) {
  const tier = useDeviceTier();
  return (
    <div aria-hidden className="relative h-24 w-24 shrink-0">
      {tier && tier !== 'none' ? (
        <CartOrb tier={tier} />
      ) : (
        <div data-scene-fallback="cart" className="absolute inset-2 rounded-full border-2 border-[color:var(--accent)] shadow-[0_0_24px_var(--glow)]" />
      )}
      <span className="absolute inset-0 grid place-items-center font-display text-2xl font-bold text-[color:var(--accent)]">{count}</span>
    </div>
  );
}
