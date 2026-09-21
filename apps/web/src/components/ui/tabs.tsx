'use client';

import * as TabsPrimitive from '@radix-ui/react-tabs';
import { cn } from '@/lib/utils';

/**
 * Tabs — Radix owns roving tabindex (← → between tabs, Tab into the panel) and
 * the tab/tabpanel roles. Styled as the megastore underline tab strip.
 */
export const Tabs = TabsPrimitive.Root;

export function TabsList({ className, ...props }: React.ComponentProps<typeof TabsPrimitive.List>) {
  return (
    <TabsPrimitive.List
      className={cn('flex gap-1 overflow-x-auto scrollbar-none border-b border-[color:var(--border)]', className)}
      {...props}
    />
  );
}

export function TabsTrigger({ className, ...props }: React.ComponentProps<typeof TabsPrimitive.Trigger>) {
  return (
    <TabsPrimitive.Trigger
      className={cn(
        'relative shrink-0 px-4 sm:px-5 py-3.5 text-sm sm:text-[15px] font-bold text-[color:var(--fg-muted)] outline-none transition-colors',
        'hover:text-[color:var(--fg)]',
        'data-[state=active]:text-[color:var(--accent)]',
        'after:absolute after:inset-x-0 after:-bottom-px after:h-[3px] after:rounded-full after:bg-transparent',
        'data-[state=active]:after:bg-[color:var(--accent)]',
        className,
      )}
      {...props}
    />
  );
}

export function TabsContent({ className, ...props }: React.ComponentProps<typeof TabsPrimitive.Content>) {
  return <TabsPrimitive.Content className={cn('pt-6 outline-none', className)} {...props} />;
}
