import { describe, expect, it } from 'vitest';
import { tiltFromPointer } from './tilt';

const rect = { left: 100, top: 200, width: 200, height: 100 };

describe('tiltFromPointer', () => {
  it('is flat at the centre', () => {
    const t = tiltFromPointer(200, 250, rect);
    expect(t.rotateX).toBeCloseTo(0);
    expect(t.rotateY).toBeCloseTo(0);
    expect(t).toMatchObject({ glareX: 50, glareY: 50 });
  });

  it('tilts toward the pointer, up to max degrees', () => {
    // top-right corner: top edge lifts toward viewer (+X), right side away (+Y)
    expect(tiltFromPointer(300, 200, rect, 8)).toEqual({ rotateX: 8, rotateY: 8, glareX: 100, glareY: 0 });
    expect(tiltFromPointer(100, 300, rect, 8)).toEqual({ rotateX: -8, rotateY: -8, glareX: 0, glareY: 100 });
  });

  it('clamps pointers outside the card', () => {
    expect(tiltFromPointer(-500, 9999, rect, 8)).toEqual({ rotateX: -8, rotateY: -8, glareX: 0, glareY: 100 });
  });

  it('returns flat for a zero-size rect instead of NaN', () => {
    expect(tiltFromPointer(0, 0, { left: 0, top: 0, width: 0, height: 0 })).toEqual({ rotateX: 0, rotateY: 0, glareX: 50, glareY: 50 });
  });
});
