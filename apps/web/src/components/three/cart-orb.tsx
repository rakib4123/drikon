'use client';

import { useRef, type ReactNode } from 'react';
import { useFrame } from '@react-three/fiber';
import { useReducedMotion } from 'motion/react';
import type { Group } from 'three';
import { SceneCanvas } from './scene-canvas';

function Rings({ spin }: { spin: boolean }) {
  const g = useRef<Group>(null);
  useFrame((_, d) => {
    if (!spin || !g.current) return;
    g.current.rotation.y += d * 0.8;
    g.current.rotation.x += d * 0.3;
  });
  return (
    <group ref={g}>
      <mesh>
        <torusGeometry args={[1, 0.05, 16, 96]} />
        <meshStandardMaterial color="#22e5ff" emissive="#22e5ff" emissiveIntensity={2} />
      </mesh>
      <mesh rotation={[Math.PI / 2.4, 0, 0]}>
        <torusGeometry args={[1.2, 0.035, 16, 96]} />
        <meshStandardMaterial color="#8b5cf6" emissive="#8b5cf6" emissiveIntensity={2} />
      </mesh>
    </group>
  );
}

export default function CartOrb({ tier, fallback }: { tier: 'low' | 'high'; fallback: ReactNode }) {
  const spin = !useReducedMotion();
  return (
    <SceneCanvas name="cart" tier={tier} fallback={fallback} className="h-full w-full" camera={{ position: [0, 0, 3.6], fov: 45 }}>
      <ambientLight intensity={0.4} />
      <Rings spin={spin} />
    </SceneCanvas>
  );
}
