'use client';

import * as DialogPrimitive from '@radix-ui/react-dialog';
import { X } from 'lucide-react';
import { cn } from '@/lib/utils';

/**
 * Dialog — the storefront's modal primitive.
 *
 * Radix owns the parts every hand-rolled modal here used to reimplement (and
 * mostly got wrong): the portal, the focus trap, restoring focus to the trigger
 * on close, `aria-modal` wiring, Escape, outside-click, and locking body scroll
 * without the layout shift a bare `overflow: hidden` causes.
 *
 * Animation is CSS keyed off Radix's `data-state`, not Motion. AnimatePresence
 * can't drive an exit animation for content Radix unmounts itself, so the two
 * fight over the same element; `data-state` transitions are what Radix is built
 * for and they respect prefers-reduced-motion via the global rule in globals.css.
 */

export const Dialog = DialogPrimitive.Root;
export const DialogTrigger = DialogPrimitive.Trigger;
export const DialogClose = DialogPrimitive.Close;
export const DialogTitle = DialogPrimitive.Title;
export const DialogDescription = DialogPrimitive.Description;

export function DialogOverlay({ className, ...props }: React.ComponentProps<typeof DialogPrimitive.Overlay>) {
  return (
    <DialogPrimitive.Overlay
      className={cn(
        'fixed inset-0 z-[60] bg-black/50',
        'data-[state=open]:animate-dk-fade-in data-[state=closed]:animate-dk-fade-out',
        className,
      )}
      {...props}
    />
  );
}

interface DialogContentProps extends React.ComponentProps<typeof DialogPrimitive.Content> {
  /** 'center' floats a panel; 'drawer-left' slides a full-height sheet in from the left. */
  variant?: 'center' | 'drawer-left';
  /** Renders the standard close button in the top-right. */
  showClose?: boolean;
  closeLabel?: string;
}

export function DialogContent({
  className,
  children,
  variant = 'center',
  showClose = false,
  closeLabel = 'Close',
  ...props
}: DialogContentProps) {
  return (
    <DialogPrimitive.Portal>
      <DialogOverlay />
      <DialogPrimitive.Content
        className={cn(
          'fixed z-[70] focus:outline-none',
          variant === 'center' && [
            'left-1/2 top-[12vh] w-[calc(100%-2rem)] max-w-xl -translate-x-1/2',
            'rounded-2xl border border-[color:var(--border)] bg-[color:var(--bg)] shadow-2xl overflow-hidden',
            'data-[state=open]:animate-dk-zoom-in data-[state=closed]:animate-dk-zoom-out',
          ],
          variant === 'drawer-left' && [
            'left-0 top-0 bottom-0 w-[84%] max-w-sm',
            'border-r border-[color:var(--border)] bg-[color:var(--bg)] shadow-2xl flex flex-col',
            'data-[state=open]:animate-dk-slide-in-left data-[state=closed]:animate-dk-slide-out-left',
          ],
          className,
        )}
        {...props}
      >
        {children}
        {showClose && (
          <DialogPrimitive.Close
            aria-label={closeLabel}
            className="absolute right-3 top-3 p-1.5 rounded-md text-[color:var(--fg-muted)] hover:bg-[color:var(--bg-soft)] transition-colors"
          >
            <X className="w-4 h-4" />
          </DialogPrimitive.Close>
        )}
      </DialogPrimitive.Content>
    </DialogPrimitive.Portal>
  );
}
