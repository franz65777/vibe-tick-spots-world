import { Skeleton } from '@/components/ui/skeleton';

const BusinessProfileSkeleton = () => {
  return (
    <div className="min-h-screen bg-background pb-24">
      <div className="max-w-screen-sm mx-auto">
        {/* Cover Image Skeleton */}
        <div className="relative mx-4 mt-4 rounded-2xl overflow-hidden h-40">
          <Skeleton className="absolute inset-0" />
          {/* Gradient overlay */}
          <div className="absolute inset-0 bg-gradient-to-t from-background/90 via-background/20 to-transparent" />
          
          {/* Rating badge skeleton */}
          <div className="absolute top-3 right-3">
            <Skeleton className="h-8 w-16 rounded-full" />
          </div>
          
          {/* Title and badge skeleton */}
          <div className="absolute bottom-3 left-3 right-3 flex items-center justify-between">
            <Skeleton className="h-7 w-40" />
            <Skeleton className="h-6 w-20 rounded-full" />
          </div>
        </div>

        {/* Location label skeleton */}
        <div className="px-4 pt-3 flex items-center gap-2">
          <Skeleton className="w-3.5 h-3.5 rounded-full" />
          <Skeleton className="h-3 w-32" />
        </div>

        {/* Tabs skeleton */}
        <div className="pt-4 px-4">
          <div className="flex gap-4 border-b border-border pb-2">
            {[1, 2, 3, 4].map((i) => (
              <Skeleton key={i} className="h-8 w-16 rounded-lg" />
            ))}
          </div>
        </div>

        {/* Content skeleton */}
        <div className="px-4 pt-4">
          <div className="grid grid-cols-2 gap-3">
            {[1, 2, 3, 4].map((i) => (
              <div
                key={i}
                className="aspect-square rounded-xl overflow-hidden"
                style={{ animationDelay: `${i * 50}ms` }}
              >
                <Skeleton className="h-full w-full" />
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default BusinessProfileSkeleton;
