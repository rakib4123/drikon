'use client';

import * as CheckboxPrimitive from '@radix-ui/react-checkbox';
import * as SwitchPrimitive from '@radix-ui/react-switch';
import { Check } from 'lucide-react';
import { cn } from '@/lib/utils';

/**
 * Checkbox and Switch.
 *
 * Both render a real focusable control with the right role and checked state,
 * so a screen reader announces them and the space bar toggles them — which a
 * styled `<div>` with an onClick does not.
 */

export function Checkbox({ className, ...props }: React.ComponentProps<typeof CheckboxPrimitive.Root>) {
  return (
    <CheckboxPrimitive.Root
      className={cn(
        'peer h-[18px] w-[18px] shrink-0 rounded-[5px] border transition-colors outline-none',
        'border-[color:var(--fg-muted)]/50 bg-transparent cursor-pointer',
        'data-[state=checked]:bg-[color:var(--accent)] data-[state=checked]:border-[color:var(--accent)]',
        'disabled:opacity-40 disabled:cursor-not-allowed',
        className,
      )}
      {...props}
    >
      <CheckboxPrimitive.Indicator className="flex items-center justify-center text-white">
        <Check className="h-3 w-3 stroke-[3.5]" />
      </CheckboxPrimitive.Indicator>
    </CheckboxPrimitive.Root>
  );
}

export function Switch({ className, ...props }: React.ComponentProps<typeof SwitchPrimitive.Root>) {
  return (
    <SwitchPrimitive.Root
      className={cn(
        'peer inline-flex h-5 w-[34px] shrink-0 items-center rounded-full border-2 border-transparent',
        'transition-colors outline-none cursor-pointer',
        'bg-[color:var(--border)] data-[state=checked]:bg-[color:var(--accent)]',
        'disabled:opacity-40 disabled:cursor-not-allowed',
        className,
      )}
      {...props}
    >
      <SwitchPrimitive.Thumb
        className={cn(
          'pointer-events-none block h-4 w-4 rounded-full bg-white shadow-sm ring-0',
          'transition-transform data-[state=checked]:translate-x-[14px] data-[state=unchecked]:translate-x-0',
        )}
      />
    </SwitchPrimitive.Root>
  );
}
