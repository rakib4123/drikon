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

export function hasWebGL(): boolean {
  try {
    const canvas = document.createElement('canvas');
    return !!(canvas.getContext('webgl2') ?? canvas.getContext('webgl'));
  } catch {
    return false;
  }
}
