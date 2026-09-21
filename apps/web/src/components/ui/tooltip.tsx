'use client';

import { cn } from '@/lib/utils';

/**
 * Tooltip for icon-only controls — CSS only, no JavaScript.
 *
 * This started as Radix Tooltip, which was measurably the wrong trade here: it
 * pulls the floating-ui positioning engine onto every page carrying a product
 * card, costing ~19 kB on /cart, /wishlist and the product page — for a hover
 * label on two buttons that already carry a correct `aria-label`. Radix earns
 * that weight where collision flipping and portalling matter (Select, Popover);
 * a label pinned under a button does not need either.
 *
 * The label is rendered as a real element (not a `::after` on a `content:`
 * string) so it can wrap and be translated, and it is `aria-hidden` because the
 * accessible name already comes from the trigger's own `aria-label` — announcing
 * it twice would be worse than not having it.
 *
 * Placement is deliberately BELOW the trigger: these buttons sit at the top of a
 * product card's `overflow-hidden` image frame, so a tooltip above them would be
 * clipped. Below keeps it inside the frame without any positioning logic.
 *
 * `title` is deliberately not used: it is slow to appear, unstyleable, and never
 * shown on keyboard focus.
 */
export function IconTooltip({
  label,
  children,
  className,
}: {
  label: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <span className={cn('relative inline-grid group/tip', className)}>
      {children}
      <span
        aria-hidden
        className="pointer-events-none absolute top-full left-1/2 z-30 mt-1.5 -translate-x-1/2
                   whitespace-nowrap rounded-lg px-2 py-1 text-[11px] font-medium
                   bg-[color:var(--fg)] text-[color:var(--bg)] shadow-lg
                   opacity-0 scale-95 transition-[opacity,transform] duration-150
                   group-hover/tip:opacity-100 group-hover/tip:scale-100
                   group-focus-within/tip:opacity-100 group-focus-within/tip:scale-100
                   motion-reduce:transition-none"
      >
        {label}
      </span>
    </span>
  );
}
