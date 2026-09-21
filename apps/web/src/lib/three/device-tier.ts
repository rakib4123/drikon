export type DeviceTier = 'none' | 'low' | 'high';

export type TierInputs = {
  webgl: boolean;
  coarsePointer: boolean;
  viewportWidth: number;
  saveData?: boolean;
  deviceMemory?: number;
  cores?: number;
};

/**
 * How much 3D this device should get. `none` → 2D fallbacks only; `low` →
 * fewer particles, DPR 1, no bloom; `high` → everything. Unknown memory/cores
 * (Safari, Firefox hide them) don't count against the device.
 */
export function classifyDevice(i: TierInputs): DeviceTier {
  if (!i.webgl) return 'none';
  if (i.saveData) return 'low';
  if (i.deviceMemory !== undefined && i.deviceMemory <= 4) return 'low';
  if (i.cores !== undefined && i.cores <= 4) return 'low';
  if (i.coarsePointer && i.viewportWidth < 768) return 'low';
  return 'high';
}

// Every loader mount called hasWebGL(), and each call created a fresh WebGL
// context that was never released — a real context leak under the browser's
// (usually ~8-16) live-context limit. The probe result can't change within a
// page's lifetime, so cache it once at module scope and immediately release
// the probe context itself.
let cachedWebGL: boolean | null = null;

export function hasWebGL(): boolean {
  if (cachedWebGL !== null) return cachedWebGL;
  try {
    const canvas = document.createElement('canvas');
    const gl = canvas.getContext('webgl2') ?? canvas.getContext('webgl');
    cachedWebGL = !!gl;
    gl?.getExtension('WEBGL_lose_context')?.loseContext();
  } catch {
    cachedWebGL = false;
  }
  return cachedWebGL;
}
