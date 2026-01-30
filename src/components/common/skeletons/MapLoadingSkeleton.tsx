import { Skeleton } from '@/components/ui/skeleton';

const MapLoadingSkeleton = () => {
  return (
    <div className="absolute inset-0 flex items-center justify-center bg-muted/50 z-[1000]">
      <div className="text-center space-y-3">
        {/* Map tile pattern skeleton */}
        <div className="w-16 h-16 mx-auto relative">
          <Skeleton className="absolute inset-0 rounded-lg" />
          <div className="absolute inset-0 grid grid-cols-2 gap-0.5 p-1">
            <Skeleton className="rounded-sm opacity-60" />
            <Skeleton className="rounded-sm opacity-40" />
            <Skeleton className="rounded-sm opacity-40" />
            <Skeleton className="rounded-sm opacity-60" />
          </div>
        </div>
        <Skeleton className="h-4 w-24 mx-auto" />
      </div>
    </div>
  );
};

export default MapLoadingSkeleton;
