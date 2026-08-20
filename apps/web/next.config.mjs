import { fileURLToPath } from 'node:url';
import path from 'node:path';
import createNextIntlPlugin from 'next-intl/plugin';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const isDev = process.env.NODE_ENV !== 'production';
const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';
// Only emit the self-contained "standalone" server for the Docker/self-host
// build (Dockerfile.web sets BUILD_STANDALONE=1). On Vercel this stays off so
// the platform uses its own default build output.
const standalone = process.env.BUILD_STANDALONE === '1';

// Content-Security-Policy. Next.js needs inline scripts/styles for hydration;
// dev additionally needs eval + websockets for HMR. Everything else is locked
// to self + the API origin + the fonts/CDN we actually use.
const csp = [
  "default-src 'self'",
  `script-src 'self' 'unsafe-inline'${isDev ? " 'unsafe-eval'" : ''}`,
  "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
  "font-src 'self' data: https://fonts.gstatic.com",
  "img-src 'self' data: blob: https:",
  "media-src 'self' https: blob:",
  `connect-src 'self' ${apiUrl} https://api.cloudinary.com${isDev ? ' ws: http://localhost:4000' : ''}`,
  "frame-src 'self' https://www.youtube.com https://www.youtube-nocookie.com https://player.vimeo.com",
  "frame-ancestors 'none'",
  "base-uri 'self'",
  "form-action 'self'",
  "object-src 'none'",
  ...(isDev ? [] : ['upgrade-insecure-requests']),
].join('; ');

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  poweredByHeader: false,
  // Self-contained server build for Docker (only traces files it actually uses).
  // outputFileTracingRoot points at the monorepo root so workspace deps
  // (e.g. @drikon/shared-types) are bundled correctly. Off on Vercel.
  ...(standalone
    ? { output: 'standalone', outputFileTracingRoot: path.join(__dirname, '../../') }
    : {}),
  // Product images can come from any CDN an admin pastes in, so allow any
  // HTTPS host (Next still optimizes + proxies them).
  images: {
    remotePatterns: [{ protocol: 'https', hostname: '**' }],
  },
  experimental: {
    optimizePackageImports: ['lucide-react', 'motion'],
  },
  // Security headers — applied to every response
  async headers() {
    return [
      {
        source: '/(.*)',
        headers: [
          { key: 'Content-Security-Policy', value: csp },
          { key: 'X-Frame-Options', value: 'DENY' },
          { key: 'X-Content-Type-Options', value: 'nosniff' },
          { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
          { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=()' },
          { key: 'Cross-Origin-Opener-Policy', value: 'same-origin' },
          { key: 'X-DNS-Prefetch-Control', value: 'off' },
          {
            key: 'Strict-Transport-Security',
            value: 'max-age=31536000; includeSubDomains; preload',
          },
        ],
      },
    ];
  },
};

const withNextIntl = createNextIntlPlugin('./src/i18n/request.ts');

export default withNextIntl(nextConfig);
