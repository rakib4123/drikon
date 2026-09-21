'use client';

import { Component, useEffect, useRef, useState, type ReactNode } from 'react';
import { Canvas } from '@react-three/fiber';
import { useReducedMotion } from 'motion/react';
import { cn } from '@/lib/utils';

export type SceneName = 'backdrop' | 'hero' | 'product' | 'cart';

/** Any throw inside a scene (bad texture, bad model, shader error) → 2D fallback. */
export class SceneBoundary extends Component<{ fallback: ReactNode; children: ReactNode }, { failed: boolean }> {
  state = { failed: false };
  static getDerivedStateFromError() {
    return { failed: true };
  }
  componentDidCatch(error: unknown) {
    console.warn('[3d] scene failed, showing 2D fallback:', error);
  }
  render() {
    return this.state.failed ? this.props.fallback : this.props.children;
  }
}

/**
 * The one way to put WebGL on the page. Caps DPR by tier, stops rendering when
 * scrolled off-screen, renders on demand under reduced motion, and swaps to the
 * fallback on a scene error or a lost WebGL context. rAF already pauses in
 * hidden tabs, so no extra visibility handling is needed.
 */
export function SceneCanvas({
  name,
  tier,
  fallback,
  className,
  camera = { position: [0, 0, 6], fov: 45 },
  children,
}: {
  name: SceneName;
  tier: 'low' | 'high';
  fallback: ReactNode;
  className?: string;
  camera?: { position: [number, number, number]; fov?: number };
  children: ReactNode;
}) {
  const reduced = useReducedMotion();
  const box = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(true);
  const [lost, setLost] = useState(false);

  useEffect(() => {
    const el = box.current;
    if (!el) return;
    const io = new IntersectionObserver(([entry]) => setVisible(entry.isIntersecting), { rootMargin: '100px' });
    io.observe(el);
    return () => io.disconnect();
  }, []);

  const wrapped = <div data-scene-fallback={name} className="h-full w-full">{fallback}</div>;
  if (lost) return wrapped;

  return (
    <div ref={box} data-scene={name} aria-hidden className={cn('relative', className)}>
      <SceneBoundary fallback={wrapped}>
        <Canvas
          dpr={tier === 'low' ? 1 : [1, 1.75]}
          camera={camera}
          frameloop={!visible ? 'never' : reduced ? 'demand' : 'always'}
          gl={{ antialias: tier === 'high', alpha: true, powerPreference: 'high-performance' }}
          onCreated={({ gl }) => {
            gl.domElement.addEventListener('webglcontextlost', (e) => {
              e.preventDefault();
              setLost(true);
            });
          }}
        >
          {children}
        </Canvas>
      </SceneBoundary>
    </div>
  );
}
