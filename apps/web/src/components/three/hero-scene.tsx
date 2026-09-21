'use client';

import { Suspense, useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useFrame, useThree } from '@react-three/fiber';
import { Float, Image as DreiImage } from '@react-three/drei';
import { EffectComposer, Bloom } from '@react-three/postprocessing';
import { useReducedMotion } from 'motion/react';
import type { Group, Mesh } from 'three';
import { SceneBoundary, SceneCanvas } from './scene-canvas';

export type HeroProduct = { slug: string; name: string; image: string };

function Core({ spin }: { spin: boolean }) {
  const shell = useRef<Mesh>(null);
  useFrame((_, d) => {
    if (spin && shell.current) {
      shell.current.rotation.y += d * 0.25;
      shell.current.rotation.x += d * 0.1;
    }
  });
  return (
    <group>
      <mesh ref={shell}>
        <icosahedronGeometry args={[1, 1]} />
        <meshStandardMaterial color="#22e5ff" emissive="#22e5ff" emissiveIntensity={1.4} wireframe />
      </mesh>
      <mesh>
        <sphereGeometry args={[0.55, 48, 48]} />
        <meshStandardMaterial color="#8b5cf6" emissive="#8b5cf6" emissiveIntensity={2} roughness={0.2} />
      </mesh>
    </group>
  );
}

/** A glass plate with no photo — shown when a product image can't load as a texture (e.g. no CORS). */
function BlankPanel() {
  return (
    <mesh>
      <planeGeometry args={[1.25, 1.25]} />
      <meshStandardMaterial color="#12183a" emissive="#22e5ff" emissiveIntensity={0.08} transparent opacity={0.7} />
    </mesh>
  );
}

function Panel({ product, angle, radius }: { product: HeroProduct; angle: number; radius: number }) {
  const router = useRouter();
  const ref = useRef<Group>(null);
  const [hovered, setHovered] = useState(false);
  useFrame((_, d) => {
    const g = ref.current;
    if (!g) return;
    const target = hovered ? 1.18 : 1;
    g.scale.setScalar(g.scale.x + (target - g.scale.x) * Math.min(1, d * 10));
  });
  // Hover, click and router.push unmount the scene before onPointerOut fires
  // — reset the cursor on unmount too, or it stays stuck as a pointer.
  useEffect(() => {
    return () => {
      document.body.style.cursor = '';
    };
  }, []);
  return (
    <group
      ref={ref}
      position={[Math.cos(angle) * radius, Math.sin(angle * 2) * 0.35, Math.sin(angle) * radius]}
      onPointerOver={(e) => {
        e.stopPropagation();
        setHovered(true);
        document.body.style.cursor = 'pointer';
      }}
      onPointerOut={() => {
        setHovered(false);
        document.body.style.cursor = '';
      }}
      onClick={() => {
        document.body.style.cursor = '';
        router.push(`/products/${product.slug}`);
      }}
    >
      <SceneBoundary fallback={<BlankPanel />}>
        <Suspense fallback={<BlankPanel />}>
          <DreiImage url={product.image} scale={[1.25, 1.25]} radius={0.12} transparent />
        </Suspense>
      </SceneBoundary>
    </group>
  );
}

function Orbit({ products, spin, radius }: { products: HeroProduct[]; spin: boolean; radius: number }) {
  const ring = useRef<Group>(null);
  useFrame(({ camera }, d) => {
    if (spin && ring.current) ring.current.rotation.y += d * 0.15;
    // Panels always face the camera so the photos stay readable.
    ring.current?.children.forEach((c) => c.lookAt(camera.position));
  });
  return (
    <group ref={ring}>
      {products.map((p, i) => (
        <Panel key={p.slug} product={p} angle={(i / products.length) * Math.PI * 2} radius={radius} />
      ))}
    </group>
  );
}

/**
 * The core, floating shapes and orbit, shifted toward the empty half of the
 * canvas on wide layouts so the composition sits beside the HTML text
 * instead of centred under it. `useThree` only works inside the Canvas, so
 * this reads the viewport itself rather than HeroScene computing it.
 */
function Composition({ products, spin }: { products: HeroProduct[]; spin: boolean }) {
  const { width, height } = useThree((s) => s.viewport);
  const aspectWide = width / height > 1.2;
  const radius = Math.min(2.6, width * 0.26);
  return (
    <group position={[aspectWide ? width * 0.2 : 0, 0, 0]}>
      <Float speed={spin ? 2 : 0} rotationIntensity={0.4} floatIntensity={0.6}>
        <Core spin={spin} />
      </Float>
      <Float speed={spin ? 1.4 : 0} floatIntensity={1.2} position={[-3.2, 1.4, -1.5]}>
        <mesh>
          <torusGeometry args={[0.45, 0.08, 16, 64]} />
          <meshStandardMaterial color="#ff2e88" emissive="#ff2e88" emissiveIntensity={1.6} />
        </mesh>
      </Float>
      <Float speed={spin ? 1.8 : 0} floatIntensity={1} position={[3.3, -1.1, -1]}>
        <mesh>
          <octahedronGeometry args={[0.4]} />
          <meshStandardMaterial color="#22e5ff" emissive="#22e5ff" emissiveIntensity={1.2} wireframe />
        </mesh>
      </Float>
      <Orbit products={products.slice(0, 6)} spin={spin} radius={radius} />
    </group>
  );
}

export default function HeroScene({ products, tier }: { products: HeroProduct[]; tier: 'low' | 'high' }) {
  const spin = !useReducedMotion();
  return (
    <SceneCanvas name="hero" tier={tier} fallback={null} className="h-full w-full" camera={{ position: [0, 1.2, 7], fov: 42 }}>
      <ambientLight intensity={0.5} />
      <pointLight position={[4, 4, 4]} intensity={40} color="#22e5ff" />
      <pointLight position={[-4, -2, 2]} intensity={30} color="#8b5cf6" />
      <Composition products={products} spin={spin} />
      {tier === 'high' && (
        <EffectComposer>
          <Bloom intensity={0.8} luminanceThreshold={0.7} mipmapBlur />
        </EffectComposer>
      )}
    </SceneCanvas>
  );
}
