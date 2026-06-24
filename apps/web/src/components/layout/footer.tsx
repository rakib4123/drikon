import Link from 'next/link';

export function Footer() {
  return (
    <footer className="mt-24 border-t border-[color:var(--border)]">
      <div className="max-w-7xl mx-auto px-6 py-14 grid gap-10 md:grid-cols-3">
        <div className="md:col-span-2">
          <div className="flex items-center gap-2 mb-3">
            <span className="w-8 h-8 rounded-lg bg-gradient-to-br from-[#e2683c] to-[#f0a830] grid place-items-center text-white font-bold">দ</span>
            <span className="font-display text-xl">Drikon</span>
          </div>
          <p className="text-sm text-[color:var(--fg-muted)] max-w-sm">
            Vision, engineered. A modern marketplace built around taste, performance, and trust.
          </p>
        </div>

        <div>
          <div className="text-sm font-semibold mb-3">Shop</div>
          <ul className="space-y-2 text-sm text-[color:var(--fg-muted)]">
            <li><Link href="/products" className="hover:text-[color:var(--fg)]">All products</Link></li>
            <li><Link href="/products?featured=true" className="hover:text-[color:var(--fg)]">Featured</Link></li>
            <li><Link href="/products?category=electronics" className="hover:text-[color:var(--fg)]">Electronics</Link></li>
            <li><Link href="/products?category=fashion" className="hover:text-[color:var(--fg)]">Fashion</Link></li>
          </ul>
        </div>
      </div>
      <div className="border-t border-[color:var(--border)] py-6">
        <div className="max-w-7xl mx-auto px-6 flex flex-col sm:flex-row justify-between gap-2 text-xs text-[color:var(--fg-muted)]">
          <span>© {new Date().getFullYear()} Drikon. All rights reserved.</span>
          <span>Made with care in Dhaka.</span>
        </div>
      </div>
    </footer>
  );
}
