'use client';

import dynamic from 'next/dynamic';
import { useDeviceTier } from '@/lib/three/use-device-tier';
import type { HeroProduct } from './hero-scene';

/** Static neon composition — module scope so the exact same node covers every
 * "no 3D yet" gap: SSR/first paint, the dynamic chunk still loading, no-WebGL,
 * and any in-scene failure (passed through to HeroScene's SceneCanvas). */
const heroFallback = (
  <div data-scene-fallback="hero" className="relative h-full w-full grid place-items-center">
    <div className="h-40 w-40 rounded-full bg-[radial-gradient(circle,#8b5cf6_0%,rgba(34,229,255,0.35)_45%,transparent_70%)] blur-[2px] animate-glow-pulse" />
  </div>
);

const HeroScene = dynamic(() => import('./hero-scene'), { ssr: false, loading: () => heroFallback });

/** Static neon composition first (SSR + no-WebGL), the 3D scene once the device qualifies. */
export function HeroSceneLoader({ products }: { products: HeroProduct[] }) {
  const tier = useDeviceTier();
  if (!tier || tier === 'none' || products.length === 0) return heroFallback;
  return <HeroScene products={products} tier={tier} fallback={heroFallback} />;
}
