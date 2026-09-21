import Link from 'next/link';
import { ChevronRight, Home } from 'lucide-react';

export interface Crumb {
  label: string;
  href?: string;
}

/**
 * Breadcrumb trail. The last crumb is the current page: rendered as text with
 * aria-current, never as a link to itself.
 */
export function Breadcrumbs({ items, homeLabel }: { items: Crumb[]; homeLabel: string }) {
  const all: Crumb[] = [{ label: homeLabel, href: '/' }, ...items];
  return (
    <nav aria-label="Breadcrumb" className="text-[13px] text-[color:var(--fg-muted)]">
      <ol className="flex flex-wrap items-center gap-1.5">
        {all.map((c, i) => {
          const last = i === all.length - 1;
          return (
            <li key={`${c.label}-${i}`} className="inline-flex items-center gap-1.5 min-w-0">
              {i > 0 && <ChevronRight aria-hidden className="w-3.5 h-3.5 shrink-0 opacity-60" />}
              {last || !c.href ? (
                <span aria-current={last ? 'page' : undefined} className={`truncate ${last ? 'text-[color:var(--fg)] font-semibold' : ''}`}>
                  {c.label}
                </span>
              ) : (
                <Link href={c.href} className="inline-flex items-center gap-1 hover:text-[color:var(--accent)] transition-colors">
                  {i === 0 && <Home aria-hidden className="w-3.5 h-3.5" />}
                  {c.label}
                </Link>
              )}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
