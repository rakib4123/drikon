'use client';

import { useEffect, useState } from 'react';
import { SRGBColorSpace, TextureLoader, type Texture } from 'three';

export type SafeTexture = { texture: Texture | null; failed: boolean };

/**
 * Loads an image texture without suspending or throwing, so a broken or
 * CORS-blocked photo degrades quietly instead of hitting an error boundary
 * (React 19 logs every caught boundary error to the console).
 */
export function useSafeTexture(url: string | null): SafeTexture {
  const [state, setState] = useState<SafeTexture>({ texture: null, failed: false });

  useEffect(() => {
    if (!url) {
      setState({ texture: null, failed: true });
      return;
    }
    let alive = true;
    setState({ texture: null, failed: false });
    const loader = new TextureLoader();
    loader.setCrossOrigin('anonymous');
    loader.load(
      url,
      (tex) => {
        tex.colorSpace = SRGBColorSpace;
        if (alive) setState({ texture: tex, failed: false });
        else tex.dispose();
      },
      undefined,
      () => {
        if (alive) setState({ texture: null, failed: true });
      },
    );
    return () => {
      alive = false;
    };
  }, [url]);

  useEffect(
    () => () => {
      state.texture?.dispose();
    },
    [state.texture],
  );

  return state;
}
