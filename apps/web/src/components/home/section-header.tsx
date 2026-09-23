import Link from 'next/link';
import { ArrowRight } from 'lucide-react';

/**
 * Homepage row header: bold title over a full-width rule with the accent
 * underline block, and an optional "view all" link on the right.
 */
export function SectionHeader({
  id,
  title,
  href,
  linkLabel,
}: {
  id?: string;
  title: string;
  href?: string;
  linkLabel?: string;
}) {
  return (
    <div className="flex items-end justify-between gap-4 mb-5">
      <h2 id={id} className="section-title section-rule">
        {title}
      </h2>
      {href && linkLabel && (
        <Link
          href={href}
          className="mb-2.5 inline-flex items-center gap-1 min-h-[45px] text-sm font-bold text-[color:var(--accent)] hover:underline underline-offset-4 shrink-0"
        >
          {linkLabel} <ArrowRight aria-hidden className="w-4 h-4" />
        </Link>
      )}
    </div>
  );
}
