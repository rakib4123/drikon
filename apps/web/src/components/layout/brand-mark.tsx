import Link from 'next/link';
import type { BrandInfo } from '@/lib/settings';

/**
 * White-label brand mark. If an admin has uploaded a logo, we show ONLY the
 * logo (it usually contains the wordmark). Otherwise we generate a neon mark
 * from the site name's initial + the site name text — nothing is hardcoded.
 */
export function BrandMark({
  brand,
  href = '/',
  className,
}: {
  brand: BrandInfo;
  href?: string | null;
  className?: string;
}) {
  const initial = brand.siteName?.charAt(0)?.toUpperCase() ?? 'D';

  const inner = brand.logoUrl ? (
    // eslint-disable-next-line @next/next/no-img-element
    <img src={brand.logoUrl} alt={brand.siteName} className="h-8 w-auto object-contain" />
  ) : (
    <>
      <span
        className="w-8 h-8 rounded-lg bg-gradient-to-br from-[#22d3ee] to-[#a855f7]
                   grid place-items-center text-[#06070d] font-bold shadow-lg shadow-[#22d3ee]/30
                   transition-transform group-hover:scale-110"
        aria-hidden
      >
        {initial}
      </span>
      <span className="font-display text-xl tracking-tight">{brand.siteName}</span>
    </>
  );

  const content = (
    <span className={`flex items-center gap-2 group ${className ?? ''}`}>{inner}</span>
  );

  return href ? (
    <Link href={href} className="inline-flex">
      {content}
    </Link>
  ) : (
    content
  );
}
