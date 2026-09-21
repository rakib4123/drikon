'use client';

import * as SelectPrimitive from '@radix-ui/react-select';
import { Check, ChevronDown } from 'lucide-react';
import { cn } from '@/lib/utils';

/**
 * Select — a listbox with typeahead, arrow-key navigation and correct
 * option/listbox roles, styled as the `.input` control.
 *
 * Replaces both the native `select.input` (unstylable option list) and the row
 * of sort links the products page used, which announced as plain navigation
 * with no indication of which option was current.
 */

export const Select = SelectPrimitive.Root;
export const SelectValue = SelectPrimitive.Value;
export const SelectGroup = SelectPrimitive.Group;

export function SelectTrigger({ className, children, ...props }: React.ComponentProps<typeof SelectPrimitive.Trigger>) {
  return (
    <SelectPrimitive.Trigger
      className={cn(
        'inline-flex items-center justify-between gap-2 rounded-[10px] px-3.5 py-2.5',
        'border border-[color:var(--border)] bg-[color:var(--bg-soft)] text-[color:var(--fg)]',
        'text-sm transition-colors outline-none cursor-pointer',
        'data-[state=open]:border-[color:var(--accent)]',
        'data-[placeholder]:text-[color:var(--fg-muted)]',
        'disabled:opacity-50 disabled:cursor-not-allowed',
        className,
      )}
      {...props}
    >
      {children}
      <SelectPrimitive.Icon asChild>
        <ChevronDown className="w-3.5 h-3.5 shrink-0 opacity-60 transition-transform duration-200 [[data-state=open]_&]:rotate-180" />
      </SelectPrimitive.Icon>
    </SelectPrimitive.Trigger>
  );
}

export function SelectContent({ className, children, ...props }: React.ComponentProps<typeof SelectPrimitive.Content>) {
  return (
    <SelectPrimitive.Portal>
      <SelectPrimitive.Content
        // `popper` (not the default `item-aligned`) so the list opens below the
        // trigger and flips when it would overflow, instead of overlaying it.
        position="popper"
        sideOffset={6}
        className={cn(
          'z-[70] min-w-[var(--radix-select-trigger-width)] overflow-hidden',
          'rounded-xl border border-[color:var(--border)] bg-[color:var(--bg)] shadow-2xl',
          'data-[state=open]:animate-dk-pop-in data-[state=closed]:animate-dk-pop-out',
          className,
        )}
        {...props}
      >
        <SelectPrimitive.Viewport className="p-1.5 max-h-[min(18rem,var(--radix-select-content-available-height))]">
          {children}
        </SelectPrimitive.Viewport>
      </SelectPrimitive.Content>
    </SelectPrimitive.Portal>
  );
}

export function SelectItem({ className, children, ...props }: React.ComponentProps<typeof SelectPrimitive.Item>) {
  return (
    <SelectPrimitive.Item
      className={cn(
        'relative flex items-center gap-2 rounded-lg py-2 pl-8 pr-3 text-sm outline-none cursor-pointer',
        'text-[color:var(--fg)] select-none',
        'data-[highlighted]:bg-[color:var(--bg-soft)]',
        'data-[state=checked]:font-medium',
        'data-[disabled]:opacity-40 data-[disabled]:cursor-not-allowed',
        className,
      )}
      {...props}
    >
      <span className="absolute left-2.5 inline-flex items-center justify-center">
        <SelectPrimitive.ItemIndicator>
          <Check className="w-3.5 h-3.5 text-[color:var(--accent)]" />
        </SelectPrimitive.ItemIndicator>
      </span>
      <SelectPrimitive.ItemText>{children}</SelectPrimitive.ItemText>
    </SelectPrimitive.Item>
  );
}
