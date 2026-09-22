import Link from 'next/link';
import { ArrowRight } from 'lucide-react';

/**
 * Full-width call-to-action band between product rows. Copy comes from the
 * admin-editable CTA content.
 */
export function PromoBanner({
  heading,
  body,
  buttonLabel,
  buttonHref,
}: {
  heading: string;
  body: string;
  buttonLabel: string;
  buttonHref: string;
}) {
  return (
    <section className="shell py-8">
      <div className="rounded-[var(--radius-card)] bg-drikon-gradient text-white px-6 py-10 sm:px-10 md:px-14 md:py-12
                      flex flex-col md:flex-row md:items-center gap-6 md:gap-10">
        <div className="flex-1">
          <h2 className="font-display text-2xl md:text-3xl leading-tight max-w-xl">{heading}</h2>
          <p className="mt-2 text-white/75 max-w-xl">{body}</p>
        </div>
        <Link
          href={buttonHref}
          className="self-start md:self-auto inline-flex items-center gap-2 min-h-[45px] rounded-[var(--radius-ctl)] bg-[color:var(--accent-2)] px-6 py-3 font-bold text-[color:var(--accent-fg)]
                     hover:brightness-110 transition-[filter] shrink-0"
        >
          {buttonLabel} <ArrowRight aria-hidden className="w-4 h-4" />
        </Link>
      </div>
    </section>
  );
}
