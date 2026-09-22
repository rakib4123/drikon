'use client';

import { Suspense, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { Center, ContactShadows, Image as DreiImage, useGLTF } from '@react-three/drei';
import { useReducedMotion } from 'motion/react';
import type { Group } from 'three';
import { SceneCanvas, type SceneName } from './scene-canvas';
import { useSafeTexture } from '@/lib/three/use-safe-texture';

const CREAM = '#f3ece1';
const BRONZE = '#b45309';

/** Cream stand with a thin bronze ring — the constant base of every showcase.
 * Exported so the product viewer (product-viewer-3d.tsx) reuses the same
 * look instead of styling its own plinth. */
export function Stand() {
  return (
    <group position={[0, -0.95, 0]}>
      <mesh receiveShadow>
        <cylinderGeometry args={[1.05, 1.15, 0.2, 64]} />
        <meshStandardMaterial color={CREAM} roughness={0.55} metalness={0.05} />
      </mesh>
      <mesh position={[0, 0.101, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <ringGeometry args={[0.98, 1.02, 96]} />
        <meshStandardMaterial color={BRONZE} roughness={0.35} metalness={0.6} />
      </mesh>
    </group>
  );
}

/** Exported for reuse by the product viewer's coarse-pointer, pre-tap state. */
export function Turntable({ spin, full, children }: { spin: boolean; full: boolean; children: React.ReactNode }) {
  const g = useRef<Group>(null);
  useFrame(({ clock }, d) => {
    if (!spin || !g.current) return;
    if (full) g.current.rotation.y += d * 0.35;
    else g.current.rotation.y = Math.sin(clock.elapsedTime * 0.5) * 0.35;
  });
  return <group ref={g}>{children}</group>;
}

function Photo({ url }: { url: string }) {
  const { texture } = useSafeTexture(url);
  if (!texture) return null; // stand alone while loading or on failure — no console errors
  return <DreiImage texture={texture} scale={[1.55, 1.55]} radius={0.08} position={[0, -0.05, 0]} />;
}

function Model({ url }: { url: string }) {
  // Plain glTF only (no Draco/Meshopt) — see CSP notes in next.config.mjs.
  const { scene } = useGLTF(url, false, false);
  return (
    <Center top position={[0, -0.85, 0]}>
      <primitive object={scene} scale={1.2} />
    </Center>
  );
}

export default function ShowcaseScene({
  name,
  tier,
  imageUrl,
  modelUrl,
  fallback,
}: {
  name: SceneName;
  tier: 'low' | 'high';
  imageUrl: string | null;
  modelUrl?: string | null;
  fallback: React.ReactNode;
}) {
  const spin = !useReducedMotion();
  return (
    <SceneCanvas name={name} tier={tier} fallback={fallback} className="h-full w-full" camera={{ position: [0, 0.35, 4.4], fov: 38 }}>
      <hemisphereLight args={['#fff7ed', '#e7dfd3', 0.9]} />
      <directionalLight position={[2.5, 4, 3]} intensity={1.6} color="#fff1dc" />
      <directionalLight position={[-3, 1.5, -2]} intensity={0.6} color="#fde7c7" />
      <Stand />
      <Turntable spin={spin} full={!!modelUrl}>
        {modelUrl ? (
          <Suspense fallback={null}>
            <Model url={modelUrl} />
          </Suspense>
        ) : imageUrl ? (
          <Photo url={imageUrl} />
        ) : null}
      </Turntable>
      <ContactShadows position={[0, -1.06, 0]} opacity={0.35} scale={5} blur={2.6} far={2} color="#57534e" />
    </SceneCanvas>
  );
}
