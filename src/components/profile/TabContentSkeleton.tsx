import { Skeleton } from '@/components/ui/skeleton';

const TabContentSkeleton = () => {
  return (
    <div className="px-4 py-4 animate-pulse">
      {/* Filter dropdown skeleton */}
      <Skeleton className="h-6 w-20 mb-4" />
      
      {/* Grid skeleton */}
      <div className="grid grid-cols-2 gap-3">
        {Array.from({ length: 6 }).map((_, i) => (
          <Skeleton key={i} className="aspect-square rounded-xl" />
        ))}
      </div>
    </div>
  );
};

export default TabContentSkeleton;
