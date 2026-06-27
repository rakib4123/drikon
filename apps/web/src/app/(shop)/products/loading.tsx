import { ProductCardSkeleton, Skeleton } from '@/components/ui/skeleton';

export default function ProductsLoading() {
  return (
    <div className="max-w-7xl mx-auto px-6 py-14">
      <div className="mb-10 space-y-3">
        <Skeleton className="h-3 w-20" />
        <Skeleton className="h-10 w-64" />
      </div>
      <div className="flex flex-wrap gap-2 mb-10">
        {Array.from({ length: 6 }).map((_, i) => (
          <Skeleton key={i} className="h-9 w-24 rounded-full" />
        ))}
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
        {Array.from({ length: 8 }).map((_, i) => (
          <ProductCardSkeleton key={i} />
        ))}
      </div>
    </div>
  );
}
