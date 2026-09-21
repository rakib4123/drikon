import { describe, it, expect } from 'vitest';
import { safeNext } from '@/components/auth/auth-shell';

describe('safeNext — post-login redirect', () => {
  it('keeps a same-site path', () => {
    expect(safeNext('/orders/DRK-2026-000001')).toBe('/orders/DRK-2026-000001');
    expect(safeNext('/checkout?step=2')).toBe('/checkout?step=2');
  });

  it('refuses an absolute URL to another site', () => {
    expect(safeNext('https://evil.example/login')).toBe('/dashboard');
  });

  it('refuses protocol-relative and backslash tricks that browsers treat as off-site', () => {
    expect(safeNext('//evil.example')).toBe('/dashboard');
    expect(safeNext('/\\evil.example')).toBe('/dashboard');
  });

  it('refuses javascript: and other schemes', () => {
    expect(safeNext('javascript:alert(1)')).toBe('/dashboard');
  });

  it('falls back when there is no next', () => {
    expect(safeNext(null)).toBe('/dashboard');
    expect(safeNext('', '/')).toBe('/');
  });
});
