'use client';

import { useEffect, useRef } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import { Grid, Stars } from '@react-three/drei';
import { useReducedMotion } from 'motion/react';
import { SceneCanvas } from './scene-canvas';

/** Mouse + scroll position, read from window — the canvas itself ignores the pointer. */
function useViewportPointer() {
  const p = useRef({ x: 0, y: 0, scroll: 0 });
  useEffect(() => {
    const move = (e: PointerEvent) => {
      p.current.x = (e.clientX / window.innerWidth) * 2 - 1;
      p.current.y = (e.clientY / window.innerHeight) * 2 - 1;
    };
    const scroll = () => {
      p.current.scroll = window.scrollY;
    };
    window.addEventListener('pointermove', move, { passive: true });
    window.addEventListener('scroll', scroll, { passive: true });
    return () => {
      window.removeEventListener('pointermove', move);
      window.removeEventListener('scroll', scroll);
    };
  }, []);
  return p;
}

function Drift({ enabled }: { enabled: boolean }) {
  const pointer = useViewportPointer();
  const { camera } = useThree();
  useFrame((_, delta) => {
    if (!enabled) return;
    const k = Math.min(1, delta * 2);
    camera.position.x += (pointer.current.x * 0.6 - camera.position.x) * k;
    camera.position.y += (1.6 - pointer.current.y * 0.3 - Math.min(pointer.current.scroll / 1500, 0.8) - camera.position.y) * k;
    camera.lookAt(0, 0, -6);
  });
  return null;
}

export default function SpaceBackdrop({ tier }: { tier: 'low' | 'high' }) {
  const reduced = !!useReducedMotion();
  return (
    <SceneCanvas name="backdrop" tier={tier} fallback={null} className="h-full w-full" camera={{ position: [0, 1.6, 6], fov: 55 }}>
      <fog attach="fog" args={['#05060d', 6, 26]} />
      <Stars radius={60} depth={40} count={tier === 'high' ? 2000 : 600} factor={3} fade speed={reduced ? 0 : 0.6} />
      <Grid
        position={[0, -1.2, 0]}
        infiniteGrid
        cellSize={0.6}
        cellThickness={0.6}
        cellColor="#1b2a55"
        sectionSize={3}
        sectionThickness={1.1}
        sectionColor="#22e5ff"
        fadeDistance={24}
        fadeStrength={1.4}
      />
      <Drift enabled={!reduced} />
    </SceneCanvas>
  );
}
