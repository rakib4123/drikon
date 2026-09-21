'use client';

import * as PopoverPrimitive from '@radix-ui/react-popover';
import { cn } from '@/lib/utils';

/**
 * Popover — a non-modal panel anchored to its trigger.
 *
 * Radix handles collision flipping, outside-click, Escape, and returning focus
 * to the trigger. Unlike Dialog it does not trap focus or lock scroll, which is
 * right for a filter panel the shopper can tab out of.
 */

export const Popover = PopoverPrimitive.Root;
export const PopoverTrigger = PopoverPrimitive.Trigger;
export const PopoverAnchor = PopoverPrimitive.Anchor;
export const PopoverClose = PopoverPrimitive.Close;

export function PopoverContent({
  className,
  align = 'start',
  sideOffset = 8,
  ...props
}: React.ComponentProps<typeof PopoverPrimitive.Content>) {
  return (
    <PopoverPrimitive.Portal>
      <PopoverPrimitive.Content
        align={align}
        sideOffset={sideOffset}
        className={cn(
          'z-[70] w-72 rounded-2xl border border-[color:var(--border)] bg-[color:var(--bg)] p-4 shadow-2xl outline-none',
          'data-[state=open]:animate-dk-pop-in data-[state=closed]:animate-dk-pop-out',
          className,
        )}
        {...props}
      />
    </PopoverPrimitive.Portal>
  );
}
