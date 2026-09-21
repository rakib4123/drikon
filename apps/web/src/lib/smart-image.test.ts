import { describe, it, expect, beforeAll } from 'vitest';

describe('canOptimize — which images go through the Next optimizer', () => {
  let canOptimize: (src: string) => boolean;
  beforeAll(async () => {
    process.env.IMAGE_HOSTS = 'res.cloudinary.com,.example.net';
    ({ canOptimize } = await import('@/components/ui/smart-image'));
  });

  it('optimises local paths', () => expect(canOptimize('/hero.png')).toBe(true));
  it('optimises an allow-listed host', () => expect(canOptimize('https://res.cloudinary.com/x/a.jpg')).toBe(true));
  it('matches subdomains for a leading-dot entry', () => {
    expect(canOptimize('https://cdn.example.net/a.jpg')).toBe(true);
    expect(canOptimize('https://example.net/a.jpg')).toBe(true);
  });
  it('loads any other host directly instead of proxying it', () => {
    expect(canOptimize('https://random-cdn.example.org/a.jpg')).toBe(false);
  });
  it('does not treat a lookalike host as a subdomain', () => {
    expect(canOptimize('https://notexample.net/a.jpg')).toBe(false);
  });
  it('treats protocol-relative URLs as remote', () => expect(canOptimize('//evil.example/a.jpg')).toBe(false));
});
