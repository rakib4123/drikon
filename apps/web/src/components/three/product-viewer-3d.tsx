'use client';

import { Suspense, useEffect, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { Bounds, Center, ContactShadows, Image as DreiImage, OrbitControls, useGLTF } from '@react-three/drei';
import { useReducedMotion } from 'motion/react';
import type { Group } from 'three';
import { SceneBoundary, SceneCanvas } from './scene-canvas';

function Model({ url }: { url: string }) {
  // Draco/Meshopt decoding needs worker-src blob:, gstatic, and 'wasm-unsafe-eval'
  // in the CSP, which we don't grant — plain, uncompressed .glb/.gltf only.
  const { scene } = useGLTF(url, false, false);
  return (
    <Bounds fit clip observe margin={1.25}>
      <Center>
        <primitive object={scene} />
      </Center>
    </Bounds>
  );
}

/**
 * Photo on a glass panel above a lit plinth; sways instead of spinning so the
 * back never shows. Sized and positioned to fit inside the shared camera's
 * frame with margin — the camera itself stays untouched so Model/Bounds
 * framing in the glTF path is unaffected.
 */
function PhotoPlinth({ url, sway }: { url: string; sway: boolean }) {
  const panel = useRef<Group>(null);
  useFrame(({ clock }) => {
    if (sway && panel.current) panel.current.rotation.y = Math.sin(clock.elapsedTime * 0.6) * 0.25;
  });
  return (
    <group>
      <group ref={panel} position={[0, -0.02, 0]}>
        <DreiImage url={url} scale={[1.6, 1.6]} radius={0.08} />
      </group>
      <mesh position={[0, -1.01, 0]}>
        <cylinderGeometry args={[1.0, 1.1, 0.18, 64]} />
        <meshStandardMaterial color="#0d1122" metalness={0.8} roughness={0.25} />
      </mesh>
      <mesh position={[0, -0.9, 0]} rotation={[Math.PI / 2, 0, 0]}>
        <torusGeometry args={[1.0, 0.02, 12, 96]} />
        <meshStandardMaterial color="#22e5ff" emissive="#22e5ff" emissiveIntensity={2.4} />
      </mesh>
    </group>
  );
}

/** Any scene failure bubbles here and switches the page back to the 2D gallery. */
function FailSignal({ onFail }: { onFail: () => void }) {
  useEffect(() => onFail(), [onFail]);
  return null;
}

/** Mounted inside <Canvas>, so it fires once the WebGL scene exists — hides the loading overlay. */
function ReadySignal({ onReady }: { onReady: () => void }) {
  useEffect(() => onReady(), [onReady]);
  return null;
}

export default function ProductViewer3D({
  tier,
  modelUrl,
  imageUrl,
  onFail,
  onReady,
}: {
  tier: 'low' | 'high';
  modelUrl: string | null;
  imageUrl: string | null;
  onFail: () => void;
  onReady: () => void;
}) {
  const reduced = !!useReducedMotion();
  return (
    <SceneCanvas name="product" tier={tier} fallback={<FailSignal onFail={onFail} />} className="h-full w-full" camera={{ position: [0, 0.4, 4.2], fov: 40 }}>
      <color attach="background" args={['#070914']} />
      <ReadySignal onReady={onReady} />
      <ambientLight intensity={0.6} />
      <directionalLight position={[3, 4, 2]} intensity={2.2} />
      <pointLight position={[-3, 1, -2]} intensity={25} color="#8b5cf6" />
      <pointLight position={[3, 0.5, -2]} intensity={25} color="#22e5ff" />
      <SceneBoundary fallback={<FailSignal onFail={onFail} />}>
        <Suspense fallback={null}>
          {modelUrl ? <Model url={modelUrl} /> : imageUrl ? <PhotoPlinth url={imageUrl} sway={!reduced} /> : null}
        </Suspense>
      </SceneBoundary>
      <ContactShadows position={[0, -1.1, 0]} opacity={0.55} scale={6} blur={2.4} far={2} color="#22e5ff" />
      <OrbitControls
        makeDefault
        enablePan={false}
        autoRotate={!!modelUrl && !reduced}
        autoRotateSpeed={1.2}
        minDistance={2.5}
        maxDistance={7}
        {...(modelUrl ? {} : { minAzimuthAngle: -Math.PI / 3, maxAzimuthAngle: Math.PI / 3 })}
      />
    </SceneCanvas>
  );
}
