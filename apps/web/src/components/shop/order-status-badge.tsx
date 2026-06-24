import type { OrderStatus } from '@drikon/shared-types';
import { cn } from '@/lib/utils';

const STYLES: Record<OrderStatus, string> = {
  PENDING: 'bg-amber-500/10 text-amber-500 border-amber-500/30',
  PAID: 'bg-sky-500/10 text-sky-500 border-sky-500/30',
  PROCESSING: 'bg-blue-500/10 text-blue-400 border-blue-500/30',
  SHIPPED: 'bg-violet-500/10 text-violet-400 border-violet-500/30',
  DELIVERED: 'bg-emerald-500/10 text-emerald-500 border-emerald-500/30',
  CANCELLED: 'bg-red-500/10 text-red-400 border-red-500/30',
  REFUNDED: 'bg-zinc-500/10 text-zinc-400 border-zinc-500/30',
};

const LABELS: Record<OrderStatus, string> = {
  PENDING: 'Pending',
  PAID: 'Paid',
  PROCESSING: 'Processing',
  SHIPPED: 'Shipped',
  DELIVERED: 'Delivered',
  CANCELLED: 'Cancelled',
  REFUNDED: 'Refunded',
};

export function OrderStatusBadge({ status, className }: { status: OrderStatus; className?: string }) {
  return (
    <span
      className={cn(
        'inline-flex items-center px-2.5 py-1 rounded-full text-[11px] font-semibold border',
        STYLES[status],
        className,
      )}
    >
      {LABELS[status]}
    </span>
  );
}
