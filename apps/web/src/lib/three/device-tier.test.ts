import { describe, expect, it } from 'vitest';
import { classifyDevice, type TierInputs } from './device-tier';

const desktop: TierInputs = { webgl: true, coarsePointer: false, viewportWidth: 1440, deviceMemory: 8, cores: 8 };

describe('classifyDevice', () => {
  it('is none without WebGL, whatever else is true', () => {
    expect(classifyDevice({ ...desktop, webgl: false })).toBe('none');
  });
  it('is high on a capable desktop', () => {
    expect(classifyDevice(desktop)).toBe('high');
  });
  it('is high when the browser hides memory/cores', () => {
    expect(classifyDevice({ webgl: true, coarsePointer: false, viewportWidth: 1440 })).toBe('high');
  });
  it.each<[string, Partial<TierInputs>]>([
    ['data saver', { saveData: true }],
    ['4 GB memory', { deviceMemory: 4 }],
    ['4 cores', { cores: 4 }],
    ['phone (coarse pointer, narrow)', { coarsePointer: true, viewportWidth: 390 }],
  ])('is low for %s', (_label, patch) => {
    expect(classifyDevice({ ...desktop, ...patch })).toBe('low');
  });
  it('keeps a large touch screen (tablet landscape) high', () => {
    expect(classifyDevice({ ...desktop, coarsePointer: true, viewportWidth: 1280 })).toBe('high');
  });
});
