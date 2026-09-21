'use client';

import { useEffect, useState } from 'react';
import { classifyDevice, hasWebGL, type DeviceTier } from './device-tier';

type NavigatorHints = Navigator & { deviceMemory?: number; connection?: { saveData?: boolean } };

/** Device tier, or null until mounted (SSR and first paint show 2D fallbacks). */
export function useDeviceTier(): DeviceTier | null {
  const [tier, setTier] = useState<DeviceTier | null>(null);
  useEffect(() => {
    const nav = navigator as NavigatorHints;
    setTier(
      classifyDevice({
        webgl: hasWebGL(),
        coarsePointer: window.matchMedia('(pointer: coarse)').matches,
        viewportWidth: window.innerWidth,
        saveData: nav.connection?.saveData,
        deviceMemory: nav.deviceMemory,
        cores: nav.hardwareConcurrency || undefined,
      }),
    );
  }, []);
  return tier;
}
