import Link from 'next/link';
import { getTranslations } from 'next-intl/server';
import { SectionHeader } from '@/components/home/section-header';

interface Brand {
  id: string;
  name: string;
  slug: string;
  logoUrl?: string | null;
}

/** "Shop by brand" — a logo grid, each tile linking to that brand's filtered catalogue. */
export async function BrandStrip({ brands }: { brands: Brand[] }) {
  const t = await getTranslations('home');
  if (!brands || brands.length === 0) return null;

  return (
    <section className="shell py-8" aria-labelledby="shop-by-brand">
      <SectionHeader id="shop-by-brand" title={t('shopByBrand')} />
      <ul className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-3">
        {brands.slice(0, 16).map((b) => (
          <li key={b.id}>
            <Link
              href={`/products?brand=${b.slug}`}
              className="group h-20 flex items-center justify-center rounded-[var(--radius-card)] border border-[color:var(--border)] [background:var(--image-well)] px-4
                         hover:border-[color:var(--accent)] hover:shadow-[0_10px_24px_-14px_rgba(28,25,23,0.3)] transition"
            >
              {b.logoUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={b.logoUrl}
                  alt={b.name}
                  className="max-h-9 w-auto object-contain grayscale opacity-70 group-hover:grayscale-0 group-hover:opacity-100 transition"
                />
              ) : (
                <span className="text-base font-extrabold tracking-tight text-[color:var(--fg-muted)] group-hover:text-[color:var(--accent)] transition-colors">
                  {b.name}
                </span>
              )}
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}
