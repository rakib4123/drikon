import { cn } from '@/lib/utils';

/** Shimmering placeholder block. Compose several to mock a layout while loading. */
export function Skeleton({ className }: { className?: string }) {
  return <div className={cn('skeleton', className)} aria-hidden />;
}

/** Ready-made product-card skeleton matching the storefront grid cell. */
export function ProductCardSkeleton() {
  return (
    <div className="rounded-2xl border border-[color:var(--border)] overflow-hidden">
      <Skeleton className="aspect-[4/5] w-full rounded-none" />
      <div className="p-4 space-y-2">
        <Skeleton className="h-3 w-1/3" />
        <Skeleton className="h-4 w-3/4" />
        <Skeleton className="h-5 w-1/2 mt-3" />
      </div>
    </div>
  );
}
