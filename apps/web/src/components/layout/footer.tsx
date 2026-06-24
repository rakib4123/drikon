import Link from 'next/link';
import { BrandMark } from '@/components/layout/brand-mark';
import type { BrandInfo } from '@/lib/settings';

export function Footer({ brand }: { brand: BrandInfo }) {
  return (
    <footer className="mt-24 border-t border-[color:var(--border)]">
      <div className="max-w-7xl mx-auto px-6 py-14 grid gap-10 md:grid-cols-3">
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
            <li><Link href="/products?category=laptops-pcs" className="hover:text-[color:var(--fg)]">Laptops &amp; PCs</Link></li>
            <li><Link href="/products?category=components" className="hover:text-[color:var(--fg)]">Components</Link></li>
            <li><Link href="/products?category=peripherals" className="hover:text-[color:var(--fg)]">Peripherals</Link></li>
          </ul>
        </div>
      </div>
      <div className="border-t border-[color:var(--border)] py-6">
        <div className="max-w-7xl mx-auto px-6 flex flex-col sm:flex-row justify-between gap-2 text-xs text-[color:var(--fg-muted)]">
          <span>© {new Date().getFullYear()} {brand.siteName}. All rights reserved.</span>
          <span>Made with care in Dhaka.</span>
        </div>
      </div>
    </footer>
  );
}
