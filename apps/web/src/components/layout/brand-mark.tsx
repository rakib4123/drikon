import Link from 'next/link';
import type { BrandInfo } from '@/lib/settings';

/**
 * The Drikon "tech network" mark, recreated as an adaptive SVG: orange nodes
 * = accent, dark nodes/links = --fg (navy in light, near-white in dark).
 */
function NetworkIcon({ className }: { className?: string }) {
  // Hexagon nodes around a central hub (viewBox 0 0 48 48, r ≈ 15).
  const nodes = [
    { x: 39, y: 24, accent: true },
    { x: 31.5, y: 37, accent: false },
    { x: 16.5, y: 37, accent: true },
    { x: 9, y: 24, accent: false },
    { x: 16.5, y: 11, accent: true },
    { x: 31.5, y: 11, accent: false },
  ];
  return (
    <svg viewBox="0 0 48 48" className={className} aria-hidden role="img" fill="none">
      {/* links: hub → node, and node → next node */}
      <g stroke="currentColor" strokeWidth="1.6" opacity="0.55">
        {nodes.map((n, i) => (
          <line key={`h${i}`} x1="24" y1="24" x2={n.x} y2={n.y} />
        ))}
        {nodes.map((n, i) => {
          const m = nodes[(i + 1) % nodes.length];
          return <line key={`r${i}`} x1={n.x} y1={n.y} x2={m.x} y2={m.y} />;
        })}
      </g>
      {/* outer nodes */}
      {nodes.map((n, i) => (
        <circle
          key={i}
          cx={n.x}
          cy={n.y}
          r="3.4"
          fill={n.accent ? 'var(--accent)' : 'currentColor'}
        />
      ))}
      {/* hub */}
      <circle cx="24" cy="24" r="5.4" fill="var(--accent)" />
      <circle cx="24" cy="24" r="2.2" fill="currentColor" />
    </svg>
  );
}

/**
 * White-label brand mark. If an admin has uploaded a logo, we show ONLY the
 * logo. Otherwise we render the Drikon network icon + the site-name wordmark
 * (still driven by settings, so the name is never hardcoded).
 */
export function BrandMark({
  brand,
  href = '/',
  className,
  showTagline = false,
}: {
  brand: BrandInfo;
  href?: string | null;
  className?: string;
  showTagline?: boolean;
}) {
  const inner = brand.logoUrl ? (
    // eslint-disable-next-line @next/next/no-img-element
    <img src={brand.logoUrl} alt={brand.siteName} className="h-9 w-auto object-contain" />
  ) : (
    <>
      <NetworkIcon className="w-9 h-9 text-[color:var(--fg)] transition-transform group-hover:scale-105 shrink-0" />
      <span className="flex flex-col leading-none">
        <span className="font-display text-xl tracking-tight">{brand.siteName}</span>
        {showTagline && brand.tagline && (
          <span className="text-[10px] font-medium uppercase tracking-[0.25em] text-[color:var(--accent)] mt-1">
            {brand.tagline}
          </span>
        )}
      </span>
    </>
  );

  const content = (
    <span className={`flex items-center gap-2.5 group ${className ?? ''}`}>{inner}</span>
  );

  return href ? (
    <Link href={href} className="inline-flex">
      {content}
    </Link>
  ) : (
    content
  );
}
