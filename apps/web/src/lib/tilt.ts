export type Rect = { left: number; top: number; width: number; height: number };
export type Tilt = { rotateX: number; rotateY: number; glareX: number; glareY: number };

const clamp01 = (n: number) => Math.min(1, Math.max(0, n));

/**
 * Pointer position → card tilt. The edge nearest the pointer lifts toward the
 * viewer; glare coordinates are percentages for a radial-gradient highlight.
 */
export function tiltFromPointer(px: number, py: number, rect: Rect, max = 8): Tilt {
  if (rect.width <= 0 || rect.height <= 0) return { rotateX: 0, rotateY: 0, glareX: 50, glareY: 50 };
  const x = clamp01((px - rect.left) / rect.width);
  const y = clamp01((py - rect.top) / rect.height);
  return {
    rotateX: (0.5 - y) * 2 * max,
    rotateY: (x - 0.5) * 2 * max,
    glareX: Math.round(x * 100),
    glareY: Math.round(y * 100),
  };
}
