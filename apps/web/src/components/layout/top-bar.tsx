import Link from 'next/link';
import { Facebook, Instagram, Mail, Truck } from 'lucide-react';

export function TopBar({
  supportEmail,
  facebook,
  instagram,
}: {
  supportEmail?: string | null;
  facebook?: string | null;
  instagram?: string | null;
}) {
  return (
    <div className="hidden sm:block border-b border-[color:var(--border)] bg-[color:var(--bg-soft)]/40 text-xs">
      <div className="max-w-7xl mx-auto px-6 h-9 flex items-center justify-between">
        <div className="flex items-center gap-2 text-[color:var(--fg-muted)]">
          <Truck className="w-3.5 h-3.5 text-[color:var(--accent)]" />
          <span>Free shipping over ৳3,000 · Authenticity guaranteed</span>
        </div>

        <div className="flex items-center gap-4 text-[color:var(--fg-muted)]">
          <Link href="/orders" className="hover:text-[color:var(--fg)] transition-colors">Track order</Link>
          {supportEmail && (
            <a href={`mailto:${supportEmail}`} className="hover:text-[color:var(--fg)] transition-colors inline-flex items-center gap-1.5">
              <Mail className="w-3.5 h-3.5" /> {supportEmail}
            </a>
          )}
          {(facebook || instagram) && (
            <span className="flex items-center gap-2 pl-1">
              {facebook && (
                <a href={facebook} target="_blank" rel="noopener noreferrer" aria-label="Facebook" className="hover:text-[color:var(--accent)] transition-colors">
                  <Facebook className="w-3.5 h-3.5" />
                </a>
              )}
              {instagram && (
                <a href={instagram} target="_blank" rel="noopener noreferrer" aria-label="Instagram" className="hover:text-[color:var(--accent)] transition-colors">
                  <Instagram className="w-3.5 h-3.5" />
                </a>
              )}
            </span>
          )}
        </div>
      </div>
    </div>
  );
}
