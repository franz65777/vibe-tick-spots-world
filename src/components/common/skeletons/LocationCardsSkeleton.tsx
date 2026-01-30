import { Skeleton } from '@/components/ui/skeleton';

interface LocationCardsSkeletonProps {
  count?: number;
  layout?: 'grid' | 'horizontal';
}

const LocationCardsSkeleton = ({ count = 6, layout = 'grid' }: LocationCardsSkeletonProps) => {
  if (layout === 'horizontal') {
    return (
      <div className="flex gap-4 overflow-hidden px-4 pb-2">
        {Array.from({ length: count }).map((_, i) => (
          <div
            key={i}
            className="flex-shrink-0 w-64 rounded-xl overflow-hidden"
            style={{ animationDelay: `${i * 50}ms` }}
          >
            {/* Cover image */}
            <Skeleton className="h-40 w-full" />
            
            {/* Content */}
            <div className="p-4 space-y-2">
              <Skeleton className="h-4 w-3/4" />
              <Skeleton className="h-3 w-1/2" />
              <div className="flex items-center justify-between pt-1">
                <Skeleton className="h-3 w-16" />
                <Skeleton className="h-3 w-10" />
              </div>
            </div>
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className="grid grid-cols-2 gap-3 p-4">
      {Array.from({ length: count }).map((_, i) => (
        <div
          key={i}
          className="rounded-xl overflow-hidden"
          style={{ animationDelay: `${i * 50}ms` }}
        >
          {/* Cover image */}
          <Skeleton className="aspect-square w-full" />
          
          {/* Content */}
          <div className="p-3 space-y-2">
            <Skeleton className="h-4 w-3/4" />
            <Skeleton className="h-3 w-1/2" />
            <div className="flex items-center gap-2 pt-1">
              <Skeleton className="h-3 w-12" />
              <Skeleton className="h-3 w-8" />
            </div>
          </div>
        </div>
      ))}
    </div>
  );
};

export default LocationCardsSkeleton;
