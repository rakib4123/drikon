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
      <div className="relative overflow-hidden rounded-[var(--radius-card)] bg-drikon-gradient text-white px-6 py-10 sm:px-10 md:px-14 md:py-12
                      flex flex-col md:flex-row md:items-center gap-6 md:gap-10">
        {/* Two soft accent discs for depth — decorative only. */}
        <span aria-hidden className="absolute -right-16 -top-20 w-72 h-72 rounded-full bg-[color:var(--accent)]/35 blur-3xl" />
        <span aria-hidden className="absolute right-40 -bottom-24 w-56 h-56 rounded-full bg-[color:var(--accent-2)]/25 blur-3xl" />

        <div className="relative flex-1">
          <h2 className="text-2xl md:text-3xl font-extrabold leading-tight max-w-xl">{heading}</h2>
          <p className="mt-2 text-white/75 max-w-xl">{body}</p>
        </div>
        <Link
          href={buttonHref}
          className="relative self-start md:self-auto inline-flex items-center gap-2 rounded-[var(--radius-ctl)] bg-[color:var(--accent-2)] px-6 py-3 font-bold text-[color:var(--color-ink)]
                     hover:brightness-110 transition-[filter] shrink-0"
        >
          {buttonLabel} <ArrowRight aria-hidden className="w-4 h-4" />
        </Link>
      </div>
    </section>
  );
}
