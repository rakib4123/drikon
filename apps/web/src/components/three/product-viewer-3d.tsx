'use client';

import { Suspense, useEffect, useRef, useState } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import { Bounds, Center, ContactShadows, Image as DreiImage, OrbitControls, useGLTF } from '@react-three/drei';
import { useReducedMotion } from 'motion/react';
import type { Group } from 'three';
import { useSafeTexture } from '@/lib/three/use-safe-texture';
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
 *
 * The photo loads through useSafeTexture instead of drei's <Image url=…>, so a
 * broken or CORS-blocked photo degrades to onFail (2D gallery) instead of
 * throwing into the SceneBoundary, which React 19 would log to the console.
 *
 * useSafeTexture doesn't suspend (it's state/effect based, not a thrown
 * promise), so Suspense can't tell when it's done — onReady fires here
 * directly, once the texture actually lands (or the load fails, which
 * switches the page away from the 3D view anyway).
 */
function PhotoPlinth({ url, sway, onFail, onReady }: { url: string; sway: boolean; onFail: () => void; onReady: () => void }) {
  const panel = useRef<Group>(null);
  const { texture, failed } = useSafeTexture(url);
  useEffect(() => {
    if (texture || failed) onReady();
  }, [texture, failed, onReady]);
  useFrame(({ clock }) => {
    if (sway && panel.current) panel.current.rotation.y = Math.sin(clock.elapsedTime * 0.6) * 0.25;
  });
  return (
    <group>
      {failed ? (
        <FailSignal onFail={onFail} />
      ) : (
        texture && (
          <group ref={panel} position={[0, -0.02, 0]}>
            <DreiImage texture={texture} scale={[1.6, 1.6]} radius={0.08} />
          </group>
        )
      )}
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

/** Mounted inside the Suspense boundary, alongside <Model> — React only commits
 * a suspended subtree once every child's promise (here, useGLTF's) resolves,
 * so this fires exactly when the model is actually on screen, not before. */
function ReadySignal({ onReady }: { onReady: () => void }) {
  useEffect(() => onReady(), [onReady]);
  return null;
}

/**
 * Mounted only while drag-rotate is off on a coarse pointer. three-stdlib's
 * OrbitControls.connect() unconditionally sets `domElement.style.touchAction
 * = 'none'` on mount, regardless of `.enabled` — that's what was stealing
 * vertical swipes from the page. This restores `pan-y` while controls are
 * disabled, and puts it back to `none` the moment the visitor taps to enable
 * rotation (see the effect's dependency on `allowPageScroll`).
 */
function TouchActionSync({ allowPageScroll }: { allowPageScroll: boolean }) {
  const gl = useThree((s) => s.gl);
  useEffect(() => {
    gl.domElement.style.touchAction = allowPageScroll ? 'pan-y' : 'none';
  }, [allowPageScroll, gl]);
  return null;
}

/** Synchronous initial value (this component only ever mounts client-side, via
 * a `dynamic(..., { ssr: false })` import) plus a listener for a pointer
 * changing later (e.g. a 2-in-1 laptop docking/undocking a mouse). */
function useCoarsePointer(): boolean {
  const [coarse, setCoarse] = useState(
    () => typeof window !== 'undefined' && window.matchMedia('(pointer: coarse)').matches,
  );
  useEffect(() => {
    const mq = window.matchMedia('(pointer: coarse)');
    const sync = () => setCoarse(mq.matches);
    sync();
    mq.addEventListener('change', sync);
    return () => mq.removeEventListener('change', sync);
  }, []);
  return coarse;
}

export default function ProductViewer3D({
  tier,
  modelUrl,
  imageUrl,
  labels,
  onFail,
  onReady,
}: {
  tier: 'low' | 'high';
  modelUrl: string | null;
  imageUrl: string | null;
  labels: { dragHint: string; tapHint: string };
  onFail: () => void;
  onReady: () => void;
}) {
  const reduced = !!useReducedMotion();
  const coarse = useCoarsePointer();
  // Resets on remount — i.e. a fresh viewer (leaving Photos and coming back to
  // 3D) asks the visitor to tap again. "For that session of the viewer."
  const [tapEnabled, setTapEnabled] = useState(false);

  // Photo-plinth mode never gets OrbitControls at all — it only sways, so
  // there's nothing to hijack scroll/zoom in the first place.
  const hasModel = !!modelUrl;
  const dragEnabled = hasModel && (!coarse || tapEnabled);
  const showTapButton = hasModel && coarse && !tapEnabled;
  const showDragHint = hasModel && !showTapButton;

  return (
    <div className="relative h-full w-full">
      <SceneCanvas
        name="product"
        tier={tier}
        fallback={<FailSignal onFail={onFail} />}
        className="h-full w-full"
        camera={{ position: [0, 0.4, 4.2], fov: 40 }}
      >
        <color attach="background" args={['#070914']} />
        <ambientLight intensity={0.6} />
        <directionalLight position={[3, 4, 2]} intensity={2.2} />
        <pointLight position={[-3, 1, -2]} intensity={25} color="#8b5cf6" />
        <pointLight position={[3, 0.5, -2]} intensity={25} color="#22e5ff" />
        <SceneBoundary fallback={<FailSignal onFail={onFail} />}>
          <Suspense fallback={null}>
            {modelUrl ? (
              <>
                <Model url={modelUrl} />
                <ReadySignal onReady={onReady} />
              </>
            ) : imageUrl ? (
              <PhotoPlinth url={imageUrl} sway={!reduced} onFail={onFail} onReady={onReady} />
            ) : null}
          </Suspense>
        </SceneBoundary>
        <ContactShadows position={[0, -1.1, 0]} opacity={0.55} scale={6} blur={2.4} far={2} color="#22e5ff" />
        {hasModel && (
          <>
            {/* enableZoom is always off: three-stdlib's wheel handler only calls
                preventDefault() once it's past the enableZoom check, so this is
                what actually lets the page scroll under the cursor on desktop. */}
            <OrbitControls
              makeDefault
              enabled={dragEnabled}
              enableZoom={false}
              enablePan={false}
              autoRotate={!reduced}
              autoRotateSpeed={1.2}
              minDistance={2.5}
              maxDistance={7}
            />
            <TouchActionSync allowPageScroll={!dragEnabled} />
          </>
        )}
      </SceneCanvas>
      {showTapButton && (
        <button
          type="button"
          onClick={() => setTapEnabled(true)}
          className="pointer-events-auto absolute bottom-3 inset-x-0 mx-auto w-fit rounded-full border border-[color:var(--border)] bg-[color:var(--surface)] px-3.5 py-1.5 font-mono text-[11px] uppercase tracking-[0.2em] text-[color:var(--fg)] backdrop-blur"
        >
          {labels.tapHint}
        </button>
      )}
      {showDragHint && (
        <p className="pointer-events-none absolute bottom-3 inset-x-0 text-center font-mono text-[11px] uppercase tracking-[0.2em] text-[color:var(--fg-muted)]">
          {labels.dragHint}
        </p>
      )}
    </div>
  );
}
