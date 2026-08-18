import Link from 'next/link';
import { BrandMark } from '@/components/layout/brand-mark';
import type { BrandInfo } from '@/lib/settings';
import type { NavCategory } from '@/lib/catalog';

export function Footer({ brand, categories = [], note }: { brand: BrandInfo; categories?: NavCategory[]; note?: string }) {
  const topCats = categories.filter((c) => !c.parentId).slice(0, 5);
  return (
    <footer className="mt-24 border-t border-[color:var(--border)]">
      <div className="max-w-7xl mx-auto px-6 py-14 grid gap-10 md:grid-cols-5">
        <div className="md:col-span-2">
          <div className="mb-3">
            <BrandMark brand={brand} href={null} showTagline />
          </div>
          <p className="text-sm text-[color:var(--fg-muted)] max-w-sm">
            {brand.tagline || 'A modern marketplace built around taste, performance, and trust.'}
          </p>
        </div>

        <div>
          <div className="text-sm font-semibold mb-3">Shop</div>
          <ul className="space-y-2 text-sm text-[color:var(--fg-muted)]">
            <li><Link href="/products" className="hover:text-[color:var(--fg)]">All products</Link></li>
            {topCats.map((c) => (
              <li key={c.id}>
                <Link href={`/products?category=${c.slug}`} className="hover:text-[color:var(--fg)]">
                  {c.name}
                </Link>
              </li>
            ))}
          </ul>
        </div>

        <div>
          <div className="text-sm font-semibold mb-3">Company</div>
          <ul className="space-y-2 text-sm text-[color:var(--fg-muted)]">
            <li><Link href="/about" className="hover:text-[color:var(--fg)]">About</Link></li>
            <li><Link href="/contact" className="hover:text-[color:var(--fg)]">Contact</Link></li>
          </ul>
        </div>

        <div>
          <div className="text-sm font-semibold mb-3">Legal</div>
          <ul className="space-y-2 text-sm text-[color:var(--fg-muted)]">
            <li><Link href="/shipping-returns" className="hover:text-[color:var(--fg)]">Shipping &amp; Returns</Link></li>
            <li><Link href="/terms" className="hover:text-[color:var(--fg)]">Terms of Service</Link></li>
            <li><Link href="/privacy" className="hover:text-[color:var(--fg)]">Privacy Policy</Link></li>
          </ul>
        </div>
      </div>
      <div className="border-t border-[color:var(--border)] py-6">
        <div className="max-w-7xl mx-auto px-6 flex flex-col sm:flex-row justify-between gap-2 text-xs text-[color:var(--fg-muted)]">
          <span>© {new Date().getFullYear()} {brand.siteName}. All rights reserved.</span>
          {note && <span>{note}</span>}
        </div>
      </div>
    </footer>
  );
}
